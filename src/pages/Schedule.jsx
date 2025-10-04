import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateSchedule } from '../utils/schedulingAlgorithm';
import { logScheduleDebugInfo } from '../utils/scheduleDebug';
import ScheduleTable from '../components/ScheduleTable';
import ConflictWarnings from '../components/ConflictWarnings';

export default function Schedule() {
  const { people, roles, schedule, setSchedule, cancelledDates, settings, omittedDates, specialMeetings, lockMeetingDays } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [weeks, setWeeks] = useState(4);

  const handleGenerateSchedule = () => {
    setIsGenerating(true);

    // Use setTimeout to allow UI to update with loading state
    setTimeout(() => {
      try {
        const newSchedule = generateSchedule({
          startDate: new Date(startDate),
          weeks,
          people,
          roles,
          cancelledDates,
          settings,
          omittedDates,
          specialMeetings
        });

        // Update people with new assignment counts and last assigned dates
        // This is handled in the algorithm, but we need to sync back to context
        setSchedule(newSchedule);

        // Lock meeting days after first schedule generation
        if (!settings.meetingDays.locked) {
          lockMeetingDays();
        }

        // Debug logging
        logScheduleDebugInfo(newSchedule, people, roles);
      } catch (error) {
        console.error('Error generating schedule:', error);
        alert('Error generating schedule: ' + error.message);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleExtendSchedule = () => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      alert('No existing schedule to extend. Generate a schedule first.');
      return;
    }

    setIsGenerating(true);

    setTimeout(() => {
      try {
        const lastMeeting = schedule.meetings[schedule.meetings.length - 1];
        const nextStartDate = new Date(lastMeeting.date);
        nextStartDate.setDate(nextStartDate.getDate() + 1);

        const extension = generateSchedule({
          startDate: nextStartDate,
          weeks: 4,
          people,
          roles,
          cancelledDates,
          existingSchedule: schedule,
          settings,
          omittedDates,
          specialMeetings
        });

        // Merge with existing schedule
        const mergedSchedule = {
          ...schedule,
          endDate: extension.endDate,
          meetings: [...schedule.meetings, ...extension.meetings],
          conflicts: [...(schedule.conflicts || []), ...extension.conflicts]
        };

        setSchedule(mergedSchedule);
      } catch (error) {
        console.error('Error extending schedule:', error);
        alert('Error extending schedule: ' + error.message);
      } finally {
        setIsGenerating(false);
      }
    }, 100);
  };

  const handleClearSchedule = () => {
    if (window.confirm('Are you sure you want to clear the current schedule?')) {
      setSchedule(null);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-6">Schedule Generation</h2>

        {/* Generation Controls */}
        {!schedule ? (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
            <h3 className="font-semibold text-white mb-4">Generate New Schedule</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Number of Weeks
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={weeks}
                  onChange={(e) => setWeeks(parseInt(e.target.value))}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <button
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Schedule'}
            </button>
          </div>
        ) : (
          <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-white">Current Schedule</h3>
                <p className="text-sm text-gray-400 mt-1">
                  {schedule.meetings.length} meetings from{' '}
                  {new Date(schedule.startDate).toLocaleDateString('en-GB')} to{' '}
                  {new Date(schedule.endDate).toLocaleDateString('en-GB')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Generated: {new Date(schedule.generatedDate).toLocaleString('en-GB')}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleExtendSchedule}
                  disabled={isGenerating}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? 'Extending...' : 'Extend 4 Weeks'}
                </button>

                <button
                  onClick={handleClearSchedule}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Clear Schedule
                </button>
              </div>
            </div>

            {/* Conflict Summary */}
            {schedule.conflicts && schedule.conflicts.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded">
                <p className="text-sm font-medium text-yellow-400">
                  ⚠️ {schedule.conflicts.length} conflict(s) detected
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Schedule Table */}
      {schedule && schedule.meetings && schedule.meetings.length > 0 && (
        <>
          <ScheduleTable schedule={schedule} />

          {/* Conflict Warnings */}
          {schedule.conflicts && schedule.conflicts.length > 0 && (
            <ConflictWarnings conflicts={schedule.conflicts} schedule={schedule} />
          )}
        </>
      )}

      {/* Empty State */}
      {!schedule && !isGenerating && (
        <div className="bg-gray-800 border border-gray-700 p-12 rounded-lg text-center">
          <p className="text-lg text-gray-300">No schedule generated yet</p>
          <p className="text-sm text-gray-400 mt-2">
            Configure the settings above and click "Generate Schedule" to create a new schedule
          </p>
        </div>
      )}
    </div>
  );
}
