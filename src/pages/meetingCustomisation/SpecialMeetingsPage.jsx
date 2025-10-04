import { useState, useMemo } from 'react';
import { useApp } from '../../contexts/AppContext';

export default function SpecialMeetingsPage() {
  const {
    settings,
    schedule,
    specialMeetings,
    addSpecialMeeting,
    updateSpecialMeeting,
    deleteSpecialMeeting,
    findSpecialMeetingByDate,
    isDateOmitted
  } = useApp();

  const [formData, setFormData] = useState({
    date: '',
    comment: '',
    commentType: 'Memorial'
  });
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const commentSuggestions = [
    'Memorial',
    "Circuit Overseer's Visit",
    'Branch Event',
    'Custom...'
  ];

  // Get day name from date string
  const getDayName = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { weekday: 'long' });
  };

  // Validate form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      selectedDate.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selectedDate < today) {
        newErrors.date = 'Date must be in the future';
      }

      if (isDateOmitted(selectedDate)) {
        newErrors.date = 'This date is marked as omitted. Remove from omitted dates first.';
      }

      // Check if already exists (when not editing)
      if (!editingId) {
        const existing = findSpecialMeetingByDate(selectedDate);
        if (existing) {
          newErrors.date = 'A special meeting already exists on this date';
        }
      }
    }

    const comment = formData.commentType === 'Custom...' ? formData.comment : formData.commentType;
    if (!comment || comment.trim().length === 0) {
      newErrors.comment = 'Comment is required for special meetings';
    } else if (comment.length > 100) {
      newErrors.comment = 'Comment is too long (maximum 100 characters)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const comment = formData.commentType === 'Custom...' ? formData.comment : formData.commentType;

    if (editingId) {
      updateSpecialMeeting(editingId, { comment });
      setEditingId(null);
    } else {
      addSpecialMeeting(formData.date, comment);
    }

    setFormData({ date: '', comment: '', commentType: 'Memorial' });
    setErrors({});
  };

  const handleEdit = (specialMeeting) => {
    const isSuggestion = commentSuggestions.includes(specialMeeting.comment);
    setFormData({
      date: new Date(specialMeeting.date).toISOString().split('T')[0],
      comment: isSuggestion ? '' : specialMeeting.comment,
      commentType: isSuggestion ? specialMeeting.comment : 'Custom...'
    });
    setEditingId(specialMeeting.id);
    setErrors({});
  };

  const handleCancelEdit = () => {
    setFormData({ date: '', comment: '', commentType: 'Memorial' });
    setEditingId(null);
    setErrors({});
  };

  const handleDelete = (specialMeeting) => {
    setDeleteConfirm(specialMeeting);
  };

  const confirmDelete = () => {
    if (deleteConfirm) {
      deleteSpecialMeeting(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  // Get meeting status
  const getMeetingStatus = (specialMeeting) => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return { text: 'Not yet scheduled', color: 'text-gray-500' };
    }

    const smDate = new Date(specialMeeting.date);
    smDate.setHours(0, 0, 0, 0);

    const lastMeetingDate = new Date(schedule.endDate);
    lastMeetingDate.setHours(0, 0, 0, 0);

    if (smDate > lastMeetingDate) {
      return { text: 'Not yet scheduled', color: 'text-gray-500' };
    }

    const meetingIndex = schedule.meetings.findIndex(m => {
      const mDate = new Date(m.date);
      mDate.setHours(0, 0, 0, 0);
      return mDate.getTime() === smDate.getTime();
    });

    if (meetingIndex >= 0) {
      return {
        text: `In schedule (Meeting #${meetingIndex + 1})`,
        color: 'text-green-600'
      };
    }

    return { text: 'Not yet scheduled', color: 'text-gray-500' };
  };

  // Sort special meetings by date
  const sortedSpecialMeetings = useMemo(() => {
    return [...specialMeetings].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [specialMeetings]);

  // Count upcoming special meetings
  const upcomingCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return specialMeetings.filter(sm => {
      const date = new Date(sm.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }).length;
  }, [specialMeetings]);

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
      <h2 className="text-xl font-bold mb-4">Special Meetings</h2>

      {/* Summary */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <p className="text-sm text-gray-600">
          <strong>{upcomingCount}</strong> upcoming special meeting{upcomingCount !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {editingId ? 'Edit Special Meeting' : 'Create Special Meeting'}
        </h3>
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
                disabled={editingId !== null}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 ${
                  errors.date ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.date && (
                <p className="text-red-500 text-sm mt-1">{errors.date}</p>
              )}
            </div>

            {/* Comment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comment Type <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.commentType}
                onChange={(e) => {
                  setFormData({ ...formData, commentType: e.target.value, comment: '' });
                  setErrors({});
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {commentSuggestions.map(suggestion => (
                  <option key={suggestion} value={suggestion}>{suggestion}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Custom Comment Field */}
          {formData.commentType === 'Custom...' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom Comment <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.comment}
                onChange={(e) => {
                  setFormData({ ...formData, comment: e.target.value });
                  setErrors({});
                }}
                placeholder="Enter custom comment"
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.comment ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.comment && (
                <p className="text-red-500 text-sm mt-1">{errors.comment}</p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {editingId ? 'Update Special Meeting' : 'Create Special Meeting'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Special Meetings List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h3 className="text-lg font-semibold mb-4">Special Meetings List</h3>

          {sortedSpecialMeetings.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No special meetings scheduled
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Day</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Comment</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedSpecialMeetings.map((specialMeeting) => {
                    const status = getMeetingStatus(specialMeeting);
                    return (
                      <tr key={specialMeeting.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4">{formatDate(specialMeeting.date)}</td>
                        <td className="py-3 px-4">{getDayName(specialMeeting.date)}</td>
                        <td className="py-3 px-4 text-gray-700">{specialMeeting.comment}</td>
                        <td className={`py-3 px-4 text-sm ${status.color}`}>{status.text}</td>
                        <td className="py-3 px-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(specialMeeting)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(specialMeeting)}
                              className="text-red-600 hover:text-red-800 text-sm font-medium"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
            <h3 className="text-lg font-semibold mb-4">Delete Special Meeting?</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete the special meeting <strong>"{deleteConfirm.comment}"</strong> on{' '}
              <strong>{formatDate(deleteConfirm.date)}</strong>? This will remove it from the schedule if already generated.
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
