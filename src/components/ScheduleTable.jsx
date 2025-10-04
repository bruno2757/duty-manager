import { useState } from 'react';
import PropTypes from 'prop-types';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export default function ScheduleTable({ schedule }) {
  const { people, roles, setSchedule } = useApp();
  const [editingCell, setEditingCell] = useState(null); // { meetingId, roleId }

  const handleAssignmentChange = (meetingId, roleId, newPersonId) => {
    const updatedMeetings = schedule.meetings.map(meeting => {
      if (meeting.id === meetingId) {
        return {
          ...meeting,
          duties: {
            ...meeting.duties,
            [roleId]: {
              personId: newPersonId,
              manuallyAssigned: true,
              hasConflict: checkForConflict(meeting, roleId, newPersonId)
            }
          }
        };
      }
      return meeting;
    });

    setSchedule({
      ...schedule,
      meetings: updatedMeetings
    });

    setEditingCell(null);
  };

  const checkForConflict = (meeting, currentRoleId, personId) => {
    if (!personId) return false;

    // Check if person is already assigned to another role in this meeting
    return Object.entries(meeting.duties).some(([roleId, duty]) => {
      return roleId !== currentRoleId && duty.personId === personId;
    });
  };

  const getPersonName = (personId) => {
    if (!personId) return '-';
    const person = people.find(p => p.id === personId);
    return person ? person.name : 'Unknown';
  };

  const getRowColorClass = (meeting) => {
    const hasHardConflict = Object.values(meeting.duties).some(duty => duty.hasConflict);
    const hasUnfilled = Object.values(meeting.duties).some(duty => !duty.personId);

    if (hasHardConflict || hasUnfilled) {
      return 'bg-red-900 bg-opacity-20 hover:bg-opacity-30';
    }
    if (meeting.type === 'special') {
      return 'bg-blue-900 bg-opacity-20 hover:bg-opacity-30';
    }
    return 'hover:bg-gray-750 transition-colors';
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-700">
          <thead className="bg-gray-900 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Day</th>
              {roles.map(role => (
                <th key={role.id} className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  {role.name}
                  {role.allowGrouping && (
                    <span className="ml-1 text-xs text-green-400">*</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {schedule.meetings.map((meeting, index) => (
              <tr key={meeting.id} className={getRowColorClass(meeting)}>
                <td className="px-4 py-3 text-sm text-gray-300">{index + 1}</td>
                <td className="px-4 py-3 text-sm text-gray-200">
                  <div className="flex items-center gap-2">
                    {formatDate(meeting.date)}
                    {meeting.type === 'special' && meeting.comment && (
                      <span
                        className="inline-block px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-600 text-white"
                        title={meeting.comment}
                      >
                        {meeting.comment.length > 15 ? meeting.comment.substring(0, 15) + '...' : meeting.comment}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <span className={meeting.day === 'Thursday' ? 'text-blue-400' : 'text-purple-400'}>
                    {meeting.day}
                  </span>
                </td>
                {roles.map(role => {
                  const duty = meeting.duties[role.id];
                  const isEditing = editingCell?.meetingId === meeting.id &&
                                   editingCell?.roleId === role.id;

                  return (
                    <td key={role.id} className="px-4 py-3 text-sm">
                      {isEditing ? (
                        <select
                          autoFocus
                          value={duty?.personId || ''}
                          onChange={(e) => handleAssignmentChange(
                            meeting.id,
                            role.id,
                            e.target.value || null
                          )}
                          onBlur={() => setEditingCell(null)}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 text-white rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">- Unassigned -</option>
                          {people
                            .filter(p => role.peopleIds.includes(p.id))
                            .map(person => (
                              <option key={person.id} value={person.id}>
                                {person.name}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingCell({ meetingId: meeting.id, roleId: role.id })}
                          className="text-left w-full text-gray-200 hover:text-purple-400 hover:underline transition-colors"
                        >
                          {duty?.personId ? (
                            <span>
                              {getPersonName(duty.personId)}
                              {duty.manuallyAssigned && (
                                <span className="ml-1 text-xs text-blue-400" title="Manually assigned">
                                  ✓
                                </span>
                              )}
                              {duty.hasConflict && (
                                <span className="ml-1 text-xs text-red-400" title="Has conflict">
                                  ⚠
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="text-gray-500">-</span>
                          )}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex gap-4 flex-wrap">
          <span><span className="text-green-400">*</span> = Grouped role (Thu→Sun)</span>
          <span><span className="text-blue-400">✓</span> = Manually assigned</span>
          <span><span className="text-red-400">⚠</span> = Conflict</span>
        </div>
      </div>
    </div>
  );
}

ScheduleTable.propTypes = {
  schedule: PropTypes.shape({
    meetings: PropTypes.array.isRequired
  }).isRequired
};
