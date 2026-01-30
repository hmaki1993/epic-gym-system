import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
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

  const applyThemeStyles = (themeId: string) => {
    try {
      const root = document.documentElement;

      if (themeId === 'dark') {
        root.style.setProperty('--color-primary', '#6366f1');
        root.style.setProperty('--color-primary-foreground', '#ffffff');
        root.style.setProperty('--color-secondary', '#1e293b');
        root.style.setProperty('--color-background', '#0f172a');
        root.style.setProperty('--color-surface', '#1e293b');
        root.style.setProperty('color', '#f8fafc');
      } else if (themeId === 'forest') {
        root.style.setProperty('--color-primary', '#10b981');
        root.style.setProperty('--color-secondary', '#064e3b');
        root.style.setProperty('--color-background', '#ecfdf5');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('color', '#1f2937');
      } else if (themeId === 'royal') {
        root.style.setProperty('--color-primary', '#d97706');
        root.style.setProperty('--color-secondary', '#581c87');
        root.style.setProperty('--color-background', '#faf5ff');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('color', '#1f2937');
      } else if (themeId === 'berry') {
        root.style.setProperty('--color-primary', '#db2777');
        root.style.setProperty('--color-secondary', '#881337');
        root.style.setProperty('--color-background', '#fdf2f8');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('color', '#1f2937');
      } else if (themeId === 'nature') {
        root.style.setProperty('--color-primary', '#65a30d');
        root.style.setProperty('--color-secondary', '#1a2e05');
        root.style.setProperty('--color-background', '#f7fee7');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('color', '#1f2937');
      } else if (themeId === 'ember') {
        root.style.setProperty('--color-primary', '#ea580c');
        root.style.setProperty('--color-secondary', '#431407');
        root.style.setProperty('--color-background', '#fff7ed');
        root.style.setProperty('--color-surface', '#ffffff');
        root.style.setProperty('color', '#1f2937');
      } else {
        // Default (Reset)
        root.style.removeProperty('--color-primary');
        root.style.removeProperty('--color-secondary');
        root.style.removeProperty('--color-background');
        root.style.removeProperty('--color-surface');
        root.style.removeProperty('color');
      }
    } catch (e) {
      console.error('Error applying theme:', e);
    }
  };

  useEffect(() => {
    if (i18n) {
      document.dir = i18n.dir();
      document.documentElement.lang = i18n.language;
    }
  }, [i18n, i18n?.language]);

  // Theme Restoration Logic
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to Midnight (dark)
      applyThemeStyles(savedTheme);
    } catch (error) {
      console.error('Failed to load theme:', error);
      applyThemeStyles('dark'); // Fallback
    }
  }, []);

  return (
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
