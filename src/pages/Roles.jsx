import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import RoleList from '../components/RoleList';
import RoleDetail from '../components/RoleDetail';
import RoleForm from '../components/RoleForm';

export default function Roles() {
  const { roles } = useApp();
  const [selectedRole, setSelectedRole] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    setSelectedRole(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
    setIsCreating(false);
  };

  const handleCancel = () => {
    setIsCreating(false);
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsCreating(false);
    setIsEditing(false);
    // selectedRole will be updated by the form
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-white">Roles Management</h2>
        <button
          onClick={handleCreateNew}
          className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
        >
          Add New Role
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Role List */}
        <div className="lg:col-span-1">
          <RoleList
            roles={roles}
            selectedRole={selectedRole}
            onRoleSelect={handleRoleSelect}
          />
        </div>

        {/* Right: Role Detail or Form */}
        <div className="lg:col-span-2">
          {isCreating || isEditing ? (
            <RoleForm
              role={isEditing ? selectedRole : null}
              onSave={handleSave}
              onCancel={handleCancel}
            />
          ) : selectedRole ? (
            <RoleDetail role={selectedRole} onEdit={handleEdit} />
          ) : (
            <div className="bg-gray-800 border border-gray-700 p-8 rounded-lg text-center">
              <p className="text-gray-400">Select a role to view details or create a new one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
