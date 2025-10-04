import { useState } from 'react';
import PropTypes from 'prop-types';
import { useApp } from '../contexts/AppContext';
import { createRole } from '../data/models';

export default function RoleForm({ role, onSave, onCancel }) {
  const { people, setPeople, roles, setRoles } = useApp();
  const isEditing = !!role;

  const [name, setName] = useState(role?.name || '');
  const [allowGrouping, setAllowGrouping] = useState(role?.allowGrouping || false);
  const [selectedPeopleIds, setSelectedPeopleIds] = useState(role?.peopleIds || []);

  const handleTogglePerson = (personId) => {
    setSelectedPeopleIds((prev) =>
      prev.includes(personId)
        ? prev.filter((id) => id !== personId)
        : [...prev, personId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim()) {
      alert('Please enter a role name');
      return;
    }

    if (isEditing) {
      // Update existing role
      const updatedRoles = roles.map((r) =>
        r.id === role.id
          ? { ...r, name, allowGrouping, peopleIds: selectedPeopleIds }
          : r
      );
      setRoles(updatedRoles);

      // Update people's roles array
      const updatedPeople = people.map((person) => {
        const wasAssigned = role.peopleIds.includes(person.id);
        const isAssigned = selectedPeopleIds.includes(person.id);

        if (!wasAssigned && isAssigned) {
          // Add role
          return {
            ...person,
            roles: [...person.roles, role.id],
            assignmentCount: { ...person.assignmentCount, [role.id]: 0 }
          };
        } else if (wasAssigned && !isAssigned) {
          // Remove role
          return {
            ...person,
            roles: person.roles.filter((rid) => rid !== role.id),
            assignmentCount: Object.fromEntries(
              Object.entries(person.assignmentCount).filter(([rid]) => rid !== role.id)
            )
          };
        }
        return person;
      });
      setPeople(updatedPeople);
    } else {
      // Create new role
      const newRole = createRole({ name, allowGrouping, peopleIds: selectedPeopleIds });
      setRoles([...roles, newRole]);

      // Update people's roles array
      const updatedPeople = people.map((person) => {
        if (selectedPeopleIds.includes(person.id)) {
          return {
            ...person,
            roles: [...person.roles, newRole.id],
            assignmentCount: { ...person.assignmentCount, [newRole.id]: 0 }
          };
        }
        return person;
      });
      setPeople(updatedPeople);
    }

    onSave();
  };

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6 border-b border-gray-700">
        <h3 className="text-xl font-bold text-white">
          {isEditing ? `Edit Role: ${role.name}` : 'Create New Role'}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        {/* Role Name */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Role Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="e.g., Sound, Zoom Host"
            required
          />
        </div>

        {/* Allow Grouping */}
        <div className="mb-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={allowGrouping}
              onChange={(e) => setAllowGrouping(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-medium text-gray-300">Enable Role Grouping</span>
          </label>
          <p className="text-sm text-gray-500 mt-1 ml-6">
            Assign same person to Thursday and Sunday within same week
          </p>
        </div>

        {/* Assign People */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Assign People ({selectedPeopleIds.length} selected)
          </label>
          <div className="border border-gray-700 rounded max-h-64 overflow-y-auto bg-gray-750">
            {people.map((person) => (
              <label
                key={person.id}
                className="flex items-center gap-3 p-3 hover:bg-gray-700 cursor-pointer border-b border-gray-700 last:border-b-0 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedPeopleIds.includes(person.id)}
                  onChange={() => handleTogglePerson(person.id)}
                  className="w-4 h-4"
                />
                <div className="flex-1">
                  <div className="font-medium text-gray-200">{person.name}</div>
                  <div className="text-sm text-gray-400">
                    {person.roles.length} role{person.roles.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            type="submit"
            className="px-6 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            {isEditing ? 'Save Changes' : 'Create Role'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

RoleForm.propTypes = {
  role: PropTypes.object,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired
};
