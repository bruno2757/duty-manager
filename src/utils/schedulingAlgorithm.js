import { createMeeting, createDuty, createSchedule } from '../data/models';
import {
  generateMeetingDates,
  isSameWeek,
  isPersonAvailable,
  getDaysSinceLastAssignment
} from './dateUtils';

/**
 * Main CSP scheduling algorithm
 * @param {Object} params - Algorithm parameters
 * @returns {Object} - Generated schedule with meetings and conflicts
 */
export function generateSchedule({
  startDate,
  weeks = 4,
  people,
  roles,
  cancelledDates = [],
  existingSchedule = null,
  settings = null,
  omittedDates = [],
  specialMeetings = []
}) {
  const conflicts = [];
  const meetingDates = generateMeetingDates(startDate, weeks, cancelledDates, settings, omittedDates, specialMeetings);

  // Get configured meeting days (default to Thursday/Sunday)
  const midweekDay = settings?.meetingDays?.midweek || 'Thursday';
  const weekendDay = settings?.meetingDays?.weekend || 'Sunday';

  // Create meeting objects
  const meetings = meetingDates.map(({ date, day, type, comment, isSpecial, duties }) =>
    createMeeting({
      date,
      day,
      type: type || 'regular',
      comment: comment || null
    })
  );

  // Merge special meeting duties if they exist
  meetingDates.forEach((meetingDate, index) => {
    if (meetingDate.duties && Object.keys(meetingDate.duties).length > 0) {
      meetings[index].duties = { ...meetingDate.duties };
    }
  });

  // Create copies of people to track assignments during generation
  const peopleState = people.map(p => ({
    ...p,
    lastAssigned: { ...p.lastAssigned },
    assignmentCount: { ...p.assignmentCount }
  }));

  // LOOKBACK PHASE: If extending existing schedule, update state with recent assignments
  if (existingSchedule && existingSchedule.meetings && existingSchedule.meetings.length > 0) {
    const existingMeetings = existingSchedule.meetings;

    // Look back at last 8 meetings (4 weeks) or all if fewer
    const lookbackCount = Math.min(8, existingMeetings.length);
    const lookbackMeetings = existingMeetings.slice(-lookbackCount);

    // Reset assignment counts to only count lookback period
    peopleState.forEach(person => {
      person.assignmentCount = {};
    });

    // Update peopleState with assignments from lookback period
    lookbackMeetings.forEach(meeting => {
      Object.entries(meeting.duties).forEach(([roleId, duty]) => {
        if (duty.personId) {
          const person = peopleState.find(p => p.id === duty.personId);
          if (person) {
            // Update lastAssigned date
            const meetingDate = new Date(meeting.date);
            if (!person.lastAssigned[roleId] || new Date(person.lastAssigned[roleId]) < meetingDate) {
              person.lastAssigned[roleId] = meetingDate;
            }

            // Update assignment count (only for lookback period)
            person.assignmentCount[roleId] = (person.assignmentCount[roleId] || 0) + 1;
          }
        }
      });
    });

    console.log(`Lookback phase: Processed ${lookbackCount} meetings from existing schedule`);
  }

  // Track assignments for this schedule generation
  const scheduleAssignments = {}; // meetingId -> { roleId -> personId }

  // Track grouped role preferences for Thu->Sun continuity
  const groupedRolePreferences = {}; // meetingId -> { personId, roleIds[] }

  // Process each meeting
  for (let i = 0; i < meetings.length; i++) {
    const meeting = meetings[i];
    scheduleAssignments[meeting.id] = {};

    // Sort roles by constraint level (most constrained first)
    const sortedRoles = [...roles].sort((a, b) => {
      // Roles with fewer people are more constrained
      return a.peopleIds.length - b.peopleIds.length;
    });

    // Assign each role for this meeting
    for (const role of sortedRoles) {
      const assignment = assignRoleToMeeting({
        meeting,
        role,
        peopleState,
        scheduleAssignments,
        meetings,
        meetingIndex: i,
        groupedRolePreferences,
        conflicts
      });

      if (assignment) {
        meeting.duties[role.id] = assignment;
        scheduleAssignments[meeting.id][role.id] = assignment.personId;

        // Update person state if assigned
        if (assignment.personId) {
          const person = peopleState.find(p => p.id === assignment.personId);
          if (person) {
            person.lastAssigned[role.id] = meeting.date;
            person.assignmentCount[role.id] = (person.assignmentCount[role.id] || 0) + 1;
          }
        }

        // Store preference for grouped roles on midweek day (for grouping with weekend day)
        if (role.allowGrouping && meeting.day === midweekDay && assignment.personId) {
          if (!groupedRolePreferences[meeting.id]) {
            groupedRolePreferences[meeting.id] = {};
          }
          groupedRolePreferences[meeting.id][role.id] = assignment.personId;
        }
      }
    }
  }

  // Create schedule object
  const schedule = createSchedule({
    startDate: meetings[0]?.date || startDate,
    endDate: meetings[meetings.length - 1]?.date || startDate,
    meetings
  });

  schedule.conflicts = conflicts;
  schedule.cancelledDates = cancelledDates;

  return schedule;
}

