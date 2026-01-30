import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    Medal,
    Calendar,
    DollarSign,
    Settings,
    Video,
    LogOut,
    Menu,
    Globe,
    Calculator,
    X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [roleLoading, setRoleLoading] = useState(true);

    useEffect(() => {
        document.dir = i18n.dir();
    }, [i18n, i18n.language]);


    const fetchRole = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get role from user metadata (set during registration)
                const userRole = user.user_metadata?.role || 'admin';
                setRole(userRole);
            } else {
                console.warn('No user found in DashboardLayout');
                setRole('admin');
            }
        } catch (error) {
            console.error('Error fetching role:', error);
            setRole('admin'); // Fallback to ensure UI renders
        } finally {
            setRoleLoading(false);
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

    // Role-based navigation items
    const allNavItems = [
        { to: '/', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/students', icon: Users, label: t('common.students'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/coaches', icon: Medal, label: t('common.coaches'), roles: ['admin', 'head_coach'] },
        { to: '/schedule', icon: Calendar, label: t('common.schedule'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/finance', icon: DollarSign, label: t('common.finance'), roles: ['admin'] },
        { to: '/calculator', icon: Calculator, label: t('common.calculator'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
    ];

    // Filter navigation based on role
    const navItems = allNavItems.filter(item => role && item.roles.includes(role));

    const isRtl = i18n.dir() === 'rtl';

    // Show loading spinner while role is being fetched
    if (roleLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600">{t('common.loading')}...</p>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-gray-50 flex overflow-x-hidden"
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`
                    fixed inset-y-0 z-50 transition-transform duration-300 ease-in-out
                    w-64 bg-secondary text-white flex flex-col border-white/5 shadow-2xl lg:shadow-none
                    lg:relative lg:translate-x-0
                    ${sidebarOpen
                        ? 'translate-x-0'
                        : (isRtl ? 'translate-x-full' : '-translate-x-full')
                    }
                    ${isRtl ? 'right-0' : 'left-0'}
                `}
            >
                <div className="flex flex-col items-center justify-center pt-10 pb-6 bg-secondary/80 border-b border-white/10 px-4 relative">
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="lg:hidden absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full text-white/70"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    <img src="/logo.png" alt="Epic Gym Logo" className="h-20 w-auto object-contain drop-shadow-xl mb-4 transition-transform hover:scale-105" />

                    <div className="text-center w-full">
                        <h2 className="font-bold text-lg tracking-wide">{gymProfile.name}</h2>
                        <div className="text-xs text-gray-300 mt-1 font-medium space-y-0.5">
                            <p>{gymProfile.address}</p>
                            <p dir="ltr" className="opacity-80">{gymProfile.phone}</p>
                        </div>
                    </div>
                </div>

                <div className="px-4 py-2 bg-white/5 mx-4 mt-6 rounded text-xs text-center uppercase tracking-wider text-gray-400">
                    {role || t('common.loading')}
                </div>

                <nav className="mt-4 px-4 space-y-2 flex-grow overflow-y-auto custom-scrollbar">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.to;

                        return (
                            <Link
                                key={item.to}
                                to={item.to}
                                onClick={() => setSidebarOpen(false)}
                                className={`flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isActive
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20'
                                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                                    }`}
                            >
                                <Icon className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
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
                        <LogOut className={`w-5 h-5 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                        {t('common.logout')}
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen">
                <header className="h-16 flex items-center justify-between px-4 sm:px-8 border-b border-gray-100 bg-white sticky top-0 z-30 w-full flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <Menu className="w-6 h-6" />
                        </button>
                        <h1 className="text-lg font-bold text-secondary lg:hidden line-clamp-1">
                            {navItems.find(item => item.to === location.pathname)?.label || 'Epic Gym'}
                        </h1>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={toggleLanguage}
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                        >
                            <Globe className="w-4 h-4 text-primary" />
                            <span>{i18n.language === 'en' ? 'العربية' : 'English'}</span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
                    <Outlet context={{ role }} />
                </main>
            </div>
        </div>
    );
}
