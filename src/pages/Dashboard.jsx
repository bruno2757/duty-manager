import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { formatDate, getDateRangeString } from '../utils/dateUtils';

export default function Dashboard() {
  const { people, roles, schedule, settings, omittedDates, specialMeetings } = useApp();
  const [selectedRole, setSelectedRole] = useState('all');

  // Calculate upcoming omitted meetings
  const upcomingOmitted = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return omittedDates.filter(od => {
      const date = new Date(od.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }).length;
  };

  // Calculate upcoming special meetings
  const upcomingSpecial = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return specialMeetings.filter(sm => {
      const date = new Date(sm.date);
      date.setHours(0, 0, 0, 0);
      return date >= today;
    }).length;
  };

  // Calculate statistics
  const getScheduleStats = () => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return null;
    }

    const stats = {
      totalMeetings: schedule.meetings.length,
      dateRange: getDateRangeString(schedule.startDate, schedule.endDate),
      conflicts: schedule.conflicts?.length || 0,
      personStats: [],
      roleStats: []
    };

    // Person statistics
    const personMap = new Map();
    people.forEach(person => {
      personMap.set(person.id, {
        name: person.name,
        totalAssignments: 0,
        assignmentsByRole: {},
        lastAssigned: null
      });
    });

    // Count assignments from schedule
    schedule.meetings.forEach(meeting => {
      Object.entries(meeting.duties).forEach(([roleId, duty]) => {
        if (duty.personId) {
          const personStat = personMap.get(duty.personId);
          if (personStat) {
            personStat.totalAssignments++;
            personStat.assignmentsByRole[roleId] = (personStat.assignmentsByRole[roleId] || 0) + 1;

            // Update last assigned
            if (!personStat.lastAssigned || new Date(meeting.date) > new Date(personStat.lastAssigned)) {
              personStat.lastAssigned = meeting.date;
            }
          }
        }
      });
    });

    stats.personStats = Array.from(personMap.values())
      .filter(p => p.totalAssignments > 0)
      .sort((a, b) => b.totalAssignments - a.totalAssignments);

    // Role statistics
    roles.forEach(role => {
      const assignments = [];
      schedule.meetings.forEach(meeting => {
        const duty = meeting.duties[role.id];
        if (duty?.personId) {
          assignments.push(duty.personId);
        }
      });

      const uniquePeople = new Set(assignments);
      const avgAssignments = assignments.length / (uniquePeople.size || 1);

      stats.roleStats.push({
        roleId: role.id,
        roleName: role.name,
        totalAssignments: assignments.length,
        peopleUsed: uniquePeople.size,
        avgAssignmentsPerPerson: avgAssignments.toFixed(1)
      });
    });

    return stats;
  };

  const stats = getScheduleStats();

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Unknown';
  };

  const filteredPeople = stats?.personStats.filter(person => {
    if (selectedRole === 'all') return true;
    return person.assignmentsByRole[selectedRole] > 0;
  }) || [];

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-blue-400">{people.length}</div>
          <div className="text-sm text-gray-400 mt-1">Total People</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-green-400">{roles.length}</div>
          <div className="text-sm text-gray-400 mt-1">Roles</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-purple-400">
            {schedule ? schedule.meetings.length : 0}
          </div>
          <div className="text-sm text-gray-400 mt-1">Scheduled Meetings</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-3xl font-bold text-orange-400">
            {stats?.conflicts || 0}
          </div>
          <div className="text-sm text-gray-400 mt-1">Conflicts</div>
        </div>
      </div>

      {/* Meeting Customisation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-2xl font-bold text-indigo-400">
            {settings.meetingDays.midweek} / {settings.meetingDays.weekend}
          </div>
          <div className="text-sm text-gray-400 mt-1">Meeting Pattern</div>
          {settings.meetingDays.locked && (
            <div className="text-xs text-gray-500 mt-1">🔒 Locked</div>
          )}
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-2xl font-bold text-yellow-400">{upcomingOmitted()}</div>
          <div className="text-sm text-gray-400 mt-1">Upcoming Omitted Meetings</div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:shadow-lg transition-shadow">
          <div className="text-2xl font-bold text-teal-400">{upcomingSpecial()}</div>
          <div className="text-sm text-gray-400 mt-1">Upcoming Special Meetings</div>
        </div>
      </div>

      {/* Schedule Info */}
      {stats && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Schedule Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Date Range:</span>
              <span className="ml-2 font-medium text-gray-200">{stats.dateRange}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Meetings:</span>
              <span className="ml-2 font-medium text-gray-200">{stats.totalMeetings}</span>
            </div>
          </div>
        </div>
      )}

      {/* Role Statistics */}
      {stats && stats.roleStats.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <h3 className="text-lg font-semibold text-white mb-3">Role Statistics</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Assignments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">People Used</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Avg per Person</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {stats.roleStats.map(role => (
                  <tr key={role.roleId} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-200">{role.roleName}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{role.totalAssignments}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{role.peopleUsed}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{role.avgAssignmentsPerPerson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Person Statistics */}
      {stats && stats.personStats.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-semibold text-white">Person Statistics</h3>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="bg-gray-700 border border-gray-600 text-white rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="all">All Roles</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-700">
              <thead className="bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Name</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Total Assignments</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Last Assigned</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">By Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPeople.map((person, index) => (
                  <tr key={index} className="hover:bg-gray-750 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-200">{person.name}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">{person.totalAssignments}</td>
                    <td className="px-4 py-3 text-sm text-right text-gray-300">
                      {person.lastAssigned ? formatDate(person.lastAssigned) : '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(person.assignmentsByRole).map(([roleId, count]) => (
                          <span
                            key={roleId}
                            className="px-2 py-0.5 bg-purple-600 text-purple-100 rounded text-xs"
                          >
                            {getRoleName(roleId)}: {count}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No Schedule Message */}
      {!stats && (
        <div className="bg-gray-800 border border-gray-700 p-8 rounded-lg text-center">
          <p className="text-gray-400">No schedule generated yet. Go to the Schedule page to create one.</p>
        </div>
      )}

      {/* localStorage backup warning */}
      <div className="mt-6 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-400">Data Storage Notice</h3>
            <p className="mt-1 text-sm text-yellow-300">
              localStorage is backup only. Download JSON from Import/Export for permanent storage.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
