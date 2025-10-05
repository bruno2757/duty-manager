import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { generateSchedule } from '../utils/schedulingAlgorithm';
import { logScheduleDebugInfo } from '../utils/scheduleDebug';
import ScheduleTable from '../components/ScheduleTable';
import ConflictWarnings from '../components/ConflictWarnings';

export default function Schedule() {
  const { people, roles, schedule, setSchedule, cancelledDates, settings, omittedDates, specialMeetings, lockMeetingDays, deleteLastMeetings, clearHistoricMeetings } = useApp();
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [weeks, setWeeks] = useState(4);
  const [deleteCount, setDeleteCount] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [meetingsToDelete, setMeetingsToDelete] = useState([]);
  const [showHistoricConfirm, setShowHistoricConfirm] = useState(false);
  const [historicData, setHistoricData] = useState(null);

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

  // Delete last X meetings logic
  const isValidDeleteCount = () => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return false;
    }
    const num = parseInt(deleteCount, 10);
    return (
      !isNaN(num) &&
      num >= 1 &&
      num <= schedule.meetings.length &&
      deleteCount.trim() !== ''
    );
  };

  const handleDeleteLastClick = () => {
    if (!isValidDeleteCount()) return;

    const num = parseInt(deleteCount, 10);
    const toDelete = schedule.meetings.slice(-num);
    setMeetingsToDelete(toDelete);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteLast = () => {
    const num = parseInt(deleteCount, 10);
    const success = deleteLastMeetings(num);

    if (success) {
      const remainingCount = schedule.meetings.length - num;
      if (remainingCount > 0) {
        alert(`✓ Deleted ${num} meeting${num !== 1 ? 's' : ''} successfully.\nSchedule now contains ${remainingCount} meeting${remainingCount !== 1 ? 's' : ''}.`);
      } else {
        alert(`✓ Deleted all ${num} meeting${num !== 1 ? 's' : ''} successfully.\nSchedule is now empty.`);
      }
    }

    setShowDeleteConfirm(false);
    setDeleteCount('');
    setMeetingsToDelete([]);
  };

  const cancelDeleteLast = () => {
    setShowDeleteConfirm(false);
    setMeetingsToDelete([]);
  };

  // Clear historic meetings logic
  const getHistoricMeetingsData = () => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return null;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const historicMeetings = schedule.meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate < today;
    });

    const futureMeetings = schedule.meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate >= today;
    });

    if (historicMeetings.length === 0) {
      return null;
    }

    return {
      historicCount: historicMeetings.length,
      earliestHistoric: historicMeetings[0].date,
      latestHistoric: historicMeetings[historicMeetings.length - 1].date,
      futureCount: futureMeetings.length,
      firstFuture: futureMeetings[0]?.date
    };
  };

  const handleClearHistoricClick = () => {
    const data = getHistoricMeetingsData();
    if (!data) return;

    setHistoricData(data);
    setShowHistoricConfirm(true);
  };

  const confirmClearHistoric = () => {
    const result = clearHistoricMeetings();

    if (result.success) {
      if (result.futureCount > 0) {
        alert(`✓ Cleared ${result.historicCount} historic meeting${result.historicCount !== 1 ? 's' : ''}.\nSchedule now contains ${result.futureCount} meeting${result.futureCount !== 1 ? 's' : ''}.`);
      } else {
        alert(`✓ Cleared all ${result.historicCount} historic meeting${result.historicCount !== 1 ? 's' : ''}.\nSchedule is now empty.`);
      }
    }

    setShowHistoricConfirm(false);
    setHistoricData(null);
  };

  const cancelClearHistoric = () => {
    setShowHistoricConfirm(false);
    setHistoricData(null);
  };

  const historicMeetingsCount = getHistoricMeetingsData()?.historicCount || 0;

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

      {/* Delete Last Meetings Controls */}
      {schedule && schedule.meetings && schedule.meetings.length > 0 && (
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 mb-6">
          <h3 className="font-semibold text-white mb-4">Schedule Management</h3>
          <div className="space-y-4">
            {/* Delete Last X Meetings */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <label htmlFor="deleteCount" className="text-sm text-gray-300">
                  Delete last
                </label>
                <input
                  id="deleteCount"
                  type="number"
                  min="1"
                  max={schedule.meetings.length}
                  value={deleteCount}
                  onChange={(e) => setDeleteCount(e.target.value)}
                  placeholder="0"
                  className="w-20 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">meetings</span>
                <button
                  onClick={handleDeleteLastClick}
                  disabled={!isValidDeleteCount()}
                  className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
                >
                  Apply
                </button>
              </div>
              <div className="text-xs text-gray-400">
                Schedule contains {schedule.meetings.length} meetings. Enter 1-{schedule.meetings.length}.
              </div>
            </div>

            {/* Clear Historic Meetings */}
            <div className="flex items-center gap-3 flex-wrap border-t border-gray-700 pt-4">
              <button
                onClick={handleClearHistoricClick}
                disabled={historicMeetingsCount === 0}
                className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                Clear Historic
              </button>
              <div className="text-xs text-gray-400">
                {historicMeetingsCount > 0 ? (
                  <span>{historicMeetingsCount} historic meeting{historicMeetingsCount !== 1 ? 's' : ''} • Click to clear</span>
                ) : (
                  <span>No historic meetings to clear</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Last X Meetings Confirmation Dialog */}
      {showDeleteConfirm && meetingsToDelete.length > 0 && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Delete Last {meetingsToDelete.length} Meeting{meetingsToDelete.length !== 1 ? 's' : ''}?</h3>

            <p className="text-gray-300 mb-4">
              You are about to delete the last <strong>{meetingsToDelete.length}</strong> meeting{meetingsToDelete.length !== 1 ? 's' : ''} from your schedule.
            </p>

            <div className="bg-gray-900 bg-opacity-50 p-4 rounded border border-gray-700 mb-4">
              <div className="text-sm space-y-2">
                <div>
                  <span className="text-gray-400">From: </span>
                  <span className="text-white font-medium">
                    {new Date(meetingsToDelete[0].date).toLocaleDateString('en-GB')} ({meetingsToDelete[0].day})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">To: </span>
                  <span className="text-white font-medium">
                    {new Date(meetingsToDelete[meetingsToDelete.length - 1].date).toLocaleDateString('en-GB')} ({meetingsToDelete[meetingsToDelete.length - 1].day})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Total: </span>
                  <span className="text-white font-medium">{meetingsToDelete.length} meeting{meetingsToDelete.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              This will remove all assignments for these meetings. Assignment statistics will be preserved.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDeleteLast}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteLast}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Delete Meetings
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Historic Meetings Confirmation Dialog */}
      {showHistoricConfirm && historicData && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">⚠️ Clear Historic Meetings</h3>

            <p className="text-gray-300 mb-4">
              You are about to delete all past meetings from your schedule.
            </p>

            <div className="bg-gray-900 bg-opacity-50 p-4 rounded border border-gray-700 mb-4">
              <div className="text-sm space-y-3">
                <div>
                  <div className="text-gray-400 mb-1 font-medium">Historic meetings found:</div>
                  <div className="ml-3 space-y-1">
                    <div>
                      <span className="text-gray-400">Count: </span>
                      <span className="text-white font-medium">{historicData.historicCount} meeting{historicData.historicCount !== 1 ? 's' : ''}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Date range: </span>
                      <span className="text-white font-medium">
                        {new Date(historicData.earliestHistoric).toLocaleDateString('en-GB')} to {new Date(historicData.latestHistoric).toLocaleDateString('en-GB')}
                      </span>
                    </div>
                  </div>
                </div>

                {historicData.futureCount > 0 && (
                  <div className="border-t border-gray-700 pt-3">
                    <div className="text-gray-400 mb-1 font-medium">Future meetings will be preserved:</div>
                    <div className="ml-3 space-y-1">
                      <div>
                        <span className="text-gray-400">Count: </span>
                        <span className="text-white font-medium">{historicData.futureCount} meeting{historicData.futureCount !== 1 ? 's' : ''}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Starting from: </span>
                        <span className="text-white font-medium">{new Date(historicData.firstFuture).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-gray-400 mb-6">
              Assignment statistics will be preserved for fair rotation.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelClearHistoric}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmClearHistoric}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                Clear Historic
              </button>
            </div>
          </div>
        </div>
      )}

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