/**
 * Assign a role to a specific meeting
 */
function assignRoleToMeeting({
  meeting,
  role,
  peopleState,
  scheduleAssignments,
  meetings,
  meetingIndex,
  groupedRolePreferences,
  conflicts
}) {
  // Get eligible people for this role
  const eligiblePeople = peopleState.filter(person =>
    role.peopleIds.includes(person.id)
  );

  if (eligiblePeople.length === 0) {
    conflicts.push({
      type: 'unfilled',
      meetingId: meeting.id,
      roleId: role.id,
      message: `No people qualified for role ${role.name}`,
      details: {}
    });
    return createDuty({ personId: null, hasConflict: true });
  }

  // Score each eligible person
  const scoredPeople = eligiblePeople.map(person => ({
    person,
    score: scorePerson({
      person,
      role,
      meeting,
      meetingIndex,
      meetings,
      scheduleAssignments,
      groupedRolePreferences,
      peopleState
    })
  }));

  // Filter out people who violate hard constraints
  const validPeople = scoredPeople.filter(({ person, score }) => {
    // Hard constraint: Person must be available
    if (!isPersonAvailable(person, meeting.date)) {
      return false;
    }

    // Hard constraint: Person not already assigned to another role in this meeting
    const alreadyAssigned = Object.values(scheduleAssignments[meeting.id] || {})
      .includes(person.id);
    if (alreadyAssigned) {
      return false;
    }

    return true;
  });

  if (validPeople.length === 0) {
    // No valid person found - try to report why
    const unavailable = eligiblePeople.filter(p => !isPersonAvailable(p, meeting.date));
    const doubleBooked = eligiblePeople.filter(p =>
      Object.values(scheduleAssignments[meeting.id] || {}).includes(p.id)
    );

    conflicts.push({
      type: 'unfilled',
      meetingId: meeting.id,
      roleId: role.id,
      message: `No valid person for ${role.name} on ${meeting.date.toDateString()}`,
      details: {
        unavailable: unavailable.length,
        doubleBooked: doubleBooked.length,
        total: eligiblePeople.length
      }
    });

    return createDuty({ personId: null, hasConflict: true });
  }

  // Sort by score (highest first) and assign the best person
  validPeople.sort((a, b) => b.score - a.score);

  // Add randomization for people with similar scores to ensure fair distribution
  // Group people by score buckets to add variety
  const topScore = validPeople[0].score;
  const similarScorePeople = validPeople.filter(p => Math.abs(p.score - topScore) < 5);

  // Randomly select from top scorers to add variety
  const selectedIndex = Math.floor(Math.random() * similarScorePeople.length);
  const bestPerson = similarScorePeople[selectedIndex].person;

  return createDuty({
    personId: bestPerson.id,
    manuallyAssigned: false,
    hasConflict: false
  });
}

/**
 * Score a person for assignment to a role in a meeting
 * Higher score = better candidate
 */
