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

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        document.dir = i18n.dir();
    }, [i18n, i18n.language]);


    const fetchRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single();
                setRole(data?.role || 'admin');
            } else {
                // If no user is found (e.g. session invalid), fallback or redirect.
                // For now, logging and setting a default ensures UI doesn't freeze.
                console.warn('No user found in DashboardLayout');
                setRole('admin');
            }
        } catch (error) {
            console.error('Error fetching role:', error);
            setRole('admin'); // Fallback to ensure UI renders
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRole();
    }, []);

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

    // Force show all items for debugging
    const navItems = allNavItems;
    // const navItems = allNavItems.filter(item => role && item.roles.includes(role));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">
            {/* FORCE VISIBLE SIDEBAR */}
            <aside className="w-64 bg-secondary text-white flex-shrink-0 h-screen overflow-y-auto fixed left-0 top-0 z-50">
                <div className="flex items-center justify-center h-20 bg-secondary/80 border-b border-white/10 px-4">
                    <img src="/logo_epic.png" alt="Epic Gym Logo" className="h-14 w-auto object-contain drop-shadow-lg" />
                </div>

                <div className="px-4 py-2 bg-white/5 mx-4 mt-4 rounded text-xs text-center uppercase tracking-wider text-gray-400">
                    User Role: {role || 'Loading...'}
                </div>

                <nav className="mt-4 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to;

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-primary text-white shadow-lg'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <Icon className="w-5 h-5 mr-3" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 mt-auto border-t border-white/10 space-y-2">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm font-medium text-red-400 rounded-lg hover:bg-white/5 hover:text-red-300"
                    >
                        <LogOut className="w-5 h-5 mr-3" />
                        {t('common.logout')}
                    </button>
                </div>
            </aside>

            {/* Main Content with Left Padding for Sidebar */}
            <div className="flex-1 min-w-0 ml-64 p-8">
                <header className="mb-8 flex justify-between items-center">
                    <h1 className="text-2xl font-bold text-gray-800">Epic Gym Academy</h1>
                    <div className="text-sm text-gray-500">v1.0.0</div>
                </header>

                <main>
                    <Outlet context={{ role }} />
                </main>
            </div>
        </div>
    );
}
