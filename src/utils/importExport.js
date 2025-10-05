import Papa from 'papaparse';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
export function exportScheduleToCSV(schedule, roles, people, roleOrder = []) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    throw new Error('No schedule to export');
  }

  // Get ordered roles (use roleOrder if provided)
  const orderedRoles = roleOrder && roleOrder.length > 0
    ? roleOrder
        .map(roleId => roles.find(r => r.id === roleId))
        .filter(Boolean)
    : roles;

  // Create headers dynamically from ordered roles
  const headers = ['Meeting No.', 'Date', 'Day', 'Comment', ...orderedRoles.map(r => r.name)];

  // Create rows
  const rows = schedule.meetings.map((meeting, index) => {
    const row = {
      'Meeting No.': index + 1,
      'Date': formatDateUK(meeting.date),
      'Day': meeting.day,
      'Comment': ''
    };

    // Handle different meeting types
    if (meeting.type === 'omitted') {
      // Omitted meeting - show comment, leave roles empty
      row['Comment'] = meeting.comment || 'NO MEETING';
      orderedRoles.forEach(role => {
        row[role.name] = '';
      });
    } else if (meeting.type === 'special' && meeting.comment) {
      // Special meeting with comment
      row['Comment'] = meeting.comment;
      // Add person names for roles
      orderedRoles.forEach(role => {
        const duty = meeting.duties[role.id];
        const personId = duty?.personId;
        const person = personId ? people.find(p => p.id === personId) : null;
        row[role.name] = person ? person.name : '';
      });
    } else {
      // Regular meeting
      orderedRoles.forEach(role => {
        const duty = meeting.duties[role.id];
        const personId = duty?.personId;
        const person = personId ? people.find(p => p.id === personId) : null;
        row[role.name] = person ? person.name : '';
      });
    }

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
 * Export schedule to PDF with comprehensive formatting
 */
export function exportScheduleToPDF(schedule, roles, people, roleOrder = []) {
  if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
    throw new Error('No schedule to export');
  }

  // Get ordered roles (use roleOrder if provided)
  const orderedRoles = roleOrder && roleOrder.length > 0
    ? roleOrder
        .map(roleId => roles.find(r => r.id === roleId))
        .filter(Boolean)
    : roles;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const startDate = formatDateUK(schedule.startDate);
  const endDate = formatDateUK(schedule.endDate);
  const pageWidth = doc.internal.pageSize.getWidth();

  // === HEADER SECTION ===
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DUTY SCHEDULE', 14, 15);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${startDate} to ${endDate}`, 14, 22);

  // Right-aligned info
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString('en-GB')}`, pageWidth - 14, 15, { align: 'right' });
  doc.text(`Total Meetings: ${schedule.meetings.length}`, pageWidth - 14, 20, { align: 'right' });

  // === TABLE SECTION ===
  // Build headers
  const headers = [[
    'No.',
    'Date',
    'Day',
    ...orderedRoles.map(r => r.name)
  ]];

  // Build data rows
  const rows = schedule.meetings.map((meeting, index) => {
    const row = [
      meeting.meetingNo || (index + 1),
      formatDateUK(meeting.date),
      meeting.day.substring(0, 3) // Thu, Sun, etc.
    ];

    // Add role assignments in order
    orderedRoles.forEach(role => {
      if (meeting.type === 'omitted') {
        // Show "NO MEETING" in first role column only
        row.push('');
      } else {
        const duty = meeting.duties[role.id];
        const personId = duty?.personId;
        const person = personId ? people.find(p => p.id === personId) : null;
        row.push(person ? person.name : '-');
      }
    });

    return row;
  });

  // Generate table with enhanced styling
  autoTable(doc, {
    head: headers,
    body: rows,
    startY: 28,

    // Styling
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
      cellWidth: 'auto'
    },

    headStyles: {
      fillColor: [41, 128, 185], // Blue header
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center'
    },

    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },  // Meeting No.
      1: { cellWidth: 22, halign: 'center' },  // Date
      2: { cellWidth: 20, halign: 'center' }   // Day
      // Role columns auto-width
    },

    // Alternate row colors
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    },

    // Special row styling
    didParseCell: (data) => {
      if (data.section === 'body' && data.row.index < schedule.meetings.length) {
        const meeting = schedule.meetings[data.row.index];

        // Style omitted meeting rows
        if (meeting.type === 'omitted') {
          data.cell.styles.fillColor = [220, 220, 220];
          data.cell.styles.fontStyle = 'italic';
          data.cell.styles.textColor = [100, 100, 100];

          // Show "NO MEETING" message in merged cells
          if (data.column.index === 3) {
            data.cell.text = [`NO MEETING${meeting.comment ? ` - ${meeting.comment}` : ''}`];
            data.cell.colSpan = orderedRoles.length;
          } else if (data.column.index > 3) {
            // Hide other role columns for omitted meetings
            data.cell.text = [''];
          }
        }

        // Style special meeting rows
        if (meeting.type === 'special') {
          data.cell.styles.fillColor = [255, 248, 220]; // Light yellow
        }

        // Highlight unfilled roles
        if (data.column.index >= 3 && meeting.type !== 'omitted') {
          const roleIndex = data.column.index - 3;
          const role = orderedRoles[roleIndex];
          const duty = meeting.duties[role?.id];

          if (!duty?.personId) {
            data.cell.styles.textColor = [200, 0, 0]; // Red for unfilled
            data.cell.styles.fontStyle = 'italic';
          }
        }
      }
    },

    // Page numbering
    showHead: 'everyPage',
    didDrawPage: (data) => {
      const pageCount = doc.internal.getNumberOfPages();
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;

      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(
        `Page ${pageNum} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    },

    margin: { top: 28, left: 14, right: 14, bottom: 20 }
  });

  // === STATISTICS SECTION ===
  let finalY = (doc.lastAutoTable?.finalY || 100) + 10;
  const pageHeight = doc.internal.pageSize.getHeight();

  // Check if we need a new page for statistics
  if (finalY + 40 > pageHeight) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('STATISTICS', 14, finalY);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  finalY += 6;

  // Calculate statistics
  const regularCount = schedule.meetings.filter(m => m.type === 'regular').length;
  const specialCount = schedule.meetings.filter(m => m.type === 'special').length;
  const omittedCount = schedule.meetings.filter(m => m.type === 'omitted').length;

  const statsText = [
    `Total People: ${people.length}`,
    `Total Roles: ${roles.length}`,
    `Regular Meetings: ${regularCount}`,
    `Special Meetings: ${specialCount}`,
    `Omitted Dates: ${omittedCount}`
  ];

  statsText.forEach(text => {
    doc.text(`• ${text}`, 14, finalY);
    finalY += 5;
  });

  // === CONFLICTS/WARNINGS SECTION ===
  if (schedule.conflicts && schedule.conflicts.length > 0) {
    finalY += 5;

    // Add new page if needed
    if (finalY + 20 > pageHeight) {
      doc.addPage();
      finalY = 20;
    }

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(200, 0, 0); // Red
    doc.text('CONFLICTS & WARNINGS', 14, finalY);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    finalY += 6;

    // Show first 10 conflicts
    const conflictsToShow = schedule.conflicts.slice(0, 10);
    conflictsToShow.forEach(conflict => {
      const message = conflict.message || 'Unknown conflict';
      doc.text(`• ${message}`, 14, finalY, { maxWidth: pageWidth - 28 });
      finalY += 5;
    });

    if (schedule.conflicts.length > 10) {
      doc.setTextColor(100, 100, 100);
      doc.text(`... and ${schedule.conflicts.length - 10} more warning(s)`, 14, finalY);
    }
  }

  // === SAVE PDF ===
  const startDateStr = new Date(schedule.startDate).toISOString().split('T')[0];
  const endDateStr = new Date(schedule.endDate).toISOString().split('T')[0];
  const filename = `Duty_Schedule_${startDateStr}_to_${endDateStr}.pdf`;

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
