import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';
import { getOrderedRoles, moveRoleUp, moveRoleDown } from '../../utils/roleUtils';

export default function SettingsPage() {
  const { settings, schedule, updateMeetingDays, updateRoleOrder, roles } = useApp();
  const [midweek, setMidweek] = useState(settings.meetingDays.midweek);
  const [weekend, setWeekend] = useState(settings.meetingDays.weekend);
  const [hasChanges, setHasChanges] = useState(false);

  const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const weekendOptions = ['Saturday', 'Sunday'];

  const isLocked = settings.meetingDays.locked && schedule?.meetings?.length > 0;

  const handleMidweekChange = (value) => {
    setMidweek(value);
    setHasChanges(true);
  };

  const handleWeekendChange = (value) => {
    setWeekend(value);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (isLocked) {
      alert('Meeting days are locked. Clear your schedule first to change meeting days.');
      return;
    }

    const success = updateMeetingDays(midweek, weekend);
    if (success) {
      setHasChanges(false);
      alert('Meeting days updated successfully!');
    }
  };

  const handleCancel = () => {
    setMidweek(settings.meetingDays.midweek);
    setWeekend(settings.meetingDays.weekend);
    setHasChanges(false);
  };

  // Role ordering logic
  const orderedRoles = useMemo(() => {
    return getOrderedRoles(roles, settings.roleOrder);
  }, [roles, settings.roleOrder]);

  const handleMoveUp = (roleId) => {
    const newOrder = moveRoleUp(settings.roleOrder || roles.map(r => r.id), roleId);
    updateRoleOrder(newOrder);
  };

  const handleMoveDown = (roleId) => {
    const newOrder = moveRoleDown(settings.roleOrder || roles.map(r => r.id), roleId);
    updateRoleOrder(newOrder);
  };

  const handleResetOrder = () => {
    if (window.confirm('Reset role column order to default?\n\nThis will restore the original role order.')) {
      const defaultOrder = roles.map(r => r.id);
      updateRoleOrder(defaultOrder);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Settings</h2>

      {/* Meeting Days Configuration */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">Meeting Days Configuration</h3>

        {isLocked && (
          <div className="bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-300">
              <strong>Meeting days are locked.</strong> Clear your schedule first to change meeting days.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Midweek Day */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Midweek Meeting Day
            </label>
            <select
              value={midweek}
              onChange={(e) => handleMidweekChange(e.target.value)}
              disabled={isLocked}
              className="w-full md:w-64 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {weekdayOptions.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Weekend Day */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Weekend Meeting Day
            </label>
            <select
              value={weekend}
              onChange={(e) => handleWeekendChange(e.target.value)}
              disabled={isLocked}
              className="w-full md:w-64 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
              {weekendOptions.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Current Pattern Display */}
          <div className="pt-4 border-t border-gray-700">
            <p className="text-sm text-gray-300">
              <strong>Current Pattern:</strong> {settings.meetingDays.midweek} / {settings.meetingDays.weekend}
            </p>
            {settings.meetingDays.locked && (
              <p className="text-sm text-gray-400 mt-1">
                Status: Locked (schedule exists)
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        {hasChanges && !isLocked && (
          <div className="flex gap-3 mt-6">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Role Column Order */}
      <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-2">Role Column Order</h3>
        <p className="text-sm text-gray-400 mb-4">
          Configure the display order of roles in schedules and exports.
        </p>

        {/* Help Text */}
        <div className="bg-blue-900 bg-opacity-20 border border-blue-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-blue-300">
            💡 <strong>Tip:</strong> This order affects how roles appear in the schedule table and all exports (CSV/PDF). Changes apply immediately.
          </p>
        </div>

        {orderedRoles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-3 px-4 font-semibold text-gray-300 w-20">Order</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300">Role</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-300 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {orderedRoles.map((role, index) => {
                  const isFirst = index === 0;
                  const isLast = index === orderedRoles.length - 1;

                  return (
                    <tr key={role.id} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4 text-gray-300">{index + 1}</td>
                      <td className="py-3 px-4 text-gray-200">
                        {role.name}
                        {role.allowGrouping && (
                          <span className="ml-2 text-xs text-green-400" title="Grouped role">*</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleMoveUp(role.id)}
                            disabled={isFirst}
                            className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move up"
                          >
                            ↑
                          </button>
                          <button
                            onClick={() => handleMoveDown(role.id)}
                            disabled={isLast}
                            className="px-3 py-1 bg-gray-700 border border-gray-600 text-white rounded hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move down"
                          >
                            ↓
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-gray-400 py-8">
            No roles available. Add roles first.
          </div>
        )}

        {/* Reset Button */}
        {orderedRoles.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-700">
            <button
              onClick={handleResetOrder}
              className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
            >
              Reset to Default
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