function scorePerson({
  person,
  role,
  meeting,
  meetingIndex,
  meetings,
  scheduleAssignments,
  groupedRolePreferences,
  peopleState
}) {
  let score = 100;

  // Factor 1: Role grouping preference (HIGHEST PRIORITY for grouped roles on weekend day)
  if (role.allowGrouping && meetingIndex > 0) {
    const previousMeeting = meetings[meetingIndex - 1];

    if (previousMeeting && isSameWeek(previousMeeting.date, meeting.date)) {
      // Previous meeting is in the same week - apply grouping preference
      const previousPersonForThisRole = groupedRolePreferences[previousMeeting.id]?.[role.id];
      if (previousPersonForThisRole === person.id) {
        score += 1000; // MASSIVE bonus for continuity within same week
      }
    }
  }

  // Factor 1b: For grouped roles on midweek day, strongly penalize back-to-back weeks
  // This prevents same person getting assigned to consecutive Thursdays (creating 4-in-a-row pattern)
  if (role.allowGrouping && meetingIndex >= 2) {
    // Look back 2 meetings to find the previous midweek meeting (from previous week)
    const twoMeetingsAgo = meetings[meetingIndex - 2];

    if (twoMeetingsAgo && !isSameWeek(twoMeetingsAgo.date, meeting.date)) {
      // This is a different week - check if same person was assigned
      const previousWeekPersonForThisRole = groupedRolePreferences[twoMeetingsAgo.id]?.[role.id];
      if (previousWeekPersonForThisRole === person.id) {
        score -= 500; // STRONG penalty for consecutive weeks (prevents 4-in-a-row)
      }
    }
  }

  // Factor 2: Assignment count for this specific role (fewer = better)
  const assignmentCount = person.assignmentCount[role.id] || 0;
  const avgAssignments = calculateAverageAssignments(role, peopleState);
  const countDiff = assignmentCount - avgAssignments;

  // Penalty for people with more assignments than average for this role
  score -= countDiff * 30; // Reduced from 50 to allow more flexibility

  // Factor 3: Overall workload balance across ALL roles (HIGHEST PRIORITY for fairness)
  const totalAssignments = Object.values(person.assignmentCount).reduce((sum, count) => sum + count, 0);
  const avgTotalAssignments = calculateAverageTotalAssignments(peopleState);
  const totalDiff = totalAssignments - avgTotalAssignments;
  score -= totalDiff * 60; // Increased from 20 to 60 - prioritize total workload balance

  // Factor 3b: Role diversity bonus for multi-role people (CRITICAL FIX)
  // Person's qualified roles are in person.roles array
  const personQualifiedRoles = person.roles || [];
  const numQualifiedRoles = personQualifiedRoles.length;

  if (numQualifiedRoles >= 2 && totalAssignments >= 2) {
    // Multi-role person with some assignments
    const expectedPerRole = totalAssignments / numQualifiedRoles;
    const thisRoleAssignments = person.assignmentCount[role.id] || 0;
    const roleDeficit = expectedPerRole - thisRoleAssignments;

    // STRONG bonus for underused roles (scales with deficit)
    if (roleDeficit > 0) {
      score += roleDeficit * 100; // Massive bonus - up to 300+ for completely unused roles
    }

    // Extra strong bonus if person has NEVER been assigned to this role
    if (thisRoleAssignments === 0 && totalAssignments > 3) {
      score += 200; // Person with 10+ total assignments but 0 in this role gets huge boost
    }
  } else if (assignmentCount === 0 && totalAssignments === 0) {
    // First assignment ever
    score += 30;
  }

  // Factor 4: Days since last assignment (more days = better)
  const daysSince = getDaysSinceLastAssignment(person, role.id, meeting.date);
  if (daysSince !== Infinity) {
    // Deduct points for recent assignments
    const recencyPenalty = Math.max(0, 20 - (daysSince / 7) * 3);
    score -= recencyPenalty;
  } else {
    // Never assigned = big bonus
    score += 30;
  }

  return score;
}

/**
 * Calculate average assignments for a role
 */
function calculateAverageAssignments(role, peopleState) {
  const eligiblePeople = peopleState.filter(p => role.peopleIds.includes(p.id));
  if (eligiblePeople.length === 0) return 0;

  const totalAssignments = eligiblePeople.reduce((sum, person) => {
    return sum + (person.assignmentCount[role.id] || 0);
  }, 0);

  return totalAssignments / eligiblePeople.length;
}

/**
 * Calculate average total assignments across all people
 */
function calculateAverageTotalAssignments(peopleState) {
  if (peopleState.length === 0) return 0;

  const totalAssignments = peopleState.reduce((sum, person) => {
    const personTotal = Object.values(person.assignmentCount).reduce((s, c) => s + c, 0);
    return sum + personTotal;
  }, 0);

  return totalAssignments / peopleState.length;
}
