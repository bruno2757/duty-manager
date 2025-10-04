import { useState } from 'react';
import { useApp } from '../../contexts/AppContext';

export default function SettingsPage() {
  const { settings, schedule, updateMeetingDays } = useApp();
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

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Settings</h2>

      {/* Meeting Days Configuration */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Meeting Days Configuration</h3>

        {isLocked && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              <strong>Meeting days are locked.</strong> Clear your schedule first to change meeting days.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {/* Midweek Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Midweek Meeting Day
            </label>
            <select
              value={midweek}
              onChange={(e) => handleMidweekChange(e.target.value)}
              disabled={isLocked}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {weekdayOptions.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Weekend Day */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Weekend Meeting Day
            </label>
            <select
              value={weekend}
              onChange={(e) => handleWeekendChange(e.target.value)}
              disabled={isLocked}
              className="w-full md:w-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {weekendOptions.map(day => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </div>

          {/* Current Pattern Display */}
          <div className="pt-4 border-t">
            <p className="text-sm text-gray-600">
              <strong>Current Pattern:</strong> {settings.meetingDays.midweek} / {settings.meetingDays.weekend}
            </p>
            {settings.meetingDays.locked && (
              <p className="text-sm text-gray-500 mt-1">
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
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Save Changes
            </button>
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
