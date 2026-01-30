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
    Globe,
    Calculator
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

    const [gymProfile, setGymProfile] = useState(() => {
        const saved = localStorage.getItem('gymProfile');
        return saved ? JSON.parse(saved) : {
            name: 'Epic Gym Academy',
            phone: '+20 123 456 7890',
            address: 'Cairo, Egypt',
        };
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchRole();

        const handleProfileUpdate = () => {
            const saved = localStorage.getItem('gymProfile');
            if (saved) {
                setGymProfile(JSON.parse(saved));
            }
        };

        window.addEventListener('gymProfileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('gymProfileUpdated', handleProfileUpdate);
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
        { to: '/calculator', icon: Calculator, label: t('common.calculator'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/settings', icon: Settings, label: t('common.settings'), roles: ['admin'] },
        { to: '/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
    ];

    // Force show all items for debugging
    const navItems = allNavItems;
    // const navItems = allNavItems.filter(item => role && item.roles.includes(role));

    return (
        <div className="min-h-screen bg-gray-50 flex flex-row">
            {/* FORCE VISIBLE SIDEBAR */}
            <aside className="w-64 bg-secondary text-white flex-shrink-0 h-screen overflow-y-auto fixed left-0 top-0 z-50 flex flex-col">
                <div className="flex flex-col items-center justify-center pt-8 pb-6 bg-secondary/80 border-b border-white/10 px-4">
                    <img src="/logo.png" alt="Epic Gym Logo" className="h-24 w-auto object-contain drop-shadow-xl mb-4 transition-transform hover:scale-105" />

                    {/* INSTAGRAM STYLE BIO */}
                    <div className="text-center w-fullanimate-in fade-in slide-in-from-top-2">
                        <h2 className="font-bold text-lg tracking-wide">{gymProfile.name}</h2>
                        <div className="text-xs text-gray-300 mt-1 font-medium space-y-0.5">
                            <p>{gymProfile.address}</p>
                            <p dir="ltr" className="opacity-80">{gymProfile.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-2 bg-white/5 mx-4 mt-6 rounded text-xs text-center uppercase tracking-wider text-gray-400">
                    {role || 'Loading...'}
                </div>

                <nav className="mt-4 px-4 space-y-2 flex-grow">
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

                <div className="p-4 border-t border-white/10 space-y-2">
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
                {/* Header Title REMOVED as per request */}
                <header className="mb-8 flex justify-end items-center">
                    <div className="text-xs font-mono opacity-30">v1.0.0</div>
                </header>

                <main>
                    <Outlet context={{ role }} />
                </main>
            </div>
        </div>
    );
}
