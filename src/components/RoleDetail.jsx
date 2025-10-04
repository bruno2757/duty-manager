import PropTypes from 'prop-types';
import { useApp } from '../contexts/AppContext';

export default function RoleDetail({ role, onEdit }) {
  const { people } = useApp();

  const assignedPeople = people.filter(p => role.peopleIds.includes(p.id));

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-6 border-b border-gray-700 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-white">{role.name}</h3>
          <p className="text-gray-400 mt-1">{assignedPeople.length} people assigned</p>
        </div>
        <button
          onClick={onEdit}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Edit Role
        </button>
      </div>

      <div className="p-6">
        {/* Role Settings */}
        <div className="mb-6">
          <h4 className="font-semibold text-white mb-2">Settings</h4>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Role Grouping:</span>
            {role.allowGrouping ? (
              <span className="px-3 py-1 bg-green-600 text-green-100 rounded">
                Enabled (Weekly)
              </span>
            ) : (
              <span className="px-3 py-1 bg-gray-700 text-gray-300 rounded">
                Disabled
              </span>
            )}
          </div>
          {role.allowGrouping && (
            <p className="text-sm text-gray-500 mt-2">
              Same person assigned Thu→Sun within same week when possible
            </p>
          )}
        </div>

        {/* Assigned People */}
        <div>
          <h4 className="font-semibold text-white mb-3">Assigned People</h4>
          {assignedPeople.length === 0 ? (
            <p className="text-gray-400">No people assigned to this role</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {assignedPeople.map((person) => (
                <div
                  key={person.id}
                  className="p-3 bg-gray-750 border border-gray-700 rounded hover:bg-gray-700 transition-colors"
                >
                  <div className="font-medium text-gray-200">{person.name}</div>
                  <div className="text-sm text-gray-400">
                    {person.roles.length} role{person.roles.length !== 1 ? 's' : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

RoleDetail.propTypes = {
  role: PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    allowGrouping: PropTypes.bool.isRequired,
    peopleIds: PropTypes.array.isRequired
  }).isRequired,
  onEdit: PropTypes.func.isRequired
};
