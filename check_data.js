import { getInitialData } from './src/data/initialData.js';

const data = getInitialData();

console.log('People count:', data.people.length);
console.log('Roles count:', data.roles.length);
console.log('\nRoles:');
data.roles.forEach(role => {
  console.log(`- ${role.name}: ${role.peopleIds.length} people, grouping: ${role.allowGrouping}`);
});

// Check multi-role people
const multiRolePeople = data.people.filter(p => p.roles.length > 1);
console.log(`\nMulti-role people: ${multiRolePeople.length}`);
console.log('Examples:');
multiRolePeople.slice(0, 5).forEach(person => {
  const roleNames = person.roles.map(roleId => {
    const role = data.roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown';
  });
  console.log(`- ${person.name}: ${roleNames.join(', ')}`);
});
