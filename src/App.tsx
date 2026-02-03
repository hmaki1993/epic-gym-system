import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DashboardLayout from './layouts/DashboardLayout';
import Students from './pages/Students';
import StudentDetails from './pages/StudentDetails';
import Coaches from './pages/Coaches';
import CoachDetails from './pages/CoachDetails';
import Finance from './pages/Finance';
import Dashboard from './pages/Dashboard';
import Schedule from './pages/Schedule';
import Settings from './pages/Settings';
import Calculator from './pages/Calculator';
import Login from './pages/Login';
import Register from './pages/Register';
import PublicRegistration from './pages/PublicRegistration';
import ProtectedRoute from './components/ProtectedRoute';
import AdminCameras from './pages/AdminCameras';


import { initializeTheme } from './utils/theme';
import { CurrencyProvider } from './context/CurrencyContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  console.log('App: Rendering component');
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n) {
      document.dir = i18n.dir();
      document.documentElement.lang = i18n.language;
    }
  }, [i18n, i18n?.language]);



  return (
    <CurrencyProvider>
      <ThemeProvider>
        <BrowserRouter>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'var(--color-surface)',
                color: 'inherit', // Uses body color which adapts to theme
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                border: '1px solid rgba(128,128,128,0.1)',
                borderRadius: '12px',
                padding: '16px',
                fontSize: '15px',
                fontWeight: '500',
              },
              success: {
                iconTheme: {
                  primary: 'var(--color-primary)',
                  secondary: 'var(--color-surface)',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: 'var(--color-surface)',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/registration" element={<PublicRegistration />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<DashboardLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="students" element={<Students />} />
                <Route path="students/:id" element={<StudentDetails />} />
                <Route path="coaches" element={<Coaches />} />
                <Route path="coaches/:id" element={<CoachDetails />} />
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
      </ThemeProvider>
    </CurrencyProvider>
  )
}

export default App;
