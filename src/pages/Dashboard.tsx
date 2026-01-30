import { Users, DollarSign, Medal, Calendar, TrendingUp, TrendingDown, Clock, Scale, ArrowUpRight } from 'lucide-react';
import { format } from 'date-fns';
import { useOutletContext, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useDashboardStats } from '../hooks/useData';
import CoachDashboard from './CoachDashboard';

export default function Dashboard() {
    const { t } = useTranslation(); // Init hook
    const { role } = useOutletContext<{ role: string }>() || { role: null };

    const { data: stats, isLoading: loading } = useDashboardStats();

    // Show Coach Dashboard for coaches
    if (role === 'coach') {
        return <CoachDashboard />;
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
            value: displayStats.monthlyRevenue.toLocaleString() + ' EGP',
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

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-10">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl sm:text-5xl font-extrabold premium-gradient-text tracking-tight uppercase leading-none">{t('common.dashboard')}</h1>
                    <p className="text-white/60 mt-4 text-sm sm:text-lg font-bold tracking-wide uppercase opacity-100">{t('dashboard.welcome')}, here&apos;s what&apos;s happening today.</p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{format(new Date(), 'EEEE, dd MMMM')}</span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {statCards.map((stat, index) => (
                    <div key={index} className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium group hover:scale-[1.02] transition-transform duration-500">
                        <div className="flex items-center justify-between mb-6">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/50">{stat.label}</p>
                            <div className={`p-4 rounded-2xl text-white ${stat.color} shadow-lg shadow-black/10 group-hover:scale-110 transition-transform`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-4xl font-black text-white">{loading ? '-' : stat.value}</h3>
                        </div>
                        <div className="mt-6 flex items-center text-[10px] font-black uppercase tracking-widest text-emerald-400">
                            <ArrowUpRight className="w-4 h-4 mr-2" />
                            {stat.trend}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Recent Activity */}
                <div className="glass-card rounded-[2.5rem] border border-white/10 shadow-premium overflow-hidden">
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

                {/* Quick Actions or Calendar Placeholder */}
                <div className="bg-gradient-to-br from-primary/10 to-accent/10 p-10 rounded-[2.5rem] border border-white/10 shadow-premium relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>

                    <h3 className="font-black text-white text-xl uppercase tracking-tight mb-8 flex items-center gap-3 relative z-10">
                        <Calendar className="w-6 h-6 text-primary" /> {t('dashboard.upcomingSessions')}
                    </h3>

                    <div className="space-y-6 relative z-10">
                        <div className="glass-card p-6 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all group/item">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-white text-lg group-hover/item:text-primary transition-colors">Gymnastics Level 1</h4>
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">{t('dashboard.coachName')} Ahmed • 4:00 PM</p>
                                </div>
                                <span className="bg-primary text-white text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">{t('dashboard.today')}</span>
                            </div>
                        </div>

                        <div className="glass-card p-6 rounded-[2rem] border border-white/10 hover:bg-white/10 transition-all group/item">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-black text-white text-lg group-hover/item:text-primary transition-colors">Advanced Training</h4>
                                    <p className="text-white/40 text-[10px] font-black uppercase tracking-widest mt-1">{t('dashboard.coachName')} Sarah • 6:30 PM</p>
                                </div>
                                <span className="bg-white/10 text-white/40 text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest">{t('dashboard.tomorrow')}</span>
                            </div>
                        </div>
                    </div>

                    <button className="mt-10 w-full py-5 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white/50 hover:bg-white/10 hover:text-white transition-all relative z-10">
                        View Full Schedule
                    </button>
                </div>
            </div>
        </div>
    );
}
