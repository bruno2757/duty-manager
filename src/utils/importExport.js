import Papa from 'papaparse';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { v4 as uuidv4 } from 'uuid';

/**
 * Parse date string supporting both UK (DD/MM/YYYY) and ISO (YYYY-MM-DD) formats
 */
function parseDate(dateString) {
  if (!dateString) return new Date(NaN);

  // Try UK format first: DD/MM/YYYY or DD-MM-YYYY
  const ukMatch = dateString.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ukMatch) {
    const [, day, month, year] = ukMatch;
    // JavaScript Date months are 0-indexed
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Try ISO format: YYYY-MM-DD
  const isoMatch = dateString.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (isoMatch) {
    return new Date(dateString);
  }

  // Fallback to native Date parsing
  return new Date(dateString);
}

/**
 * Import roles from CSV
 * Format: Name, Roles (comma-separated)
 */
export function importRolesFromCSV(file, people, roles, setPeople, setRoles) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const updates = {
            updated: 0,
            peopleCreated: 0,
            rolesCreated: 0,
            errors: []
          };

          // Create role name lookup (case-insensitive)
          const roleLookup = new Map();
          roles.forEach(role => {
            roleLookup.set(role.name.toLowerCase().trim(), role);
          });

          // Process each row
          results.data.forEach((row) => {
            const personName = row.Name?.trim();
            const rolesString = row.Roles?.trim();

            if (!personName || !rolesString) return;

            // Find or create person
            let person = people.find(p =>
              p.name.toLowerCase() === personName.toLowerCase()
            );

            if (!person) {
              // Create new person
              person = {
                id: uuidv4(),
                name: personName,
                roles: [],
                availability: [],
                lastAssigned: {},
                assignmentCount: {}
              };
              people.push(person);
              updates.peopleCreated++;
            }

            // Parse roles
            const roleNames = rolesString.split(',').map(r => r.trim());
            let personUpdated = false;

            roleNames.forEach(roleName => {
              let role = roleLookup.get(roleName.toLowerCase());

              if (!role) {
                // Create new role
                role = {
                  id: uuidv4(),
                  name: roleName,
                  allowGrouping: false,
                  groupingWindow: 'weekly',
                  peopleIds: []
                };
                roles.push(role);
                roleLookup.set(roleName.toLowerCase(), role);
                updates.rolesCreated++;
              }

              // Add role to person if not already present
              if (!person.roles.includes(role.id)) {
                person.roles.push(role.id);
                person.assignmentCount[role.id] = 0;
                personUpdated = true;
              }

              // Add person to role if not already there
              if (!role.peopleIds.includes(person.id)) {
                role.peopleIds.push(person.id);
              }
            });

            if (personUpdated) {
              updates.updated++;
            }
          });

          // Update state
          setPeople([...people]);
          setRoles([...roles]);

          resolve(updates);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Clean up duplicate availability blocks
 * Removes identical blocks (same startDate, endDate, reason) from all people
 */
export function cleanupDuplicateAvailability(people) {
  let totalRemoved = 0;

  people.forEach(person => {
    if (!person.availability || person.availability.length === 0) return;

    const uniqueBlocks = [];
    const seen = new Set();

    person.availability.forEach(block => {
      // Handle both Date objects and ISO strings
      const startTime = block.startDate instanceof Date
        ? block.startDate.getTime()
        : new Date(block.startDate).getTime();
      const endTime = block.endDate instanceof Date
        ? block.endDate.getTime()
        : new Date(block.endDate).getTime();

      // Create unique key from block properties
      const key = `${startTime}_${endTime}_${block.reason}`;

      if (!seen.has(key)) {
        seen.add(key);
        uniqueBlocks.push(block);
      } else {
        totalRemoved++;
      }
    });

    person.availability = uniqueBlocks;
  });

  return {
    removed: totalRemoved,
    message: `Removed ${totalRemoved} duplicate availability blocks`
  };
}

/**
 * Import availability from CSV
 * Format: Name, Start Date, End Date, Reason
 */
