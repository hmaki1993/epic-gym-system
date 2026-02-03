import { Users, DollarSign, Medal, Calendar, TrendingUp, TrendingDown, Clock, Scale, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../hooks/useData';

import CoachDashboard from './CoachDashboard';
import HeadCoachDashboard from './HeadCoachDashboard';
import ReceptionDashboard from './ReceptionDashboard';
import LiveStudentsWidget from '../components/LiveStudentsWidget';
import GroupsList from '../components/GroupsList';
import { useCurrency } from '../context/CurrencyContext';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
    const { t } = useTranslation();
    const { settings } = useTheme(); // Init hook
    const { role, fullName } = useOutletContext<{ role: string, fullName: string }>() || { role: null, fullName: null };
    const { formatPrice } = useCurrency();

    const { data: stats, isLoading: loading } = useDashboardStats();

    // Show Head Coach Dashboard
    if (role === 'head_coach') {
        return <HeadCoachDashboard />;
    }

    // Show Coach Dashboard for coaches
    if (role === 'coach') {
        return <CoachDashboard />;
    }

    // Show Reception Dashboard
    if (role === 'reception') {
        return <ReceptionDashboard />;
    }

    // Default stats to avoid undefined errors during loading
    const displayStats = stats || {
        totalStudents: 0,
        activeCoaches: 0,
        monthlyRevenue: 0,
        recentActivity: []
    };

    const statCards = [
        {
            label: t('dashboard.totalStudents'),
            value: displayStats.totalStudents,
            icon: Users,
            color: 'bg-blue-500',
            trend: '+12% from last month'
        },
        {
            label: t('dashboard.monthlyRevenue'),
            value: formatPrice(displayStats.monthlyRevenue),
            icon: TrendingUp,
            color: 'bg-green-500',
            trend: '+5% from last month'
        },
        {
            label: t('dashboard.activeCoaches'),
            value: displayStats.activeCoaches,
            icon: Medal, // Changed from Dumbbell to Medal
            color: 'bg-orange-500',
            trend: 'Stable'
        }
    ];

    console.log('Dashboard Render. Role:', role, 'FullName:', fullName, 'Stats:', stats, 'Loading:', loading);
    console.log('Is Reception?', role === 'reception');

    return (
        <div className="space-y-12">

            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-10">
                <div className="text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                        <h1 className="text-4xl sm:text-5xl font-extrabold premium-gradient-text tracking-tight uppercase leading-none">{t('common.dashboard')}</h1>
                        <div className="h-8 w-[1px] bg-white/10 hidden sm:block"></div>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <span className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">{format(new Date(), 'EEEE, dd MMMM')}</span>
                            {settings.clock_position === 'dashboard' && (
                                <>
                                    <div className="hidden sm:block w-px h-6 bg-white/10 mx-2"></div>
                                    <PremiumClock />
                                </>
                            )}
                        </div>
                    </div>
                    <p className="text-white/60 mt-4 text-sm sm:text-lg font-bold tracking-wide uppercase opacity-100">{t('dashboard.welcome')}, {fullName || role?.replace('_', ' ') || 'Admin'}.</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {statCards.map((stat, index) => (
                    <div key={index} className="glass-card p-5 rounded-3xl border border-white/10 shadow-premium group hover:scale-[1.02] transition-transform duration-500">
                        <div className="flex items-center justify-between mb-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50 truncate w-full">{stat.label}</p>
                            <div className={`p-2 rounded-xl text-white ${stat.color} shadow-lg shadow-black/10 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-4 h-4" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-2xl font-black text-white">{loading ? '-' : stat.value}</h3>
                        </div>
                        <div className="mt-4 flex items-center text-[9px] font-black uppercase tracking-widest text-emerald-400">
                            <ArrowUpRight className="w-3 h-3 mr-1" />
                            {stat.trend}
                        </div>
                    </div>
                ))}
            </div>

            {/* Groups Section */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                    <div className="p-3 bg-accent/20 rounded-2xl text-accent"><Users className="w-6 h-6" /></div>
                    {t('dashboard.trainingGroups', 'Training Groups')}
                </h2>
                <GroupsList showAll={true} />
            </div>

            {/* Live Floor & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Floor Widget */}
                <div className="lg:col-span-1 h-full min-h-[500px]">
                    <LiveStudentsWidget />
                </div>

                {/* Recent Activity */}
                <div className="lg:col-span-2 glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <span className="w-2 h-8 bg-primary rounded-full"></span>
                            {t('dashboard.newJoiners')}
                        </h3>
                        <button className="text-[10px] font-black text-primary uppercase tracking-widest hover:text-white transition-colors">{t('dashboard.viewAll')}</button>
                    </div>

                    <div className="p-8 space-y-4">
                        {loading ? (
                            <p className="text-white/20 text-sm font-black uppercase tracking-widest text-center py-10">{t('common.loading')}</p>
                        ) : displayStats.recentActivity.length === 0 ? (
                            <p className="text-white/20 text-sm font-black uppercase tracking-widest text-center py-10">{t('dashboard.noRecentActivity')}</p>
                        ) : (
                            displayStats.recentActivity.map((student: any) => (
                                <div key={student.id} className="flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5 hover:bg-white/5 transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-black group-hover:scale-110 transition-transform">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-extrabold text-white group-hover:text-primary transition-colors text-lg">{student.full_name}</p>
                                            <p className="text-[10px] text-white/30 font-black uppercase tracking-widest">{t('dashboard.joined', { date: format(new Date(student.created_at), 'MMM dd') })}</p>
                                        </div>
                                    </div>
                                    <span className="inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{t('students.active')}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
