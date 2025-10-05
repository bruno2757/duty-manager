import { v4 as uuidv4 } from 'uuid';

/**
 * Create a new Person object
 */
export function createPerson({ name, roles = [] }) {
  return {
    id: uuidv4(),
    name,
    roles, // Array of role IDs they can perform
    availability: [], // Array of unavailability periods
    lastAssigned: {}, // { roleId: Date }
    assignmentCount: {} // { roleId: number }
  };
}

/**
 * Create a new Role object
 */
export function createRole({ name, allowGrouping = false, peopleIds = [] }) {
  return {
    id: uuidv4(),
    name,
    allowGrouping, // For Zoom Host and Sound roles
    groupingWindow: 'weekly', // Group Thu→Sun same week only
    peopleIds // Array of person IDs qualified for this role
  };
}

/**
 * Create a new Meeting object
 */
export function createMeeting({ date, day, type = 'regular', comment = null }) {
  return {
    id: uuidv4(),
    date: new Date(date),
    day, // Day name (e.g., 'Thursday', 'Sunday', etc.)
    type, // 'regular' | 'special' | 'omitted'
    comment, // For special meetings
    duties: {} // { roleId: { personId, manuallyAssigned, hasConflict, needsReview } }
  };
}

/**
 * Create a new Schedule object
 */
export function createSchedule({ startDate, endDate, meetings = [] }) {
  return {
    id: uuidv4(),
    generatedDate: new Date(),
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    meetings,
    cancelledDates: [], // Array of Date objects
    conflicts: [], // Array of conflict warnings
    statistics: {}
  };
}

/**
 * Create an availability block for a person
 */
export function createAvailability({ startDate, endDate, reason = '' }) {
  return {
    startDate: new Date(startDate),
    endDate: new Date(endDate),
    reason
  };
}

/**
 * Create a duty assignment
 */
export function createDuty({ personId = null, manuallyAssigned = false, hasConflict = false, needsReview = false }) {
  return {
    personId,
    manuallyAssigned,
    hasConflict,
    needsReview
  };
}

/**
 * Create settings object
 */
export function createSettings() {
  return {
    meetingDays: {
      midweek: 'Thursday',
      weekend: 'Sunday',
      locked: false
    },
    roleOrder: [] // Array of role IDs in display order
  };
}

/**
 * Create an omitted date entry
 */
export function createOmittedDate({ date, reason = '' }) {
  return {
    id: uuidv4(),
    date: new Date(date),
    reason
  };
}

/**
 * Create a special meeting entry
 */
export function createSpecialMeeting({ date, comment }) {
  return {
    id: uuidv4(),
    date: new Date(date),
    comment,
    duties: {}
  };
}
