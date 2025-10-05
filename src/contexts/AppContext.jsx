import { createContext, useContext, useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { createSettings } from '../data/models';

const AppContext = createContext();

/**
 * Migrate data from old versions to current version
 */
function migrateData(data) {
  const migrated = { ...data };

  // Check version
  if (!migrated.version || migrated.version < "2.0") {
    // Add default settings
    if (!migrated.settings) {
      migrated.settings = createSettings();
      // Lock if schedule exists
      if (migrated.schedule?.meetings?.length > 0) {
        migrated.settings.meetingDays.locked = true;
      }
    }

    // Initialize omitted dates
    if (!migrated.omittedDates) {
      migrated.omittedDates = [];
    }

    // Initialize special meetings
    if (!migrated.specialMeetings) {
      migrated.specialMeetings = [];
    }

    migrated.version = "2.0";
  }

  return migrated;
}

export function AppProvider({ children }) {
  const [people, setPeople] = useState([]);
  const [roles, setRoles] = useState([]);
  const [schedule, setSchedule] = useState(null);
  const [cancelledDates, setCancelledDates] = useState([]);
  const [settings, setSettings] = useState(createSettings());
  const [omittedDates, setOmittedDates] = useState([]);
  const [specialMeetings, setSpecialMeetings] = useState([]);

  // Initialize data on mount
  useEffect(() => {
    // Try to load from localStorage
    const savedData = localStorage.getItem('dutyManagerData');

    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);

        // Migrate old data if needed
        const migrated = migrateData(parsed);

        setPeople(migrated.people || []);
        setRoles(migrated.roles || []);
        setSchedule(migrated.schedule || null);
        setCancelledDates(migrated.cancelledDates || []);
        setSettings(migrated.settings || createSettings());
        setOmittedDates(migrated.omittedDates || []);
        setSpecialMeetings(migrated.specialMeetings || []);

        // Auto-cleanup past omitted dates
        cleanupPastOmittedDates(migrated.omittedDates || []);
      } catch (error) {
        console.error('Error loading saved data:', error);
        // Start with empty data if localStorage is corrupted
        setPeople([]);
        setRoles([]);
        setSchedule(null);
        setCancelledDates([]);
        setSettings(createSettings());
        setOmittedDates([]);
        setSpecialMeetings([]);
      }
    }
    // If no saved data, start with empty arrays (no automatic initial load)
  }, []);

  // Auto-save to localStorage every time data changes (but only if we have data)
  useEffect(() => {
    if (people.length > 0 || roles.length > 0) {
      const dataToSave = {
        version: "2.0",
        people,
        roles,
        schedule,
        cancelledDates,
        settings,
        omittedDates,
        specialMeetings,
        lastSaved: new Date().toISOString()
      };

      localStorage.setItem('dutyManagerData', JSON.stringify(dataToSave));
    }
  }, [people, roles, schedule, cancelledDates, settings, omittedDates, specialMeetings]);

  // Auto-cleanup past omitted dates
  const cleanupPastOmittedDates = (dates) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updated = dates.filter(od => {
      const omittedDate = new Date(od.date);
      omittedDate.setHours(0, 0, 0, 0);
      return omittedDate >= today;
    });

    const removedCount = dates.length - updated.length;

    if (removedCount > 0) {
      setOmittedDates(updated);
      // Note: You could add a toast notification here
      console.log(`Removed ${removedCount} past omitted date(s)`);
    }
  };

  // Load data from JSON file
  const loadFromJSON = (jsonData) => {
    const migrated = migrateData(jsonData);
    setPeople(migrated.people || []);
    setRoles(migrated.roles || []);
    setSchedule(migrated.schedule || null);
    setCancelledDates(migrated.cancelledDates || []);
    setSettings(migrated.settings || createSettings());
    setOmittedDates(migrated.omittedDates || []);
    setSpecialMeetings(migrated.specialMeetings || []);
  };

  // Get current state for export
  const getStateForExport = () => {
    return {
      version: "2.0",
      people,
      roles,
      schedule,
      cancelledDates,
      settings,
      omittedDates,
      specialMeetings,
      exportedAt: new Date().toISOString()
    };
  };

  // Clear all data to empty state
  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear ALL data? This will remove everything (people, roles, schedules). This cannot be undone.')) {
      setPeople([]);
      setRoles([]);
      setSchedule(null);
      setCancelledDates([]);
      setSettings(createSettings());
      setOmittedDates([]);
      setSpecialMeetings([]);
      localStorage.removeItem('dutyManagerData');
    }
  };

  // Settings CRUD
  const updateMeetingDays = (midweek, weekend) => {
    if (settings.meetingDays.locked && schedule?.meetings?.length > 0) {
      alert('Cannot change meeting days while schedule exists. Clear schedule first.');
      return false;
    }
    setSettings({
      ...settings,
      meetingDays: {
        ...settings.meetingDays,
        midweek,
        weekend
      }
    });
    return true;
  };

  const lockMeetingDays = () => {
    setSettings({
      ...settings,
      meetingDays: {
        ...settings.meetingDays,
        locked: true
      }
    });
  };

  // Role Order Management
  const updateRoleOrder = (newOrder) => {
    setSettings({
      ...settings,
      roleOrder: newOrder
    });
  };

  const initializeRoleOrder = () => {
    if (!settings.roleOrder || settings.roleOrder.length === 0) {
      if (roles.length > 0) {
        const defaultOrder = roles.map(r => r.id);
        updateRoleOrder(defaultOrder);
      }
    }
  };

  // Initialize roleOrder when roles are loaded
  useEffect(() => {
    if (roles.length > 0 && (!settings.roleOrder || settings.roleOrder.length === 0)) {
      const defaultOrder = roles.map(r => r.id);
      setSettings(prev => ({
        ...prev,
        roleOrder: defaultOrder
      }));
    }
  }, [roles.length]); // Only run when roles length changes

  // Omitted Dates CRUD
  const addOmittedDate = (date, comment = '', showOnSchedule = false) => {
    const newOmittedDate = {
      id: Date.now().toString(),
      date: new Date(date),
      comment,
      showOnSchedule
    };
    setOmittedDates([...omittedDates, newOmittedDate]);
    return newOmittedDate;
  };

  const updateOmittedDate = (id, updates) => {
    setOmittedDates(omittedDates.map(od =>
      od.id === id ? { ...od, ...updates } : od
    ));
  };

  const deleteOmittedDate = (id) => {
    setOmittedDates(omittedDates.filter(od => od.id !== id));
  };

  const isDateOmitted = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return omittedDates.some(od => {
      const omittedDate = new Date(od.date);
      omittedDate.setHours(0, 0, 0, 0);
      return omittedDate.getTime() === checkDate.getTime();
    });
  };

  // Special Meetings CRUD
  const addSpecialMeeting = (date, comment) => {
    const newSpecialMeeting = {
      id: Date.now().toString(),
      date: new Date(date),
      comment,
      duties: {}
    };
    setSpecialMeetings([...specialMeetings, newSpecialMeeting]);
    return newSpecialMeeting;
  };

  const updateSpecialMeeting = (id, updates) => {
    setSpecialMeetings(specialMeetings.map(sm =>
      sm.id === id ? { ...sm, ...updates } : sm
    ));
  };

  const deleteSpecialMeeting = (id) => {
    setSpecialMeetings(specialMeetings.filter(sm => sm.id !== id));
  };

  const findSpecialMeetingByDate = (date) => {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return specialMeetings.find(sm => {
      const smDate = new Date(sm.date);
      smDate.setHours(0, 0, 0, 0);
      return smDate.getTime() === checkDate.getTime();
    });
  };

  // Delete last X meetings from schedule
  const deleteLastMeetings = (count) => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return false;
    }

    const numToDelete = parseInt(count, 10);
    if (isNaN(numToDelete) || numToDelete < 1 || numToDelete > schedule.meetings.length) {
      return false;
    }

    setSchedule(prevSchedule => {
      const remainingMeetings = prevSchedule.meetings.slice(0, -numToDelete);

      // If no meetings remain, return null schedule
      if (remainingMeetings.length === 0) {
        return null;
      }

      // Renumber meetings sequentially
      const renumberedMeetings = remainingMeetings.map((meeting, index) => ({
        ...meeting,
        meetingNo: index + 1
      }));

      return {
        ...prevSchedule,
        meetings: renumberedMeetings,
        endDate: renumberedMeetings[renumberedMeetings.length - 1].date
      };
    });

    return true;
  };

  // Clear all historic (past) meetings from schedule
  const clearHistoricMeetings = () => {
    if (!schedule || !schedule.meetings || schedule.meetings.length === 0) {
      return { success: false, historicCount: 0, futureCount: 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Separate historic and future meetings
    const historicMeetings = schedule.meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate < today;
    });

    const futureMeetings = schedule.meetings.filter(meeting => {
      const meetingDate = new Date(meeting.date);
      meetingDate.setHours(0, 0, 0, 0);
      return meetingDate >= today;
    });

    // If no historic meetings, nothing to do
    if (historicMeetings.length === 0) {
      return { success: false, historicCount: 0, futureCount: futureMeetings.length };
    }

    setSchedule(prevSchedule => {
      // If no future meetings remain, return null schedule
      if (futureMeetings.length === 0) {
        return null;
      }

      // Renumber meetings sequentially
      const renumberedMeetings = futureMeetings.map((meeting, index) => ({
        ...meeting,
        meetingNo: index + 1
      }));

      return {
        ...prevSchedule,
        meetings: renumberedMeetings,
        startDate: renumberedMeetings[0].date
        // endDate stays the same (last meeting date)
      };
    });

    return {
      success: true,
      historicCount: historicMeetings.length,
      futureCount: futureMeetings.length
    };
  };

  const value = {
    people,
    setPeople,
    roles,
    setRoles,
    schedule,
    setSchedule,
    cancelledDates,
    setCancelledDates,
    settings,
    setSettings,
    omittedDates,
    setOmittedDates,
    specialMeetings,
    setSpecialMeetings,
    loadFromJSON,
    getStateForExport,
    clearAllData,
    updateMeetingDays,
    lockMeetingDays,
    updateRoleOrder,
    initializeRoleOrder,
    addOmittedDate,
    updateOmittedDate,
    deleteOmittedDate,
    isDateOmitted,
    addSpecialMeeting,
    updateSpecialMeeting,
    deleteSpecialMeeting,
    findSpecialMeetingByDate,
    deleteLastMeetings,
    clearHistoricMeetings
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

AppProvider.propTypes = {
  children: PropTypes.node.isRequired
};

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
