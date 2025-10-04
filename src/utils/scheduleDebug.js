/**
 * Debug utilities for analyzing schedule generation
 */

/**
 * Analyze a generated schedule to find people who were never assigned
 */
export function findUnassignedPeople(schedule, people, roles) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    return [];
  }

  // Track which people were assigned
  const assignedPeopleIds = new Set();

  schedule.meetings.forEach(meeting => {
    Object.values(meeting.duties).forEach(duty => {
      if (duty.personId) {
        assignedPeopleIds.add(duty.personId);
      }
    });
  });

  // Find people who were never assigned
  const unassigned = people.filter(person => !assignedPeopleIds.has(person.id));

  // Add details about which roles they could do
  return unassigned.map(person => {
    const qualifiedRoles = roles
      .filter(role => role.peopleIds.includes(person.id))
      .map(role => role.name);

    return {
      name: person.name,
      id: person.id,
      qualifiedRoles,
      roleCount: qualifiedRoles.length
    };
  });
}

/**
 * Get assignment statistics for all people
 */
export function getAssignmentStats(schedule, people) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    return [];
  }

  const stats = people.map(person => ({
    name: person.name,
    id: person.id,
    totalAssignments: 0,
    byRole: {}
  }));

  schedule.meetings.forEach(meeting => {
    Object.entries(meeting.duties).forEach(([roleId, duty]) => {
      if (duty.personId) {
        const personStat = stats.find(s => s.id === duty.personId);
        if (personStat) {
          personStat.totalAssignments++;
          personStat.byRole[roleId] = (personStat.byRole[roleId] || 0) + 1;
        }
      }
    });
  });

  return stats.sort((a, b) => a.totalAssignments - b.totalAssignments);
}

/**
 * Verify all people in a role are being considered
 */
export function verifyRolePeopleIds(role, people) {
  const issues = [];

  role.peopleIds.forEach(personId => {
    const person = people.find(p => p.id === personId);
    if (!person) {
      issues.push(`Role "${role.name}" references non-existent person ID: ${personId}`);
    } else if (!person.roles.includes(role.id)) {
      issues.push(`Person "${person.name}" in role "${role.name}" peopleIds but role not in person.roles`);
    }
  });

  return issues;
}

/**
 * Check role grouping effectiveness
 */
export function analyzeRoleGrouping(schedule, roles) {
  if (!schedule || !schedule.meetings) return null;

  const groupedRoles = roles.filter(r => r.allowGrouping);
  if (groupedRoles.length === 0) return null;

  let totalWeeks = 0;
  let successfulGroupings = 0;
  let failedGroupings = 0;

  // Find Thu-Sun pairs
  for (let i = 0; i < schedule.meetings.length - 1; i++) {
    const thursdayMeeting = schedule.meetings[i];
    const sundayMeeting = schedule.meetings[i + 1];

    if (thursdayMeeting.day === 'Thursday' && sundayMeeting.day === 'Sunday') {
      totalWeeks++;

      // Check if same person assigned to EACH grouped role across Thu->Sun
      // Each role should have continuity independently
      let allRolesMatched = true;
      groupedRoles.forEach(role => {
        const thuPerson = thursdayMeeting.duties[role.id]?.personId;
        const sunPerson = sundayMeeting.duties[role.id]?.personId;

        // For this role, the person should be the same on Thu and Sun
        if (thuPerson !== sunPerson) {
          allRolesMatched = false;
        }
      });

      if (allRolesMatched) {
        successfulGroupings++;
      } else {
        failedGroupings++;
      }
    }
  }

  const successRate = totalWeeks > 0 ? (successfulGroupings / totalWeeks * 100).toFixed(1) : 0;

  return {
    totalWeeks,
    successfulGroupings,
    failedGroupings,
    successRate: parseFloat(successRate),
    groupedRoles: groupedRoles.map(r => r.name)
  };
}

/**
 * Log detailed debug info about scheduling
 */
export function logScheduleDebugInfo(schedule, people, roles) {
  console.group('Schedule Debug Info');

  console.log(`Total meetings: ${schedule?.meetings?.length || 0}`);
  console.log(`Total people: ${people.length}`);
  console.log(`Total roles: ${roles.length}`);

  // Check for data integrity issues
  roles.forEach(role => {
    const issues = verifyRolePeopleIds(role, people);
    if (issues.length > 0) {
      console.error(`Issues in role "${role.name}":`, issues);
    }
  });

  // Find unassigned people
  const unassigned = findUnassignedPeople(schedule, people, roles);
  if (unassigned.length > 0) {
    console.warn(`${unassigned.length} people never assigned:`, unassigned);
  } else {
    console.log('✓ All people were assigned at least once');
  }

  // Show assignment distribution
  const stats = getAssignmentStats(schedule, people);
  console.log('Assignment distribution (bottom 10):', stats.slice(0, 10));
  console.log('Assignment distribution (top 10):', stats.slice(-10));

  // Analyze role grouping
  const groupingAnalysis = analyzeRoleGrouping(schedule, roles);
  if (groupingAnalysis) {
    console.log('\nRole Grouping Analysis:');
    console.log(`  Roles: ${groupingAnalysis.groupedRoles.join(', ')}`);
    console.log(`  Total Thu-Sun weeks: ${groupingAnalysis.totalWeeks}`);
    console.log(`  Successful groupings: ${groupingAnalysis.successfulGroupings}`);
    console.log(`  Failed groupings: ${groupingAnalysis.failedGroupings}`);
    console.log(`  Success rate: ${groupingAnalysis.successRate}%`);

    if (groupingAnalysis.successRate < 90) {
      console.warn('⚠️ Grouping success rate is below 90%');
    } else {
      console.log('✓ Grouping working well (>90% success)');
    }
  }

  console.groupEnd();
}
