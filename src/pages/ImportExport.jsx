import { useRef, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  importRolesFromCSV,
  importAvailabilityFromCSV,
  exportScheduleToCSV,
  exportScheduleToPDF,
  cleanupDuplicateAvailability
} from '../utils/importExport';

export default function ImportExport() {
  const { people, setPeople, roles, setRoles, schedule, getStateForExport, loadFromJSON, clearAllData } = useApp();
  const jsonFileInputRef = useRef(null);
  const rolesFileInputRef = useRef(null);
  const availabilityFileInputRef = useRef(null);
  const [message, setMessage] = useState(null);

  const handleDownloadJSON = () => {
    const data = getStateForExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `duty-manager-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleUploadJSON = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        loadFromJSON(data);
        setMessage({ type: 'success', text: 'Data loaded successfully!' });
      } catch (error) {
        setMessage({ type: 'error', text: 'Error loading file: ' + error.message });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleImportRoles = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await importRolesFromCSV(file, people, roles, setPeople, setRoles);

      let messageText = `Updated ${result.updated} people with role assignments.`;

      if (result.peopleCreated > 0) {
        messageText += `\n\nCreated ${result.peopleCreated} new people.`;
      }

      if (result.rolesCreated > 0) {
        messageText += `\n\nCreated ${result.rolesCreated} new roles.`;
      }

      setMessage({
        type: 'success',
        text: messageText
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error importing roles: ' + error.message });
    }

    event.target.value = '';
  };

  const handleImportAvailability = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const result = await importAvailabilityFromCSV(file, people, setPeople);

      let messageText = `Added ${result.blocksAdded} availability blocks for ${result.peopleUpdated} people.`;

      if (result.unmatchedPeople.length > 0) {
        messageText += `\n\nUnmatched people: ${result.unmatchedPeople.join(', ')}`;
      }

      if (result.errors.length > 0) {
        messageText += `\n\nErrors: ${result.errors.join('; ')}`;
      }

      setMessage({
        type: result.unmatchedPeople.length > 0 || result.errors.length > 0 ? 'warning' : 'success',
        text: messageText
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error importing availability: ' + error.message });
    }

    event.target.value = '';
  };

  const handleExportCSV = () => {
    try {
      exportScheduleToCSV(schedule, roles, people);
      setMessage({ type: 'success', text: 'Schedule exported to CSV successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error exporting CSV: ' + error.message });
    }
  };

  const handleExportPDF = () => {
    try {
      exportScheduleToPDF(schedule, roles, people);
      setMessage({ type: 'success', text: 'Schedule exported to PDF successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error exporting PDF: ' + error.message });
    }
  };

  const handleCleanupDuplicates = () => {
    try {
      const result = cleanupDuplicateAvailability(people);
      setPeople([...people]); // Trigger state update
      setMessage({
        type: result.removed > 0 ? 'success' : 'warning',
        text: result.removed > 0 ? result.message : 'No duplicate availability blocks found'
      });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error cleaning up duplicates: ' + error.message });
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-white mb-6">Import/Export</h2>

      {/* Message Area */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg border ${
          message.type === 'success' ? 'bg-green-900 bg-opacity-20 border-green-700' :
          message.type === 'warning' ? 'bg-yellow-900 bg-opacity-20 border-yellow-700' :
          'bg-red-900 bg-opacity-20 border-red-700'
        }`}>
          <p className={`text-sm whitespace-pre-line ${
            message.type === 'success' ? 'text-green-300' :
            message.type === 'warning' ? 'text-yellow-300' :
            'text-red-300'
          }`}>
            {message.text}
          </p>
          <button
            onClick={() => setMessage(null)}
            className="mt-2 text-sm underline text-gray-300 hover:text-white"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="space-y-6">
        {/* JSON Save/Load */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">JSON Data</h3>
          <p className="text-gray-300 mb-4">
            Save your data as a JSON file for backup or transfer between computers.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleDownloadJSON}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Download JSON
            </button>

            <button
              onClick={() => jsonFileInputRef.current.click()}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Upload JSON
            </button>

            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              onChange={handleUploadJSON}
              className="hidden"
            />
          </div>
        </div>

        {/* CSV Import Section */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Import from CSV</h3>

          {/* Import Roles */}
          <div className="mb-6">
            <h4 className="font-medium text-white mb-2">Import Roles</h4>
            <p className="text-sm text-gray-400 mb-3">
              Format: Name, Roles (comma-separated)
            </p>
            <button
              onClick={() => rolesFileInputRef.current.click()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Choose Roles CSV
            </button>
            <input
              ref={rolesFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportRoles}
              className="hidden"
            />
          </div>

          {/* Import Availability */}
          <div>
            <h4 className="font-medium text-white mb-2">Import Availability</h4>
            <p className="text-sm text-gray-400 mb-3">
              Format: Name, Start Date, End Date, Reason
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => availabilityFileInputRef.current.click()}
                className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
              >
                Choose Availability CSV
              </button>
              <button
                onClick={handleCleanupDuplicates}
                className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
              >
                Clean Up Duplicates
              </button>
            </div>
            <input
              ref={availabilityFileInputRef}
              type="file"
              accept=".csv"
              onChange={handleImportAvailability}
              className="hidden"
            />
          </div>
        </div>

        {/* Export Schedule Section */}
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4">Export Schedule</h3>
          <p className="text-gray-300 mb-4">
            Export your current schedule to CSV or PDF format.
          </p>

          <div className="flex gap-3">
            <button
              onClick={handleExportCSV}
              disabled={!schedule || !schedule.meetings || schedule.meetings.length === 0}
              className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Export to CSV
            </button>

            <button
              onClick={handleExportPDF}
              disabled={!schedule || !schedule.meetings || schedule.meetings.length === 0}
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
            >
              Export to PDF
            </button>
          </div>

          {(!schedule || !schedule.meetings || schedule.meetings.length === 0) && (
            <p className="text-sm text-gray-400 mt-2">
              Generate a schedule first to enable export
            </p>
          )}
        </div>

        {/* Clear Data */}
        <div className="bg-gray-800 p-6 rounded-lg border-2 border-red-700">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Danger Zone</h3>
          <p className="text-gray-300 mb-4">
            Remove everything (people, roles, schedules). Use this before importing your own data from CSV.
          </p>
          <button
            onClick={clearAllData}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}
