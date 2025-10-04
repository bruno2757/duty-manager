import { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';

export default function Availability() {
  const { people, setPeople } = useApp();
  const [formData, setFormData] = useState({
    personId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [errors, setErrors] = useState({});
  const [editingBlock, setEditingBlock] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Get all availability blocks with person info
  const allBlocks = useMemo(() => {
    const blocks = [];
    people.forEach(person => {
      if (person.availability && person.availability.length > 0) {
        person.availability.forEach((block, index) => {
          blocks.push({
            personId: person.id,
            personName: person.name,
            blockIndex: index,
            startDate: block.startDate,
            endDate: block.endDate,
            reason: block.reason || ''
          });
        });
      }
    });

    // Sort by person name, then by start date
    blocks.sort((a, b) => {
      const nameCompare = a.personName.localeCompare(b.personName);
      if (nameCompare !== 0) return nameCompare;

      const dateA = a.startDate instanceof Date ? a.startDate : new Date(a.startDate);
      const dateB = b.startDate instanceof Date ? b.startDate : new Date(b.startDate);
      return dateA - dateB;
    });

    return blocks;
  }, [people]);

  // Summary statistics
  const stats = useMemo(() => {
    const peopleWithAvailability = people.filter(
      p => p.availability && p.availability.length > 0
    ).length;

    return {
      totalBlocks: allBlocks.length,
      peopleWithBlocks: peopleWithAvailability
    };
  }, [allBlocks, people]);

  // Sorted people for dropdown
  const sortedPeople = useMemo(() => {
    return [...people].sort((a, b) => a.name.localeCompare(b.name));
  }, [people]);

  const formatDate = (date) => {
    const d = date instanceof Date ? date : new Date(date);
    return d.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.personId) {
      newErrors.personId = 'Person is required';
    }
    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (end < start) {
        newErrors.endDate = 'End date must be on or after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    const person = people.find(p => p.id === formData.personId);
    if (!person) return;

    if (!person.availability) {
      person.availability = [];
    }

    const newBlock = {
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
      reason: formData.reason.trim()
    };

    if (editingBlock) {
      // Update existing block
      person.availability[editingBlock.blockIndex] = newBlock;
      setEditingBlock(null);
    } else {
      // Add new block
      person.availability.push(newBlock);
    }

    setPeople([...people]);

    // Clear form
    setFormData({
      personId: '',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setErrors({});
  };

  const handleEdit = (block) => {
    const startDate = block.startDate instanceof Date
      ? block.startDate
      : new Date(block.startDate);
    const endDate = block.endDate instanceof Date
      ? block.endDate
      : new Date(block.endDate);

    setFormData({
      personId: block.personId,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      reason: block.reason
    });
    setEditingBlock(block);
    setErrors({});
  };

  const handleCancelEdit = () => {
    setFormData({
      personId: '',
      startDate: '',
      endDate: '',
      reason: ''
    });
    setEditingBlock(null);
    setErrors({});
  };

  const handleDelete = (block) => {
    setDeleteConfirm(block);
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;

    const person = people.find(p => p.id === deleteConfirm.personId);
    if (person && person.availability) {
      person.availability.splice(deleteConfirm.blockIndex, 1);
      setPeople([...people]);
    }

    setDeleteConfirm(null);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Availability Management</h2>

      {/* Summary Statistics */}
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-400">{stats.totalBlocks}</div>
            <div className="text-sm text-gray-400">Total Availability Blocks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-400">{stats.peopleWithBlocks}</div>
            <div className="text-sm text-gray-400">People with Availability</div>
          </div>
        </div>
      </div>

      {/* Add/Edit Form */}
      <div className="bg-gray-800 border border-gray-700 p-6 rounded-lg mb-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          {editingBlock ? 'Edit Availability Block' : 'Add New Availability Block'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Person */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Person <span className="text-red-400">*</span>
              </label>
              <select
                value={formData.personId}
                onChange={(e) => setFormData({ ...formData, personId: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-700 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.personId ? 'border-red-500' : 'border-gray-600'
                }`}
              >
                <option value="">Select a person</option>
                {sortedPeople.map(person => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
              {errors.personId && (
                <p className="text-red-400 text-sm mt-1">{errors.personId}</p>
              )}
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Reason
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                placeholder="e.g., Holiday, Work trip"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Start Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-700 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.startDate ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.startDate && (
                <p className="text-red-400 text-sm mt-1">{errors.startDate}</p>
              )}
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className={`w-full px-3 py-2 bg-gray-700 border text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.endDate ? 'border-red-500' : 'border-gray-600'
                }`}
              />
              {errors.endDate && (
                <p className="text-red-400 text-sm mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              {editingBlock ? 'Update Availability' : 'Add Availability'}
            </button>
            {editingBlock && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Availability Table */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">All Availability Blocks</h3>

          {allBlocks.length === 0 ? (
            <div className="text-center text-gray-400 py-8">
              No availability blocks defined. Add one above or import from CSV.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Name</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Start Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">End Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Reason</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allBlocks.map((block, idx) => (
                    <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750 transition-colors">
                      <td className="py-3 px-4 text-gray-200">{block.personName}</td>
                      <td className="py-3 px-4 text-gray-200">{formatDate(block.startDate)}</td>
                      <td className="py-3 px-4 text-gray-200">{formatDate(block.endDate)}</td>
                      <td className="py-3 px-4 text-gray-400">{block.reason || '-'}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(block)}
                            className="text-purple-400 hover:text-purple-300 text-sm font-medium"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(block)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium"
                          >
                            Delete
                          </button>
                        </div>
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
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Delete Availability Block?</h3>
            <p className="text-gray-300 mb-6">
              <strong>{deleteConfirm.personName}</strong> will be marked available from{' '}
              <strong>{formatDate(deleteConfirm.startDate)}</strong> to{' '}
              <strong>{formatDate(deleteConfirm.endDate)}</strong>.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
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
