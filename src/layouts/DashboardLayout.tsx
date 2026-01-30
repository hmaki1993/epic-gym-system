import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
    LayoutDashboard,
    Users,
    UserCircle,
    Calendar,
    Wallet,
    Settings,
    Video,
    Menu,
    X,
    LogOut,
    Wrench,
    Building2,
    Search,
    Bell,
    ChevronDown
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [role, setRole] = useState<string | null>(null);
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<{ id: string, name: string, type: 'student' | 'coach' }[]>([]);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';
    const [gymProfile, setGymProfile] = useState(() => {
        try {
            const saved = localStorage.getItem('gymProfile');
            return saved ? JSON.parse(saved) : {
                name: 'Epic Gym Academy',
                phone: '+20 123 456 7890',
                address: 'Cairo, Egypt',
            };
        } catch (e) {
            return {
                name: 'Epic Gym Academy',
                phone: '+20 123 456 7890',
                address: 'Cairo, Egypt',
            };
        }
    });

    // Mock notifications for premium feel
    const notifications = [
        { id: 1, title: 'New Student', message: 'Ahmed Ali just registered', time: '5m ago', icon: Users, color: 'text-primary' },
        { id: 2, title: 'Payment Received', message: 'Monthly subscription from Sara', time: '2h ago', icon: Wallet, color: 'text-emerald-400' },
        { id: 3, title: 'Schedule Update', message: 'Coach Omar updated his hours', time: '4h ago', icon: Calendar, color: 'text-accent' },
    ];

    useEffect(() => {
        const fetchUserRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();
                setRole(profile?.role || null);
            }
        };
        fetchUserRole();

        const handleProfileUpdate = () => {
            const saved = localStorage.getItem('gymProfile');
            if (saved) setGymProfile(JSON.parse(saved));
        };
        window.addEventListener('gymProfileUpdated', handleProfileUpdate);
        return () => window.removeEventListener('gymProfileUpdated', handleProfileUpdate);
    }, []);

    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const timer = setTimeout(async () => {
            const [students, coaches] = await Promise.all([
                supabase.from('students').select('id, full_name').ilike('full_name', `%${searchQuery}%`).limit(5),
                supabase.from('coaches').select('id, full_name').ilike('full_name', `%${searchQuery}%`).limit(5)
            ]);

            const results = [
                ...(students.data?.map(s => ({ id: s.id, name: s.full_name, type: 'student' as const })) || []),
                ...(coaches.data?.map(c => ({ id: c.id, name: c.full_name, type: 'coach' as const })) || [])
            ];
            setSearchResults(results);
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = () => {
            setNotificationsOpen(false);
            setProfileOpen(false);
        };
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    const allNavItems = [
        { to: '/', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/students', icon: Users, label: t('common.students'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/coaches', icon: UserCircle, label: t('common.coaches'), roles: ['admin', 'head_coach'] },
        { to: '/schedule', icon: Calendar, label: t('common.schedule'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/finance', icon: Wallet, label: t('common.finance'), roles: ['admin'] },
        { to: '/calculator', icon: Wrench, label: t('common.calculator'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
    ];

    const navItems = allNavItems.filter(item => !role || item.roles.includes(role));

    return (
        <div className="min-h-screen flex bg-background font-cairo">
            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-72 transition-transform duration-500 transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-[110%]' : '-translate-x-full'}`}>
                <div className="h-full glass-card flex flex-col m-4 rounded-[2.5rem] overflow-hidden border border-white/10 shadow-premium">
                    {/* Sidebar Header */}
                    <div className="p-8 pb-4 flex flex-col items-center">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <img src="/logo.png" alt="Epic Gym Logo" className="relative h-24 w-auto object-contain transition-transform hover:scale-110 duration-500" />
                        </div>

                        <div className="text-center w-full mt-4">
                            <h2 className="font-extrabold text-xl tracking-tight text-white premium-gradient-text uppercase">{gymProfile.name}</h2>
                            <div className="text-xs text-white/60 mt-2 font-bold space-y-1">
                                <p className="flex items-center justify-center gap-1"><Building2 className="w-3 h-3" /> {gymProfile.address}</p>
                                <p dir="ltr" className="flex items-center justify-center gap-1">{gymProfile.phone}</p>
                            </div>
                        </div>
                    </div>

                    <div className="px-6 py-2 bg-white/10 mx-6 mt-4 rounded-xl text-[10px] text-center uppercase tracking-[0.2em] text-white/80 font-black border border-white/5">
                        {role || t('common.loading')}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-6 mt-8 space-y-2 overflow-y-auto custom-scrollbar">
                        {navItems.map((item) => {
                            const Icon = item.icon;
                            const isActive = location.pathname === item.to;
                            return (
                                <Link
                                    key={item.to}
                                    to={item.to}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center px-4 py-3.5 text-sm font-bold rounded-2xl transition-all duration-300 group ${isActive
                                        ? 'bg-gradient-to-r from-primary to-primary/80 text-white shadow-lg shadow-primary/30 scale-[1.02]'
                                        : 'text-white/60 hover:bg-white/5 hover:text-white hover:translate-x-1'
                                        }`}
                                >
                                    <Icon className={`w-5 h-5 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'} ${isRtl ? 'ml-3' : 'mr-3'}`} />
                                    <span className="tracking-wide">{item.label}</span>
                                    {isActive && (
                                        <div className={`absolute ${isRtl ? 'left-4' : 'right-4'} w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]`} />
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Sidebar Footer */}
                    <div className="p-8 mt-auto border-t border-white/10">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full px-4 py-3.5 text-sm font-bold text-red-400 hover:text-red-300 hover:bg-white/5 rounded-2xl transition-all duration-300 group"
                        >
                            <LogOut className={`w-5 h-5 transition-transform group-hover:-translate-x-1 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                            <span className="tracking-wide">{t('common.logout')}</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className={`flex-1 flex flex-col min-w-0 min-h-screen transition-all duration-500 ${isRtl ? 'lg:mr-72' : 'lg:ml-72'}`}>
                {/* Header */}
                <header className="h-20 flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-30 w-full border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-3 text-white/70 hover:bg-white/5 rounded-2xl transition-all active:scale-90"
                        >
                            <Menu className="w-6 h-6" />
                        </button>

                        {/* Search Section */}
                        <div className="relative">
                            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 w-96 group focus-within:ring-2 focus-within:ring-primary/20 transition-all cursor-pointer"
                                onClick={() => setSearchOpen(true)}>
                                <Search className="w-5 h-5 text-white/40 group-focus-within:text-primary transition-colors" />
                                <span className="text-sm text-white/30">{t('common.search')}</span>
                            </div>

                            {/* Global Search Modal overlay */}
                            {searchOpen && (
                                <div className="fixed inset-0 z-[60] flex items-start justify-center pt-20 px-4">
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSearchOpen(false)}></div>
                                    <div className="relative w-full max-w-2xl glass-card rounded-[3rem] border border-white/10 shadow-premium overflow-hidden animate-in zoom-in-95 duration-300">
                                        <div className="p-8 border-b border-white/5 flex items-center gap-4">
                                            <Search className="w-6 h-6 text-primary" />
                                            <input
                                                autoFocus
                                                type="text"
                                                placeholder={t('common.search')}
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="bg-transparent border-none text-2xl text-white placeholder-white/20 w-full focus:outline-none font-black uppercase tracking-tight"
                                            />
                                            <button onClick={() => setSearchOpen(false)} className="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                                                <X className="w-6 h-6" />
                                            </button>
                                        </div>
                                        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
                                            {searchResults.length > 0 ? (
                                                searchResults.map(result => (
                                                    <div
                                                        key={`${result.type}-${result.id}`}
                                                        onClick={() => {
                                                            navigate(`/${result.type === 'student' ? 'students' : 'coaches'}`);
                                                            setSearchOpen(false);
                                                        }}
                                                        className="flex items-center justify-between p-6 hover:bg-white/5 rounded-[2rem] cursor-pointer group transition-all"
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`p-4 rounded-2xl shadow-inner ${result.type === 'student' ? 'bg-primary/20 text-primary' : 'bg-accent/20 text-accent'}`}>
                                                                {result.type === 'student' ? <Users className="w-6 h-6" /> : <UserCircle className="w-6 h-6" />}
                                                            </div>
                                                            <div>
                                                                <h4 className="font-black text-white text-lg">{result.name}</h4>
                                                                <p className="text-[10px] uppercase tracking-[.2em] font-black text-white/20 group-hover:text-white/40 transition-colors">
                                                                    {result.type === 'student' ? t('common.students') : t('common.coaches')}
                                                                </p>
                                                            </div>
                                                        </div>
                                                        <ChevronDown className={`w-6 h-6 text-white/10 group-hover:text-primary transition-all ${isRtl ? 'rotate-90' : '-rotate-90'}`} />
                                                    </div>
                                                ))
                                            ) : searchQuery ? (
                                                <div className="p-20 text-center">
                                                    <p className="text-white/20 font-black uppercase tracking-widest">{t('common.noResults')}</p>
                                                </div>
                                            ) : (
                                                <div className="p-20 text-center">
                                                    <p className="text-white/20 font-black uppercase tracking-widest">{t('common.dashboard.searchPlaceholder') || 'Start typing to search students or coaches...'}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Notifications Dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                                className={`p-3 rounded-2xl transition-all relative ${notificationsOpen ? 'bg-primary/20 text-primary shadow-inner' : 'text-white/70 hover:bg-white/5'}`}
                            >
                                <Bell className="w-6 h-6" />
                                <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent border-2 border-background rounded-full animate-pulse"></span>
                            </button>

                            {notificationsOpen && (
                                <div className={`absolute top-full mt-4 ${isRtl ? 'left-0' : 'right-0'} w-96 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in slide-in-from-top-4 duration-300`}>
                                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="font-black text-white uppercase tracking-tight text-lg">{t('common.notifications') || 'Recent Activity'}</h3>
                                    </div>
                                    <div className="max-h-[70vh] overflow-y-auto">
                                        {notifications.map(note => (
                                            <div key={note.id} className="p-6 border-b border-white/5 hover:bg-white/[0.02] transition-all group cursor-pointer">
                                                <div className="flex gap-4">
                                                    <div className={`p-3 rounded-2xl bg-white/5 shadow-inner ${note.color} group-hover:scale-110 transition-transform`}>
                                                        <note.icon className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex justify-between items-start mb-1">
                                                            <h4 className="font-black text-white text-sm">{note.title}</h4>
                                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{note.time}</span>
                                                        </div>
                                                        <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{note.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full p-6 text-[10px] font-black uppercase tracking-[0.3em] text-white/30 hover:text-primary transition-colors bg-white/[0.01]">
                                        {t('common.viewAll') || 'View All Notifications'}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="h-10 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                                className={`flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl transition-all group ${profileOpen ? 'bg-white/10 ring-2 ring-primary/20' : 'hover:bg-white/5'}`}
                            >
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold shadow-lg shadow-primary/20 transition-transform group-hover:scale-105">
                                    {role?.[0]?.toUpperCase() || 'A'}
                                </div>
                                <div className="hidden sm:block text-left text-sm">
                                    <p className="font-extrabold text-white tracking-wide uppercase">{role?.replace('_', ' ') || 'ADMIN'}</p>
                                    <p className="text-[10px] text-white/50 font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                        {t('common.online') || 'ONLINE'}
                                    </p>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-white/30 group-hover:text-white transition-all ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className={`absolute top-full mt-4 ${isRtl ? 'left-0' : 'right-0'} w-64 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in slide-in-from-top-4 duration-300`}>
                                    <div className="p-6 space-y-2">
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className="flex items-center w-full px-4 py-4 text-sm font-black text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all group uppercase tracking-widest gap-4"
                                        >
                                            <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
                                            {t('common.settings')}
                                        </button>
                                        <div className="h-[1px] bg-white/5 mx-2"></div>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full px-4 py-4 text-sm font-black text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all group uppercase tracking-widest gap-4"
                                        >
                                            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                            {t('common.logout')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-8 overflow-x-hidden">
                    <Outlet context={{ role }} />
                </main>
            </div>
        </div>
    );
}