export function importAvailabilityFromCSV(file, people, setPeople) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        try {
          const updates = {
            blocksAdded: 0,
            peopleUpdated: 0,
            errors: [],
            unmatchedPeople: []
          };

          const updatedPeople = new Set();

          results.data.forEach((row) => {
            const personName = row.Name?.trim();
            const startDate = row['Start Date']?.trim();
            const endDate = row['End Date']?.trim();
            const reason = row.Reason?.trim() || '';

            if (!personName || !startDate || !endDate) return;

            // Find person (case-insensitive)
            const person = people.find(p =>
              p.name.toLowerCase() === personName.toLowerCase()
            );

            if (!person) {
              if (!updates.unmatchedPeople.includes(personName)) {
                updates.unmatchedPeople.push(personName);
              }
              return;
            }

            // Parse dates - support both UK (DD/MM/YYYY) and ISO (YYYY-MM-DD) formats
            const start = parseDate(startDate);
            const end = parseDate(endDate);

            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
              updates.errors.push(`Invalid date for ${personName}: ${startDate} to ${endDate}`);
              return;
            }

            // Add availability block (check for duplicates first)
            if (!person.availability) {
              person.availability = [];
            }

            // Check if identical block already exists
            const isDuplicate = person.availability.some(existing => {
              // Handle both Date objects and ISO strings
              const existingStart = existing.startDate instanceof Date
                ? existing.startDate.getTime()
                : new Date(existing.startDate).getTime();
              const existingEnd = existing.endDate instanceof Date
                ? existing.endDate.getTime()
                : new Date(existing.endDate).getTime();

              return existingStart === start.getTime() &&
                existingEnd === end.getTime() &&
                existing.reason === reason;
            });

            if (!isDuplicate) {
              person.availability.push({
                startDate: start,
                endDate: end,
                reason
              });
              updates.blocksAdded++;
              updatedPeople.add(person.id);
            }
          });

          updates.peopleUpdated = updatedPeople.size;

          // Update state
          setPeople([...people]);

          resolve(updates);
        } catch (error) {
          reject(error);
        }
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}

/**
 * Format date as UK format (DD/MM/YYYY)
 */
function formatDateUK(date) {
  const d = date instanceof Date ? date : new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Export schedule to CSV
 */
export function exportScheduleToCSV(schedule, roles, people) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    throw new Error('No schedule to export');
  }

  // Create headers dynamically from roles
  const headers = ['Meeting No.', 'Date', 'Day', 'Comment', ...roles.map(r => r.name)];

  // Create rows
  const rows = schedule.meetings.map((meeting, index) => {
    const row = {
      'Meeting No.': index + 1,
      'Date': formatDateUK(meeting.date),
      'Day': meeting.day,
      'Comment': meeting.type === 'special' && meeting.comment ? meeting.comment : ''
    };

    // Add person name for each role
    roles.forEach(role => {
      const duty = meeting.duties[role.id];
      const personId = duty?.personId;
      const person = personId ? people.find(p => p.id === personId) : null;
      row[role.name] = person ? person.name : '';
    });

    return row;
  });

  // Convert to CSV
  const csv = Papa.unparse({
    fields: headers,
    data: rows
  });

  // Download
  const startDate = new Date(schedule.startDate).toISOString().split('T')[0];
  const endDate = new Date(schedule.endDate).toISOString().split('T')[0];
  const filename = `schedule_${startDate}_to_${endDate}.csv`;

  downloadFile(csv, filename, 'text/csv');
}

/**
 * Export schedule to PDF
 */
export function exportScheduleToPDF(schedule, roles, people) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    throw new Error('No schedule to export');
  }

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const startDate = formatDateUK(schedule.startDate);
  const endDate = formatDateUK(schedule.endDate);

  // Title
  doc.setFontSize(16);
  doc.text(`Duty Schedule ${startDate} to ${endDate}`, 14, 15);

  // Prepare table data
  const headers = [['Meeting\nNo.', 'Date', 'Day', 'Comment', ...roles.map(r => r.name)]];

  const rows = schedule.meetings.map((meeting, index) => {
    const row = [
      index + 1,
      formatDateUK(meeting.date),
      meeting.day.substring(0, 3), // Abbreviate day name (Thu, Sun, Tue, etc.)
      meeting.type === 'special' && meeting.comment ? meeting.comment : ''
    ];

    // Add person name for each role
    roles.forEach(role => {
      const duty = meeting.duties[role.id];
      const personId = duty?.personId;
      const person = personId ? people.find(p => p.id === personId) : null;
      row.push(person ? person.name : '-');
    });

    return row;
  });

  // Add table
  doc.autoTable({
    head: headers,
    body: rows,
    startY: 25,
    styles: {
      fontSize: 8,
      cellPadding: 2
    },
    headStyles: {
      fillColor: [66, 139, 202],
      fontStyle: 'bold'
    },
    columnStyles: {
      0: { cellWidth: 12 }, // Meeting No.
      1: { cellWidth: 20 }, // Date
      2: { cellWidth: 12 }, // Day
      3: { cellWidth: 30 }  // Comment
    },
    margin: { top: 25 }
  });

  // Footer with statistics
  const finalY = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Total meetings: ${schedule.meetings.length}`, 14, finalY);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, 14, finalY + 6);

  if (schedule.conflicts && schedule.conflicts.length > 0) {
    doc.setTextColor(255, 0, 0);
    doc.text(`Conflicts: ${schedule.conflicts.length}`, 14, finalY + 12);
  }

  // Download
  const startDateStr = new Date(schedule.startDate).toISOString().split('T')[0];
  const endDateStr = new Date(schedule.endDate).toISOString().split('T')[0];
  const filename = `schedule_${startDateStr}_to_${endDateStr}.pdf`;

  doc.save(filename);
}

/**
 * Helper to download a file
 */
function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
