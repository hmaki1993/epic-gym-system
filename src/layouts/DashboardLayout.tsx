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
                            const newList = [newNote, ...prev];

                            // Trigger toast for new notification if it's unread
                            if (!newNote.is_read) {
                                toast.success(newNote.title, {
                                    icon: '🔔',
                                    duration: 4000
                                });
                            }

                            return newList;
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
        console.log('🛡️ DashboardLayout: Render check', { role, userId, userEmail, fullName });

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
        if (!role) return false; // Show nothing while loading to avoid flickering
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
            const allowedTypes = ['payment', 'student', 'check_in', 'attendance_absence'];
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
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-200"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 ${isRtl ? 'right-0' : 'left-0'} z-50 w-72 transition-transform duration-300 transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : isRtl ? 'translate-x-[110%]' : '-translate-x-full'}`}>
                <div className="h-full glass-card flex flex-col m-4 rounded-[2.5rem] overflow-hidden border border-surface-border shadow-premium">
                    {/* Sidebar Header */}
                    <div className="p-8 pb-4 flex flex-col items-center">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                            <img src="/logo.png" alt="Epic Gym Logo" className="relative h-24 w-auto object-contain transition-transform hover:scale-110 duration-500" />
                        </div>

                        <div className="text-center w-full mt-4">
                            <h2 className="relative flex flex-col items-center">
                                <span className="text-[10px] font-black tracking-[0.4em] text-text-muted uppercase mb-1">Epic</span>
                                <span className="text-sm font-black tracking-[0.2em] text-text-base premium-gradient-text uppercase">Gymnastic Academy</span>
                                <div className="mt-2 w-8 h-[1px] bg-gradient-to-r from-transparent via-primary/30 to-transparent"></div>
                            </h2>
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
                    <div className="p-8 mt-auto border-t border-surface-border space-y-2">
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
                {/* Header - Elite Reborn */}
                <header className="h-16 flex items-center justify-between px-6 bg-background/50 backdrop-blur-3xl sticky top-0 z-30 w-full border-b border-surface-border">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-3 text-white/70 hover:bg-white/5 rounded-xl transition-all active:scale-90 border border-white/5"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Quick Action Hub */}
                        <div className="hidden md:flex items-center gap-2 p-1.5 bg-text-base/5 border border-surface-border rounded-[2rem] shadow-inner backdrop-blur-md">
                            {settings.clock_position === 'header' && (
                                <div className="flex items-center gap-3">
                                    <PremiumClock className="!bg-transparent !border-none !shadow-none !px-2" />
                                    {role === 'admin' && <div className="h-6 w-px bg-white/10 mx-1"></div>}
                                </div>
                            )}

                            {role === 'admin' && (
                                <a
                                    href="/registration"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="relative group/reg flex items-center justify-center w-11 h-11 rounded-full bg-emerald-500/5 border border-emerald-500/10 hover:border-emerald-500/40 transition-all duration-500 shadow-lg shadow-emerald-500/5 hover:bg-emerald-500/10 active:scale-95"
                                    title={t('common.registrationPage')}
                                >
                                    {/* Premium Glow effect */}
                                    <div className="absolute inset-0 rounded-full bg-emerald-500/20 blur-xl opacity-0 group-hover/reg:opacity-100 transition-opacity duration-700"></div>

                                    <UserPlus className="w-5 h-5 text-emerald-400 group-hover/reg:scale-110 transition-transform duration-500 relative z-10" />

                                    {/* Elite Status Dot */}
                                    <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#0E1D21] shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse z-20"></span>
                                </a>
                            )}

                            {/* Unified Control Separator */}
                            <div className="h-8 w-px bg-surface-border mx-2"></div>

                            {/* Notifications Center */}
                            <div className="relative">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setNotificationsOpen(!notificationsOpen); setProfileOpen(false); }}
                                    className={`w-11 h-11 flex items-center justify-center rounded-full transition-all relative ${notificationsOpen ? 'bg-primary/20 text-primary shadow-[inset_0_0_15px_rgba(var(--primary-rgb),0.3)]' : 'text-white/70 hover:bg-white/5 border border-transparent'}`}
                                >
                                    <Bell className="w-5 h-5" />
                                    {unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[20px] h-[20px] px-1 bg-gradient-to-br from-red-500 to-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-lg shadow-red-500/40 border-2 border-background">
                                            {unreadCount > 9 ? '9+' : unreadCount}
                                        </span>
                                    )}
                                </button>

                                {notificationsOpen && (
                                    <div className={`absolute top-full mt-6 ${isRtl ? 'left-[-1rem]' : 'right-[-1rem]'} w-96 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in fade-in slide-in-from-top-4 duration-300`}>
                                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                                            <h3 className="font-black text-white uppercase tracking-tighter text-xl">{t('common.notifications') || t('common.recentActivity')}</h3>
                                        </div>
                                        <div className="max-h-[70vh] overflow-y-auto custom-scrollbar">
                                            {filteredNotifications.length === 0 ? (
                                                <div className="p-12 text-center text-white/10 font-black uppercase tracking-[0.3em] text-[10px]">
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
                                                            className={`p-6 border-b border-white/[0.02] hover:bg-white/[0.03] transition-all group cursor-pointer ${!note.is_read ? 'bg-primary/5' : ''}`}
                                                        >
                                                            <div className="flex gap-4">
                                                                <div className={`w-12 h-12 flex items-center justify-center rounded-2xl bg-white/5 shadow-inner ${color} group-hover:scale-105 transition-transform border border-white/5`}>
                                                                    <Icon className="w-5 h-5" />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <div className="flex justify-between items-start mb-1">
                                                                        <h4 className="font-extrabold text-white text-sm tracking-tight">{note.title}</h4>
                                                                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{timeAgo(note.created_at)}</span>
                                                                    </div>
                                                                    <p className="text-xs text-white/40 group-hover:text-white/70 transition-colors leading-relaxed line-clamp-2">{note.message}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="p-4 bg-white/[0.01]">
                                            {filteredNotifications.length > 0 && (
                                                <button
                                                    onClick={handleClearAllNotifications}
                                                    className="w-full py-4 rounded-[1.5rem] bg-red-500/10 text-red-400 hover:bg-red-500/20 text-[10px] font-black uppercase tracking-[0.4em] transition-all border border-red-500/10"
                                                >
                                                    {t('common.notificationsClearAll')}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Status & Profile Hub */}
                        <div className="relative">
                            <button
                                onClick={(e) => { e.stopPropagation(); setProfileOpen(!profileOpen); setNotificationsOpen(false); }}
                                className={`flex items-center gap-4 pl-6 pr-3 py-2 rounded-[2rem] transition-all group ${profileOpen ? 'bg-white/10 shadow-inner' : 'bg-white/[0.03] border border-white/10 hover:border-white/20 hover:bg-white/5 shadow-premium'}`}
                            >
                                <div className="hidden sm:flex flex-col items-end leading-none gap-1.5">
                                    <p className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{fullName || role?.replace('_', ' ')}</p>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`w-1.5 h-1.5 rounded-full ${userStatus === 'online' ? 'bg-emerald-400' : 'bg-orange-400'} animate-pulse`}></span>
                                        <span className={`text-[8px] font-black uppercase tracking-widest ${userStatus === 'online' ? 'text-emerald-400/80' : 'text-orange-400/80'}`}>
                                            {userStatus === 'online' ? t('common.onlineLabel') : t('common.busyLabel')}
                                        </span>
                                    </div>
                                </div>

                                <div className="relative">
                                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent p-[1px] group-hover:scale-105 transition-transform duration-500">
                                        <div className="w-full h-full rounded-[0.9rem] bg-background flex items-center justify-center overflow-hidden">
                                            {avatarUrl ? (
                                                <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-white font-black text-xs">
                                                    {(fullName || role)?.[0]?.toUpperCase() || 'A'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border-2 border-white/10 flex items-center justify-center p-0.5">
                                        <ChevronDown className={`w-full h-full text-white/40 transition-all duration-300 ${profileOpen ? 'rotate-180' : ''}`} />
                                    </div>
                                </div>
                            </button>

                            {profileOpen && (
                                <div className={`absolute top-full mt-4 ${isRtl ? 'left-[-1rem]' : 'right-[-1rem]'} w-72 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden z-[70] animate-in fade-in slide-in-from-top-4 duration-300`}>
                                    <div className="p-8 space-y-4 border-b border-white/[0.03] bg-white/[0.01]">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-2">{t('common.setStatus')}</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleStatusChange('online')}
                                                className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${userStatus === 'online' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${userStatus === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                                                {t('common.onlineLabel')}
                                            </button>
                                            <button
                                                onClick={() => handleStatusChange('busy')}
                                                className={`flex items-center justify-center gap-2.5 py-3.5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${userStatus === 'busy' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-500/10' : 'bg-white/5 text-white/40 border border-transparent hover:bg-white/10'}`}
                                            >
                                                <span className={`w-2 h-2 rounded-full ${userStatus === 'busy' ? 'bg-orange-400 animate-pulse' : 'bg-white/20'}`}></span>
                                                {t('common.busyLabel')}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="p-4 space-y-1">
                                        <button
                                            onClick={() => navigate('/settings')}
                                            className="flex items-center w-full px-6 py-5 text-xs font-black text-white/50 hover:text-white hover:bg-white/[0.03] rounded-[1.5rem] transition-all group uppercase tracking-[0.2em] gap-5"
                                        >
                                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 group-hover:bg-primary/20 group-hover:text-primary transition-all border border-white/5">
                                                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-700" />
                                            </div>
                                            {t('common.settings')}
                                        </button>
                                        <button
                                            onClick={handleLogout}
                                            className="flex items-center w-full px-6 py-5 text-xs font-black text-rose-500/60 hover:text-rose-500 hover:bg-rose-500/5 rounded-[1.5rem] transition-all group uppercase tracking-[0.2em] gap-5"
                                        >
                                            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-rose-500/10 transition-all border border-rose-500/10">
                                                <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                            </div>
                                            {t('common.logout')}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 p-4 sm:p-6 overflow-x-hidden">
                    <Outlet context={{ role, fullName }} />

                </main>
            </div >
        </div >
    );
}
