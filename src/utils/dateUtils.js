/**
 * Generate meeting dates with configurable days
 * @param {Date} startDate - Starting date
 * @param {number} weeks - Number of weeks to generate (default 4)
 * @param {Date[]} cancelledDates - Dates to skip (deprecated, use omittedDates)
 * @param {Object} settings - Settings object with meetingDays configuration
 * @param {Array} omittedDates - Array of omitted date objects
 * @param {Array} specialMeetings - Array of special meeting objects
 * @returns {Array<{date: Date, day: string, type: string, comment: string|null, isSpecial: boolean}>}
 */
export function generateMeetingDates(startDate, weeks = 4, cancelledDates = [], settings = null, omittedDates = [], specialMeetings = []) {
  const meetings = [];
  const start = new Date(startDate);

  // Default to Thursday/Sunday if no settings
  const midweekDay = settings?.meetingDays?.midweek || 'Thursday';
  const weekendDay = settings?.meetingDays?.weekend || 'Sunday';

  // Get numeric day of week for configured days
  const dayMap = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  };

  const midweekDayNum = dayMap[midweekDay];
  const weekendDayNum = dayMap[weekendDay];

  // Normalize omitted dates for comparison
  const omittedSet = new Set();
  omittedDates.forEach(od => {
    const date = new Date(od.date);
    date.setHours(0, 0, 0, 0);
    omittedSet.add(date.getTime());
  });

  // Create map of special meetings by date
  const specialMeetingsMap = new Map();
  specialMeetings.forEach(sm => {
    const date = new Date(sm.date);
    date.setHours(0, 0, 0, 0);
    specialMeetingsMap.set(date.getTime(), sm);
  });

  // Also normalize cancelled dates (for backward compatibility)
  const cancelledSet = new Set(
    cancelledDates.map(d => {
      const date = new Date(d);
      date.setHours(0, 0, 0, 0);
      return date.getTime();
    })
  );

  // Find the first midweek day on or after start date
  let currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate.getDay() !== midweekDayNum) {
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const endDate = new Date(currentDate);
  endDate.setDate(endDate.getDate() + (weeks * 7));

  while (currentDate < endDate) {
    const dayOfWeek = currentDate.getDay();

    // Only include configured meeting days for regular meetings
    if (dayOfWeek === midweekDayNum || dayOfWeek === weekendDayNum) {
      const dateTime = new Date(currentDate).getTime();

      // Skip if in cancelled dates or omitted dates
      if (!cancelledSet.has(dateTime) && !omittedSet.has(dateTime)) {
        const specialMeeting = specialMeetingsMap.get(dateTime);

        if (specialMeeting) {
          // Include special meeting on regular meeting day
          meetings.push({
            date: new Date(currentDate),
            day: dayOfWeek === midweekDayNum ? midweekDay : weekendDay,
            type: 'special',
            comment: specialMeeting.comment,
            isSpecial: true,
            specialMeetingId: specialMeeting.id,
            duties: specialMeeting.duties || {}
          });
          // Remove from map so we don't add it again later
          specialMeetingsMap.delete(dateTime);
        } else {
          // Regular meeting
          meetings.push({
            date: new Date(currentDate),
            day: dayOfWeek === midweekDayNum ? midweekDay : weekendDay,
            type: 'regular',
            comment: null,
            isSpecial: false
          });
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Add special meetings that are NOT on regular meeting days (e.g., Tuesday for Memorial)
  // These are the remaining special meetings that weren't already added above
  specialMeetingsMap.forEach((sm, dateTime) => {
    const smDate = new Date(dateTime);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[smDate.getDay()];

    // Only add if within the date range
    if (smDate >= start && smDate < endDate) {
      meetings.push({
        date: new Date(smDate),
        day: dayName,
        type: 'special',
        comment: sm.comment,
        isSpecial: true,
        specialMeetingId: sm.id,
        duties: sm.duties || {}
      });
    }
  });

  // Sort all meetings by date
  meetings.sort((a, b) => a.date - b.date);

  return meetings;
}

/**
 * Check if two dates are in the same week (for role grouping)
 * Thursday and the following Sunday are considered the same week
 * @param {Date} date1 - First date (should be Thursday)
 * @param {Date} date2 - Second date (should be Sunday)
 * @returns {boolean}
 */
export function isSameWeek(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  // Ensure date1 is before date2
  if (d1 >= d2) return false;

  const daysDiff = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

  // Thursday to Sunday is 3 days
  // If both are in same week, Sunday should be 3 days after Thursday
  return daysDiff === 3 && d1.getDay() === 4 && d2.getDay() === 0;
}

/**
 * Check if a person is available on a specific date
 * @param {Object} person - Person object with availability array
 * @param {Date} date - Date to check
 * @returns {boolean}
 */
export function isPersonAvailable(person, date) {
  // Normalize check date to midnight for date-only comparison
  const checkDate = new Date(date);
  checkDate.setHours(0, 0, 0, 0);

  if (!person.availability || person.availability.length === 0) {
    return true; // No restrictions = available
  }

  // Check if date falls within any unavailability period (INCLUSIVE of both start and end dates)
  for (const block of person.availability) {
    const startDate = new Date(block.startDate);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(block.endDate);
    endDate.setHours(0, 0, 0, 0);

    if (checkDate >= startDate && checkDate <= endDate) {
      return false; // Date is in unavailable period
    }
  }

  return true;
}

/**
 * Get the number of days since a person was last assigned to a role
 * @param {Object} person - Person object
 * @param {string} roleId - Role ID
 * @param {Date} currentDate - Current meeting date
 * @returns {number} - Days since last assignment, or Infinity if never assigned
 */
export function getDaysSinceLastAssignment(person, roleId, currentDate) {
  if (!person.lastAssigned || !person.lastAssigned[roleId]) {
    return Infinity; // Never assigned
  }

  const lastDate = new Date(person.lastAssigned[roleId]);
  const current = new Date(currentDate);
  const daysDiff = Math.floor((current - lastDate) / (1000 * 60 * 60 * 24));

  return daysDiff;
}

/**
 * Format date for display in UK format (DD/MM/YYYY)
 * @param {Date} date
 * @returns {string}
 */
export function formatDate(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

/**
 * Get date range string
 * @param {Date} startDate
 * @param {Date} endDate
 * @returns {string}
 */
export function getDateRangeString(startDate, endDate) {
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
}
