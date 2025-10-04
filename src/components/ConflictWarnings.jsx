import PropTypes from 'prop-types';
import { useApp } from '../contexts/AppContext';
import { formatDate } from '../utils/dateUtils';

export default function ConflictWarnings({ conflicts, schedule }) {
  const { roles } = useApp();

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown Role';
  };

  const getMeetingInfo = (meetingId) => {
    const meeting = schedule.meetings.find(m => m.id === meetingId);
    if (!meeting) return 'Unknown Meeting';
    const index = schedule.meetings.indexOf(meeting) + 1;
    return `Meeting ${index} - ${formatDate(meeting.date)} (${meeting.day})`;
  };

  const groupedConflicts = {
    hard: conflicts.filter(c => c.type === 'hard'),
    unfilled: conflicts.filter(c => c.type === 'unfilled'),
    soft: conflicts.filter(c => c.type === 'soft')
  };

  return (
    <div className="mt-6 bg-gray-800 rounded-lg border border-gray-700 p-6">
      <h3 className="text-lg font-bold text-white mb-4">Conflict Warnings</h3>

      {/* Hard Conflicts */}
      {groupedConflicts.hard.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-red-400 mb-2">
            Hard Conflicts ({groupedConflicts.hard.length})
          </h4>
          <div className="space-y-2">
            {groupedConflicts.hard.map((conflict, index) => (
              <div key={index} className="p-3 bg-red-900 bg-opacity-20 border border-red-700 rounded text-sm">
                <div className="font-medium text-gray-200">{getMeetingInfo(conflict.meetingId)}</div>
                <div className="text-red-300">
                  {getRoleName(conflict.roleId)}: {conflict.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unfilled Roles */}
      {groupedConflicts.unfilled.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-orange-400 mb-2">
            Unfilled Roles ({groupedConflicts.unfilled.length})
          </h4>
          <div className="space-y-2">
            {groupedConflicts.unfilled.map((conflict, index) => (
              <div key={index} className="p-3 bg-orange-900 bg-opacity-20 border border-orange-700 rounded text-sm">
                <div className="font-medium text-gray-200">{getMeetingInfo(conflict.meetingId)}</div>
                <div className="text-orange-300">
                  {getRoleName(conflict.roleId)}: {conflict.message}
                </div>
                {conflict.details && (
                  <div className="text-xs text-gray-400 mt-1">
                    {conflict.details.unavailable > 0 && `${conflict.details.unavailable} unavailable, `}
                    {conflict.details.doubleBooked > 0 && `${conflict.details.doubleBooked} already assigned, `}
                    Total eligible: {conflict.details.total}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Soft Conflicts */}
      {groupedConflicts.soft.length > 0 && (
        <div>
          <h4 className="font-semibold text-yellow-400 mb-2">
            Soft Conflicts ({groupedConflicts.soft.length})
          </h4>
          <div className="space-y-2">
            {groupedConflicts.soft.map((conflict, index) => (
              <div key={index} className="p-3 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded text-sm">
                <div className="font-medium text-gray-200">{getMeetingInfo(conflict.meetingId)}</div>
                <div className="text-yellow-300">
                  {getRoleName(conflict.roleId)}: {conflict.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {conflicts.length === 0 && (
        <p className="text-green-400">✓ No conflicts detected - schedule is optimal!</p>
      )}
    </div>
  );
}

ConflictWarnings.propTypes = {
  conflicts: PropTypes.array.isRequired,
  schedule: PropTypes.object.isRequired
};
