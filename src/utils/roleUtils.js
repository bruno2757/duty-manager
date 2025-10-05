/**
 * Get roles in the configured display order
 * @param {Array} roles - Array of all roles
 * @param {Array} roleOrder - Array of role IDs in desired order
 * @returns {Array} - Ordered array of roles
 */
export function getOrderedRoles(roles, roleOrder) {
  if (!roleOrder || roleOrder.length === 0 || !roles || roles.length === 0) {
    return roles || [];
  }

  // Map roleOrder to actual role objects
  const orderedRoles = roleOrder
    .map(roleId => roles.find(r => r.id === roleId))
    .filter(Boolean); // Remove any null/undefined

  // Add any roles that aren't in roleOrder (new roles added after order was set)
  const orderedRoleIds = new Set(orderedRoles.map(r => r.id));
  const missingRoles = roles.filter(r => !orderedRoleIds.has(r.id));

  return [...orderedRoles, ...missingRoles];
}

/**
 * Validate and fix role order array
 * Removes invalid role IDs and adds missing roles
 * @param {Array} roleOrder - Current role order
 * @param {Array} roles - Available roles
 * @returns {Array} - Valid role order array
 */
export function validateRoleOrder(roleOrder, roles) {
  if (!roles || roles.length === 0) {
    return [];
  }

  if (!roleOrder || roleOrder.length === 0) {
    return roles.map(r => r.id);
  }

  // Remove invalid role IDs
  const validOrder = roleOrder.filter(id =>
    roles.find(r => r.id === id)
  );

  // Add missing roles to end
  const missingRoleIds = roles
    .filter(r => !validOrder.includes(r.id))
    .map(r => r.id);

  return [...validOrder, ...missingRoleIds];
}

/**
 * Move a role up in the order (swap with previous)
 * @param {Array} roleOrder - Current role order
 * @param {string} roleId - ID of role to move
 * @returns {Array} - New role order array
 */
export function moveRoleUp(roleOrder, roleId) {
  const currentIndex = roleOrder.indexOf(roleId);
  if (currentIndex <= 0) return roleOrder; // Already first or not found

  const newOrder = [...roleOrder];
  // Swap with previous item
  [newOrder[currentIndex - 1], newOrder[currentIndex]] =
    [newOrder[currentIndex], newOrder[currentIndex - 1]];

  return newOrder;
}

/**
 * Move a role down in the order (swap with next)
 * @param {Array} roleOrder - Current role order
 * @param {string} roleId - ID of role to move
 * @returns {Array} - New role order array
 */
export function moveRoleDown(roleOrder, roleId) {
  const currentIndex = roleOrder.indexOf(roleId);
  if (currentIndex === -1 || currentIndex >= roleOrder.length - 1) {
    return roleOrder; // Already last or not found
  }

  const newOrder = [...roleOrder];
  // Swap with next item
  [newOrder[currentIndex], newOrder[currentIndex + 1]] =
    [newOrder[currentIndex + 1], newOrder[currentIndex]];

  return newOrder;
}
