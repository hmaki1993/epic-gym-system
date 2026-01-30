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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div>
                <h1 className="text-3xl font-bold text-secondary">{t('common.dashboard')}</h1>
                <p className="text-gray-500 mt-1">{t('dashboard.welcome')}, here&apos;s what&apos;s happening at Epic Gym.</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {statCards.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 transition-all hover:shadow-md">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                                <h3 className="text-3xl font-bold text-secondary">{loading ? '-' : stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl text-white ${stat.color} shadow-lg shadow-primary/10`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-sm text-green-600 font-medium">
                            <ArrowUpRight className="w-4 h-4 mr-1" />
                            {stat.trend}
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Activity */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-900 text-lg">{t('dashboard.newJoiners')}</h3>
                        <button className="text-primary text-sm font-medium hover:underline">{t('dashboard.viewAll')}</button>
                    </div>

                    <div className="space-y-4">
                        {loading ? (
                            <p className="text-gray-400 text-sm">{t('common.loading')}</p>
                        ) : displayStats.recentActivity.length === 0 ? (
                            <p className="text-gray-400 text-sm">{t('dashboard.noRecentActivity')}</p>
                        ) : (
                            displayStats.recentActivity.map((student: any) => (
                                <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">{student.full_name}</p>
                                            <p className="text-xs text-gray-500">{t('dashboard.joined', { date: format(new Date(student.created_at), 'MMM dd') })}</p>
                                        </div>
                                    </div>
                                    <span className="text-xs font-medium text-green-600 bg-green-100 px-2 py-1 rounded-full">{t('students.active')}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Quick Actions or Calendar Placeholder */}
                <div className="bg-gradient-to-br from-secondary to-slate-800 p-6 rounded-2xl shadow-lg text-white">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5" /> {t('dashboard.upcomingSessions')}
                    </h3>
                    <div className="space-y-4">
                        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg">Gymnastics Level 1</h4>
                                    <p className="text-white/70 text-sm">{t('dashboard.coachName')} Ahmed • 4:00 PM</p>
                                </div>
                                <span className="bg-primary text-white text-xs font-bold px-2 py-1 rounded">{t('dashboard.today')}</span>
                            </div>
                        </div>
                        <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm border border-white/10">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-bold text-lg">Advanced Training</h4>
                                    <p className="text-white/70 text-sm">{t('dashboard.coachName')} Sarah • 6:30 PM</p>
                                </div>
                                <span className="bg-white/20 text-white text-xs font-bold px-2 py-1 rounded">{t('dashboard.tomorrow')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
