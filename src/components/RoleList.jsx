import PropTypes from 'prop-types';

export default function RoleList({ roles, selectedRole, onRoleSelect }) {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">All Roles ({roles.length})</h3>
      </div>
      <div className="divide-y divide-gray-700">
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => onRoleSelect(role)}
            className={`w-full text-left p-4 hover:bg-gray-750 transition-colors ${
              selectedRole?.id === role.id ? 'bg-purple-900 bg-opacity-30' : ''
            }`}
          >
            <div className="font-medium text-gray-200">{role.name}</div>
            <div className="text-sm text-gray-400 mt-1">
              {role.peopleIds.length} people
              {role.allowGrouping && (
                <span className="ml-2 px-2 py-0.5 bg-green-600 text-green-100 text-xs rounded">
                  Grouped
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

RoleList.propTypes = {
  roles: PropTypes.array.isRequired,
  selectedRole: PropTypes.object,
  onRoleSelect: PropTypes.func.isRequired
};
