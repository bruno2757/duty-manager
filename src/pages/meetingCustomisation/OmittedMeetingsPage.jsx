import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';

export default function OmittedMeetingsPage() {
  const { settings, omittedDates, addOmittedDate, deleteOmittedDate, isDateOmitted } = useApp();
  const [formData, setFormData] = useState({
    date: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Get day name from date string
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  // Validate date
  const validateDate = (dateString) => {
    if (!dateString) {
      return { valid: false, error: 'Date is required' };
    }

    const selectedDate = new Date(dateString);
    selectedDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selectedDate < today) {
      return { valid: false, error: 'Date must be in the future' };
    }

    const dayName = getDayName(dateString);
    const isMidweek = dayName === settings.meetingDays.midweek;
    const isWeekend = dayName === settings.meetingDays.weekend;

    if (!isMidweek && !isWeekend) {
      return {
        valid: false,
        error: `Selected date (${dayName}) doesn't match configured meeting days (${settings.meetingDays.midweek}/${settings.meetingDays.weekend})`
      };
    }

    if (isDateOmitted(selectedDate)) {
      return { valid: false, error: 'This date is already omitted' };
    }

    return { valid: true };
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const validation = validateDate(formData.date);
    if (!validation.valid) {
      setErrors({ date: validation.error });
      return;
    }

    addOmittedDate(formData.date, formData.reason);
    setFormData({ date: '', reason: '' });
    setErrors({});
  };

  const handleDelete = (omittedDate) => {
    setDeleteConfirm(omittedDate);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteOmittedDate(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Sort omitted dates by date
  const sortedOmittedDates = useMemo(() => {
    return [...omittedDates].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [omittedDates]);

  // Count upcoming omitted dates
  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return omittedDates.filter(od => {
      const date = new Date(od.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }).length;
  }, [omittedDates]);

  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Omitted Meetings</h2>

      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <p className="text-sm text-gray-600">
          <strong>{upcomingCount}</strong> upcoming omitted meeting{upcomingCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Add Omitted Meeting</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => {
                  setFormData({ ...formData, date: e.target.value });
                  setErrors({});
                }}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date}</p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Public holiday, Special event"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Omitted Meeting
          </button>
        </form>
      </div>

      {/* Omitted Dates List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Omitted Meetings List</h3>

          {sortedOmittedDates.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No omitted meetings scheduled
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Reason</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOmittedDates.map((omittedDate) => (
                    <tr key={omittedDate.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">{formatDate(omittedDate.date)}</td>
                      <td className="py-3 px-4">{getDayName(omittedDate.date)}</td>
                      <td className="py-3 px-4 text-gray-600">{omittedDate.reason || '-'}</td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleDelete(omittedDate)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Omitted Date?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to remove <strong>{formatDate(deleteConfirm.date)}</strong> from the omitted meetings list?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
