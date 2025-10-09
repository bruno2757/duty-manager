import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './contexts/AppContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Roles from './pages/Roles';
import Availability from './pages/Availability';
import ImportExport from './pages/ImportExport';
import SettingsPage from './pages/settings/SettingsPage';
import OmittedMeetingsPage from './pages/meetingCustomisation/OmittedMeetingsPage';
import SpecialMeetingsPage from './pages/meetingCustomisation/SpecialMeetingsPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter basename="/duty">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="roles" element={<Roles />} />
            <Route path="availability" element={<Availability />} />
            <Route path="omitted-meetings" element={<OmittedMeetingsPage />} />
            <Route path="special-meetings" element={<SpecialMeetingsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="import-export" element={<ImportExport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
