import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from './layouts/DashboardLayout';
import Students from './pages/Students';
import Coaches from './pages/Coaches';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import AdminCameras from './pages/AdminCameras';

function App() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.dir = i18n.dir();
    document.documentElement.lang = i18n.language;
  }, [i18n, i18n.language]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="coaches" element={<Coaches />} />
            <Route path="finance" element={<Finance />} />
            <Route path="calculator" element={<Calculator />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin/cameras" element={<AdminCameras />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App;
