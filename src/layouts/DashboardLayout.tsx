import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FloatingChat from '../components/FloatingChat';
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
    Bell,
    ChevronDown,
    MessageSquare,
    Globe,
    UserPlus,
    ExternalLink
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import PremiumClock from '../components/PremiumClock';

export default function DashboardLayout() {
    const { t, i18n } = useTranslation();
    const { settings, updateSettings, userProfile } = useTheme();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Derived states from unified userProfile
    const userId = userProfile?.id || null; // Wait, I didn't add id to userProfile in ThemeContext. I should.
    const role = userProfile?.role || null;
    const fullName = userProfile?.full_name || null;
    const userEmail = userProfile?.email || null; // I should add email too.
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [userStatus, setUserStatus] = useState<'online' | 'busy'>('online');
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);

    const isRtl = i18n.language === 'ar' || document.dir === 'rtl';
    const [gymProfile, setGymProfile] = useState(() => {
        try {
            const saved = localStorage.getItem('gymProfile');
            return saved ? JSON.parse(saved) : {
                name: t('common.gymNameFallback'),
                phone: '+20 123 456 7890',
                address: t('common.gymAddressFallback'),
            };
        } catch (e) {
            return {
                name: t('common.gymNameFallback'),
                phone: '+20 123 456 7890',
                address: t('common.gymAddressFallback'),
            };
        }
    });

    // Real notifications state
    const [notifications, setNotifications] = useState<{
        id: string;
        title: string;
        message: string;
        created_at: string;
        type: 'student' | 'payment' | 'schedule' | 'coach' | 'check_in' | 'attendance_absence' | 'pt_subscription';
        is_read: boolean;
        user_id?: string;
        related_coach_id?: string;
        related_student_id?: string;
        target_role?: string;
    }[]>([]);

    useEffect(() => {
        // Fetch initial notifications
        const fetchNotifications = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get role from profile to filter target_role
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', user.id)
                .single();

            const userRole = profile?.role?.toLowerCase().trim();

            let query = supabase
                .from('notifications')
                .select('*')
                .or(`user_id.eq.${user.id},user_id.is.null`)
                .order('created_at', { ascending: false })
                .limit(20);

            const { data } = await query;
            if (data) setNotifications(data);
        };

        fetchNotifications();

        // Subscribe to realtime notifications
        const channel = supabase
            .channel('notifications-changes')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                async (payload) => {
                    const newNote = payload.new as any;

                    // We need a fresh userId from Auth if it's not available in closure
                    const { data: { user } } = await supabase.auth.getUser();
                    if (!user) return;

                    // Only add if it's for this user OR global
                    if (!newNote.user_id || newNote.user_id === user.id) {
                        setNotifications(prev => {
                            // Prevent duplicates
                            if (prev.some(n => n.id === newNote.id)) return prev;
                            return [newNote, ...prev];
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'DELETE',
                    schema: 'public',
                    table: 'notifications'
                },
                (payload) => {
                    const deletedId = (payload.old as any).id;
                    if (deletedId) {
                        setNotifications(prev => prev.filter(n => n.id !== deletedId));
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        if (userProfile?.avatar_url) {
            setAvatarUrl(userProfile.avatar_url);
        } else if (userId) {
            // If avatar is missing in profile, try fetching from coaches table (linked by profile_id)
            const fetchCoachAvatar = async () => {
                const { data: coachData } = await supabase
                    .from('coaches')
                    .select('avatar_url')
                    .eq('profile_id', userId)
                    .maybeSingle();
                setAvatarUrl(coachData?.avatar_url || null);
            };
            fetchCoachAvatar();
        }
    }, [userProfile, userId]);

    useEffect(() => {
        const fetchStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) setUserStatus(user.user_metadata?.status || 'online');
        };
        fetchStatus();

        const handleProfileUpdate = () => {
            const saved = localStorage.getItem('gymProfile');
            if (saved) setGymProfile(JSON.parse(saved));
        };

        // Debugging: Monitor Role
        if (role) console.log('Current User Role:', role);

        // Also refresh user profile on event
        window.addEventListener('gymProfileUpdated', handleProfileUpdate);
        return () => {
            window.removeEventListener('gymProfileUpdated', handleProfileUpdate);
        };
    }, []);


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

    const handleStatusChange = async (status: 'online' | 'busy') => {
        const { error } = await supabase.auth.updateUser({
            data: { status }
        });
        if (!error) {
            setUserStatus(status);
        }
    };

    const allNavItems = [
        { to: '/', icon: LayoutDashboard, label: t('common.dashboard'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/students', icon: Users, label: t('common.students'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/coaches', icon: UserCircle, label: t('common.coaches'), roles: ['admin', 'head_coach'] },
        { to: '/schedule', icon: Calendar, label: t('common.schedule'), roles: ['admin', 'head_coach', 'reception'] },
        { to: '/finance', icon: Wallet, label: t('common.finance'), roles: ['admin'] },
        { to: '/settings', icon: Settings, label: t('common.settings'), roles: ['admin', 'head_coach', 'coach', 'reception'] },
        { to: '/admin/cameras', icon: Video, label: t('common.cameras'), roles: ['admin'] },
    ];

    const navItems = allNavItems.filter(item => {
        if (!role) return true; // Show everything while loading if no role
        const normalizedRole = role.toLowerCase().trim();
        if (normalizedRole === 'admin') return true; // Admin sees all
        return item.roles.includes(normalizedRole);
    });

    // Filter notifications based on role and user_id
    const filteredNotifications = notifications.filter(note => {
        if (!role) return false;

        // If targeted to a specific user, only they should see it
        if (note.user_id) {
            return note.user_id === userId;
        }

        if (role === 'admin') return true; // Admin sees all global ones

        // Head Coach Filtering
        if (role === 'head_coach') {
            const allowedTypes = ['coach', 'check_in', 'attendance_absence', 'pt_subscription', 'student'];
            if (note.target_role === 'head_coach') return true;
            if (allowedTypes.includes(note.type)) return true;
            return false;
        }

        // Coach Filtering
        if (role === 'coach') {
            if (note.user_id === userId) return true; // Targeted to this coach
            if (note.target_role === 'coach') return true; // Global coach notification
            return false;
        }

        // Reception Filtering
        if (role === 'reception') {
            const allowedTypes = ['payment', 'student'];
            if (note.target_role === 'reception' || note.target_role === 'admin_reception') return true;
            if (allowedTypes.includes(note.type)) return true;
            return false;
        }

        return false;
    });

    const unreadCount = filteredNotifications.filter(n => !n.is_read).length;

    const handleClearAllNotifications = async () => {
        if (!filteredNotifications.length) return;

        // Optimistic update
        const ids = filteredNotifications.map(n => n.id);
        const oldNotifications = [...notifications];
        setNotifications(prev => prev.filter(n => !ids.includes(n.id)));

        try {
            const { error } = await supabase
                .from('notifications')
                .delete()
                .in('id', ids);

            if (error) throw error;
            toast.success('Notifications cleared');
        } catch (error) {
            console.error('Error clearing notifications:', error);
            setNotifications(oldNotifications);
            toast.error('Failed to clear notifications. Please try again.');
        }
    };

    const handleMarkAsRead = async (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        try {
            await supabase
                .from('notifications')
                .update({ is_read: true })
                .eq('id', id);
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

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

                    {/* User Profile Section in Sidebar */}
                    <div className="mt-8 px-6 flex flex-col items-center">
                        <div className="text-center">
                            <h3 className="font-extrabold text-white uppercase tracking-tight text-sm truncate max-w-[200px]">{fullName || role || t('common.adminRole')}</h3>
                            <p className="text-[10px] text-white/40 font-bold truncate lowercase mt-1 max-w-[200px]">{userEmail}</p>
                        </div>
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
                    <div className="p-8 mt-auto border-t border-white/10 space-y-2">
                        {/* Language Toggle - Sidebar */}
                        <button
                            onClick={() => {
                                const newLang = i18n.language === 'en' ? 'ar' : 'en';
                                i18n.changeLanguage(newLang);
                                document.dir = newLang === 'ar' ? 'rtl' : 'ltr';

                                // Persist language choice privately
                                updateSettings({ language: newLang });
                            }}
                            className="flex items-center w-full px-4 py-3.5 text-sm font-bold text-white/60 hover:text-white hover:bg-white/5 rounded-2xl transition-all duration-300 group"
                        >
                            <Globe className={`w-5 h-5 transition-transform group-hover:scale-110 ${isRtl ? 'ml-3' : 'mr-3'}`} />
                            <span className="tracking-wide">{i18n.language === 'en' ? 'العربية' : 'English'}</span>
                            <span className="ml-auto text-[10px] bg-white/5 px-2 py-0.5 rounded-lg border border-white/5 uppercase tracking-wider">{i18n.language.toUpperCase()}</span>
                        </button>
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
                    </div>

                    <div className="flex items-center gap-3">
                        {settings.clock_position === 'header' && (
                            <PremiumClock className="hidden md:flex" />
                        )}

                        {role === 'admin' && (
                            <a
                                href="/registration"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hidden sm:flex items-center justify-center p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all group relative border border-emerald-500/10"
                                title={t('common.registrationPage')}
                            >
                                <UserPlus className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                            </a>
                        )}

                        <div className="h-10 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

                        {/* Notifications Dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                                className={`p-3 rounded-2xl transition-all relative ${notificationsOpen ? 'bg-primary/20 text-primary shadow-inner' : 'text-white/70 hover:bg-white/5'}`}
                            >
                                <Bell className="w-6 h-6" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border border-white/20 animate-in zoom-in duration-300">
                                        {unreadCount > 9 ? '+9' : unreadCount}
                                    </span>
                                )}
                            </button>

                            {notificationsOpen && (
                                <div className={`absolute top-full mt-4 ${isRtl ? 'left-0' : 'right-0'} w-96 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in slide-in-from-top-4 duration-300`}>
                                    <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                        <h3 className="font-black text-white uppercase tracking-tight text-lg">{t('common.notifications') || t('common.recentActivity')}</h3>
                                    </div>
                                    <div className="max-h-[70vh] overflow-y-auto">
                                        {filteredNotifications.length === 0 ? (
                                            <div className="p-8 text-center text-white/20 font-black uppercase tracking-widest text-xs">
                                                {t('common.noNotifications')}
                                            </div>
                                        ) : (
                                            filteredNotifications.map(note => {
                                                let Icon = Bell;
                                                let color = 'text-white';

                                                if (note.type === 'student') { Icon = Users; color = 'text-primary'; }
                                                else if (note.type === 'payment') { Icon = Wallet; color = 'text-emerald-400'; }
                                                else if (note.type === 'schedule') { Icon = Calendar; color = 'text-accent'; }
                                                else if (note.type === 'coach') { Icon = UserCircle; color = 'text-purple-400'; }
                                                else if (note.type === 'check_in') { Icon = Calendar; color = 'text-green-400'; }
                                                else if (note.type === 'attendance_absence') { Icon = Calendar; color = 'text-red-400'; }
                                                else if (note.type === 'pt_subscription') { Icon = Wallet; color = 'text-amber-400'; }

                                                const timeAgo = (dateStr: string) => {
                                                    const diff = (new Date().getTime() - new Date(dateStr).getTime()) / 1000 / 60;
                                                    if (diff < 60) return `${Math.floor(diff)}${t('common.minutesAgoShort')}`;
                                                    if (diff < 1440) return `${Math.floor(diff / 60)}${t('common.hoursAgoShort')}`;
                                                    return `${Math.floor(diff / 1440)}${t('common.daysAgoShort')}`;
                                                };

                                                return (
                                                    <div
                                                        key={note.id}
                                                        onClick={() => handleMarkAsRead(note.id)}
                                                        className={`p-6 border-b border-white/5 hover:bg-white/[0.02] transition-all group cursor-pointer ${!note.is_read ? 'bg-primary/5' : ''}`}
                                                    >
                                                        <div className="flex gap-4">
                                                            <div className={`p-3 rounded-2xl bg-white/5 shadow-inner ${color} group-hover:scale-110 transition-transform`}>
                                                                <Icon className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1">
                                                                <div className="flex justify-between items-start mb-1">
                                                                    <h4 className="font-black text-white text-sm">{note.title}</h4>
                                                                    <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{timeAgo(note.created_at)}</span>
                                                                </div>
                                                                <p className="text-xs text-white/50 group-hover:text-white/70 transition-colors">{note.message}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="p-4 border-t border-white/5 bg-white/[0.01]">
                                        {filteredNotifications.length > 0 && (
                                            <button
                                                onClick={handleClearAllNotifications}
                                                className="w-full py-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.3em] transition-all"
                                            >
                                                {t('common.notificationsClearAll')}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-10 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>

                        {/* Profile Dropdown */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                                className={`flex items-center gap-4 px-4 py-2 rounded-2xl transition-all group ${profileOpen ? 'bg-white/10 ring-2 ring-primary/20' : 'hover:bg-white/5 shadow-premium bg-white/[0.02]'}`}
                            >
                                <div className="text-right text-sm">
                                    <p className={`text-[10px] ${userStatus === 'online' ? 'text-emerald-400' : 'text-orange-400'} font-black uppercase tracking-[0.3em] flex items-center justify-end gap-2.5`}>
                                        <span className={`w-2 h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-orange-400 shadow-[0_0_10px_rgba(251,146,60,0.5)]'} animate-pulse`}></span>
                                        {userStatus === 'online' ? t('common.onlineLabel') : t('common.busyLabel')}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center overflow-hidden border border-white/10 group-hover:scale-105 transition-transform">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xs">
                                            {(fullName || role)?.[0]?.toUpperCase() || 'A'}
                                        </div>
                                    )}
                                </div>
                                <ChevronDown className={`w-4 h-4 text-white/30 group-hover:text-white transition-all ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className={`absolute top-full mt-4 ${isRtl ? 'left-0' : 'right-0'} w-64 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in slide-in-from-top-4 duration-300`}>
                                    <div className="p-6 space-y-2 border-b border-white/5">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] px-4 mb-4">{t('common.setStatus')}</p>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => handleStatusChange('online')}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${userStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                                {t('common.onlineLabel')}
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange('busy')}
                                                className={`flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${userStatus === 'busy' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                            >
                                                <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                                                {t('common.busyLabel')}
                                            </button>
                                        </div>
                                    </div>
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
                    <Outlet context={{ role, fullName }} />
                    {/* Floating Chat */}
                    <FloatingChat
                        userStatus={userStatus}
                        currentUserId={userId}
                        currentUserRole={role}
                        currentUserName={fullName}
                    />
                </main>
            </div >
        </div >
    );
}
