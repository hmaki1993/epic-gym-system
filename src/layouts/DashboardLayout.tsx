import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    Calendar,
    Wallet,
    Settings,
    Video,
    LogOut,
    Menu,
    Globe
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AdminAssistant from '../components/AdminAssistant';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        document.dir = i18n.dir();
    }, [i18n.language]);

    useEffect(() => {
        fetchRole();
    }, []);

    const fetchRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
            setRole(data?.role || 'coach');
        }
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ar' : 'en';
        i18n.changeLanguage(newLang);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const allNavItems = [
        { to: '/', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/students', icon: Users, label: t('common.students'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/coaches', icon: GraduationCap, label: t('common.coaches'), roles: ['admin', 'head_coach'] },
        { to: '/schedule', icon: Calendar, label: t('common.schedule'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/finance', icon: Wallet, label: t('common.finance'), roles: ['admin'] },
        { to: '/settings', icon: Settings, label: t('common.settings'), roles: ['admin'] },
        { to: '/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
    ];

    const navItems = allNavItems.filter(item => role && item.roles.includes(role));

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 start-0 z-50 w-64 bg-secondary text-white transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : 'ltr:-translate-x-full rtl:translate-x-full'
                }`}>
                <div className="flex items-center justify-center h-20 bg-secondary/80 border-b border-white/10 px-4">
                    <img src="/logo_epic.png" alt="Epic Gym Logo" className="h-14 w-auto object-contain drop-shadow-lg" />
                </div>

                <div className="px-4 py-2 bg-white/5 mx-4 mt-4 rounded text-xs text-center uppercase tracking-wider text-gray-400">
                    M/ Mohamed
                </div>

                <nav className="mt-4 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to;

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/30 ltr:translate-x-1 rtl:-translate-x-1'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ltr:mr-3 rtl:ml-3 ${isActive ? 'animate-pulse' : ''}`} />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-white/10 space-y-2 lg:absolute lg:bottom-0 lg:w-64">
                    <button
                        onClick={toggleLanguage}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-gray-300 rounded-lg hover:bg-white/10 hover:text-white"
                    >
                        <Globe className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                        {i18n.language === 'en' ? 'العربية' : 'English'}
                    </button>
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-white/5 hover:text-red-300"
                    >
                        <LogOut className="w-5 h-5 ltr:mr-3 rtl:ml-3" />
                        {t('common.logout')}
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="lg:hidden p-2 text-gray-400 hover:text-gray-600"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center space-x-4 rtl:space-x-reverse">
                        {/* Header Content (User Profile etc) */}

                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4 lg:p-8">
                    <Outlet context={{ role }} />
                </main>

                {role === 'admin' && <AdminAssistant />}
            </div>
        </div>
    );
}
