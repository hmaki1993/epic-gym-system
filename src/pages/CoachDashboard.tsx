import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, Globe, User, ChevronRight, TrendingUp, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import GroupDetailsModal from '../components/GroupDetailsModal';
import { useCurrency } from '../context/CurrencyContext';

export default function CoachDashboard() {
    const { t, i18n } = useTranslation();
    const { currency } = useCurrency();
    const { role, fullName } = useOutletContext<{ role: string, fullName: string }>() || { role: null, fullName: null };
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const [syncLoading, setSyncLoading] = useState(true);
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);
    const [ptRate, setPtRate] = useState<number>(0);
    const [totalEarnings, setTotalEarnings] = useState<number>(0);
    const [baseSalary, setBaseSalary] = useState<number>(0);
    const [coachId, setCoachId] = useState<number | null>(null);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [elapsedTime, setElapsedTime] = useState(0);

    useEffect(() => {
        let interval: any;
        if (isCheckedIn) {
            interval = setInterval(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const startTime = localStorage.getItem(`checkInStart_${today}`);
                if (startTime) {
                    const params = JSON.parse(startTime);
                    const now = new Date().getTime();
                    setElapsedTime(Math.floor((now - params.timestamp) / 1000));
                }
            }, 1000);
        } else {
            setElapsedTime(0);
        }
        return () => clearInterval(interval);
    }, [isCheckedIn]);

    useEffect(() => {
        const initializeDashboard = async () => {
            setSyncLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    // 1. Get numeric Coach ID
                    const { data: coachData } = await supabase
                        .from('coaches')
                        .select('id, pt_rate, salary')
                        .eq('profile_id', user.id)
                        .single();

                    if (coachData) {
                        setCoachId(coachData.id);
                        setPtRate(coachData.pt_rate || 0);
                        setBaseSalary(Number(coachData.salary) || 0);

                        // 2. Sync Attendance using numeric ID
                        const { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', coachData.id)
                            .eq('date', todayStr)
                            .maybeSingle();

                        if (attendance) {
                            const start = new Date(attendance.check_in_time);
                            if (!attendance.check_out_time) {
                                setIsCheckedIn(true);
                                setCheckInTime(format(start, 'HH:mm:ss'));
                                setElapsedTime(Math.floor((new Date().getTime() - start.getTime()) / 1000));
                                localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({
                                    timestamp: start.getTime(),
                                    recordId: attendance.id
                                }));
                            } else {
                                setIsCheckedIn(false);
                                const end = new Date(attendance.check_out_time);
                                setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                            }
                        }

                        // 3. Fetch PT data
                        fetchTodaySessions(coachData.id);
                        fetchPTSubscriptions(coachData.id, coachData.pt_rate || 0);
                    }
                }
            } catch (err) {
                console.error('Initialization failed:', err);
            }
            setSyncLoading(false);
        };

        initializeDashboard();

        const ptSessionsSubscription = supabase.channel('pt_sessions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_sessions' }, () => {
                if (coachId) fetchTodaySessions(coachId);
            })
            .subscribe();

        const ptSubscriptionsChannel = supabase.channel('coach_pt_subscriptions_changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_subscriptions' }, () => {
                if (coachId) fetchPTSubscriptions(coachId, ptRate);
            })
            .subscribe();

        return () => {
            ptSessionsSubscription.unsubscribe();
            ptSubscriptionsChannel.unsubscribe();
        };
    }, []);

    const fetchTodaySessions = async (id: number) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('coach_id', id)
                .eq('date', today)
                .order('created_at', { ascending: false });
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchPTSubscriptions = async (id: number, rate: number) => {
        try {
            const startOfMonth = format(new Date(), 'yyyy-MM-01');
            const { data: sessionsData } = await supabase
                .from('pt_sessions')
                .select('sessions_count')
                .eq('coach_id', id)
                .gte('date', startOfMonth);

            const totalSessions = sessionsData?.reduce((sum, s) => sum + (s.sessions_count || 1), 0) || 0;
            setTotalEarnings(totalSessions * rate);

            const { data } = await supabase
                .from('pt_subscriptions')
                .select('*, students(id, full_name)')
                .eq('coach_id', id)
                .order('status', { ascending: true });

            setPtSubscriptions(data || []);
        } catch (error) {
            console.error('Error fetching PT subscriptions:', error);
        }
    };

    const handleCheckIn = async () => {
        if (!coachId) return toast.error(t('common.error'));
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');
        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .upsert({
                    coach_id: coachId,
                    date: todayStr,
                    check_in_time: now.toISOString()
                }, { onConflict: 'coach_id,date' })
                .select().single();

            if (error) throw error;
            setIsCheckedIn(true);
            setCheckInTime(format(now, 'HH:mm:ss'));
            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({ timestamp: now.getTime(), recordId: data.id }));
            toast.success(t('coach.checkInSuccess'));
        } catch (error: any) {
            toast.error(error.message || t('common.error'));
        }
    };

    const handleCheckOut = async () => {
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const savedStart = localStorage.getItem(`checkInStart_${today}`);
        try {
            if (savedStart) {
                const { recordId, timestamp } = JSON.parse(savedStart);
                await supabase.from('coach_attendance').update({ check_out_time: now.toISOString() }).eq('id', recordId);
                setDailyTotalSeconds(Math.floor((now.getTime() - timestamp) / 1000));
            }
            setIsCheckedIn(false);
            setCheckInTime(null);
            setElapsedTime(0);
            localStorage.removeItem(`checkInStart_${today}`);
            toast.success(t('coach.checkOutSuccess'));
        } catch (error) {
            toast.error(t('common.error'));
        }
    };

    const handleRecordSession = async (sub: any) => {
        if (!coachId) return;
        if (sub.sessions_remaining <= 0) return toast.error('No sessions remaining');

        const loadingToast = toast.loading('Recording session...');
        try {
            // 1. Record the session
            const { error: sessionError } = await supabase.from('pt_sessions').insert({
                coach_id: coachId,
                date: format(new Date(), 'yyyy-MM-dd'),
                sessions_count: 1,
                student_name: sub.students?.full_name || sub.student_name
            });
            if (sessionError) throw sessionError;

            // 2. Decrement remaining and update status
            const newRemaining = sub.sessions_remaining - 1;
            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_remaining: newRemaining,
                    status: newRemaining === 0 ? 'expired' : sub.status
                })
                .eq('id', sub.id);
            if (subError) throw subError;

            // 3. Refresh data
            fetchTodaySessions(coachId);
            fetchPTSubscriptions(coachId, ptRate);
            toast.success('Session recorded!', { id: loadingToast });
        } catch (error) {
            console.error('Error recording session:', error);
            toast.error('Failed to record session', { id: loadingToast });
        }
    };

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Welcome Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-10">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl sm:text-5xl font-black premium-gradient-text tracking-tighter uppercase leading-none">
                        {t('dashboard.welcome')}, COACH! 👋
                    </h1>
                    <p className="text-white/60 mt-4 text-sm sm:text-lg font-bold tracking-[0.2em] uppercase opacity-100 italic">
                        {format(currentTime, 'EEEE, dd MMMM yyyy')}
                    </p>
                </div>
                <div className="flex items-center gap-3 px-6 py-3 bg-white/5 rounded-2xl border border-white/10 shadow-inner group">
                    <Clock className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">{format(currentTime, 'HH:mm:ss')}</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {/* Attendance Card */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group col-span-1 md:col-span-2">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl transition-all duration-700"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('coach.attendance')}</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                                <span className={isCheckedIn ? 'text-emerald-400' : 'text-white/40'}>
                                    {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                                </span>
                            </p>
                        </div>
                        <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="flex flex-col items-center gap-8 relative z-10">
                        {isCheckedIn ? (
                            <div className="text-6xl font-black text-white tracking-widest font-mono animate-in zoom-in-95 duration-500">
                                {formatTimer(elapsedTime)}
                            </div>
                        ) : dailyTotalSeconds > 0 ? (
                            <div className="flex flex-col items-center gap-2 animate-in fade-in slide-in-from-top-4 duration-700">
                                <div className="text-6xl font-black text-emerald-400 tracking-widest font-mono drop-shadow-[0_0_20px_rgba(52,211,153,0.3)]">
                                    {formatTimer(dailyTotalSeconds)}
                                </div>
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Daily Work Summary</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-6xl font-black text-white/10 tracking-widest font-mono">00:00:00</div>
                        )}
                        <button
                            onClick={isCheckedIn ? handleCheckOut : handleCheckIn}
                            className={`group/btn w-full py-6 rounded-[2rem] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-4 transition-all hover:scale-105 active:scale-95 shadow-premium ${isCheckedIn ? 'bg-rose-500/10 border border-rose-500/20 text-rose-500 hover:bg-rose-500 hover:text-white' : 'bg-primary text-white hover:bg-primary/90'}`}
                        >
                            {isCheckedIn ? <XCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
                            {isCheckedIn ? t('coach.checkOut') : t('coach.checkIn')}
                        </button>
                    </div>
                </div>

                {/* Total Earnings Card */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group col-span-1 md:col-span-2">
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl transition-all duration-700"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">Total Earnings</h2>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mt-2">Salary + PT for this month</p>
                        </div>
                        <div className="p-4 bg-amber-500/20 rounded-2xl text-amber-500">
                            <Wallet className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="flex-1 flex flex-col justify-center items-center py-6 relative z-10">
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-6xl font-black text-amber-500 tracking-tighter">{(totalEarnings + baseSalary).toLocaleString()}</h3>
                            <span className="text-sm font-black text-white/20 uppercase tracking-widest">{currency.code}</span>
                        </div>
                        <div className="flex gap-6 mt-6">
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">Base Salary</p>
                                <p className="text-sm font-bold text-white/60">{baseSalary.toLocaleString()} {currency.code}</p>
                            </div>
                            <div className="w-px h-8 bg-white/10"></div>
                            <div className="text-center">
                                <p className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1">PT Earnings</p>
                                <p className="text-sm font-bold text-white/60">{totalEarnings.toLocaleString()} {currency.code}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* PT Sessions Recording Card */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary"><User className="w-6 h-6" /></div>
                        {t('coach.ptSessions')}
                    </h2>
                    {savedSessions.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {savedSessions.map((session) => (
                                <div key={session.id} className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 group hover:border-primary/50 transition-all">
                                    <div className="flex items-center gap-5">
                                        <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary"><User className="w-6 h-6" /></div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-black text-white text-lg tracking-tight">{session.student_name}</p>
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-black rounded-md border border-primary/20">
                                                    {session.sessions_count || 1} {t('common.sessions', 'Sessions')}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{session.created_at ? format(new Date(session.created_at), 'hh:mm a') : '--:--'}</p>
                                        </div>
                                    </div>
                                    <button onClick={async () => {
                                        await supabase.from('pt_sessions').delete().eq('id', session.id);
                                        if (coachId) {
                                            fetchTodaySessions(coachId);
                                            fetchPTSubscriptions(coachId, ptRate);
                                        }
                                        toast.success(t('common.deleteSuccess'));
                                    }} className="text-white/10 hover:text-rose-500"><XCircle className="w-5 h-5" /></button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-10 text-center">
                            <p className="text-white/20 font-black uppercase tracking-widest text-[10px]">No sessions recorded yet today</p>
                        </div>
                    )}
                </div>
            </div>

            {/* My Groups Section */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                    <div className="p-3 bg-accent/20 rounded-2xl text-accent"><User className="w-6 h-6" /></div>
                    {t('dashboard.myGroups', 'My Groups')}
                </h2>
                <GroupsList />
            </div>

            {/* My PT Students Section */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative bg-gradient-to-br from-white/[0.02] to-transparent">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-accent to-primary rounded-2xl text-white shadow-lg"><User className="w-6 h-6" /></div>
                    My PT Students
                </h2>

                {ptSubscriptions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {ptSubscriptions.map((subscription) => (
                            <div key={subscription.id} className="glass-card p-8 rounded-[2.5rem] border border-white/10 hover:border-accent/30 transition-all group relative overflow-hidden">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-black text-2xl">
                                            {(subscription.students?.full_name || subscription.student_name || 'S')?.[0]}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-white text-xl tracking-tight">{subscription.students?.full_name || subscription.student_name || 'Unknown'}</h3>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">PT Student</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black text-white/60 uppercase tracking-wider">Progress</span>
                                                <span className="text-xs font-black text-accent">{subscription.sessions_remaining}/{subscription.sessions_total}</span>
                                            </div>
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                <div className="h-full bg-gradient-to-r from-accent to-primary transition-all rounded-full" style={{ width: `${(subscription.sessions_remaining / subscription.sessions_total) * 100}%` }}></div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRecordSession(subscription)}
                                            disabled={subscription.sessions_remaining <= 0}
                                            className="ml-6 p-4 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-2xl transition-all disabled:opacity-20 disabled:cursor-not-allowed group/record"
                                            title="Record Session"
                                        >
                                            <CheckCircle className="w-6 h-6 group-active/record:scale-90 transition-transform" />
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 mb-6">
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Remaining</p><p className="text-3xl font-black text-accent">{subscription.sessions_remaining}</p></div>
                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5"><p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Rate</p><p className="text-2xl font-black text-white">{ptRate} {currency.code}</p></div>
                                    </div>
                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                        <div><p className="text-[10px] font-black text-white/40 uppercase tracking-widest">Expires</p><p className="text-sm font-bold text-white/80">{format(new Date(subscription.expiry_date), 'MMM dd, yyyy')}</p></div>
                                        <div className={`px-4 py-2 rounded-full border text-xs font-black uppercase ${(new Date(subscription.expiry_date) < new Date() || subscription.status === 'expired') ? 'bg-red-500/10 border-red-500/20 text-red-500' : 'bg-accent/10 border-accent/20 text-accent'}`}>
                                            {(new Date(subscription.expiry_date) < new Date() || subscription.status === 'expired') ? 'Expired' : 'Active'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-16">
                        <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center text-white/20"><User className="w-12 h-12" /></div>
                        <p className="text-white/40 font-black uppercase tracking-widest text-sm">No PT Students Yet</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function GroupsList() {
    const { t } = useTranslation();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    useEffect(() => {
        const fetchGroups = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: coachData } = await supabase.from('coaches').select('id').eq('profile_id', user.id).single();
            if (!coachData) { setLoading(false); return; }
            const { data } = await supabase.from('groups').select('*, levels(name)').eq('coach_id', coachData.id);
            setGroups(data || []);
            setLoading(false);
        };
        fetchGroups();
    }, []);

    if (loading) return <div className="text-center py-10"><div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin mx-auto"></div></div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
                <div key={group.id} onClick={() => setSelectedGroup(group)} className="glass-card p-8 rounded-[2.5rem] border border-white/10 hover:border-accent/30 transition-all cursor-pointer group relative overflow-hidden">
                    <div className="flex items-center justify-between mb-6">
                        <div className="p-4 bg-accent/20 rounded-2xl text-accent"><Calendar className="w-6 h-6" /></div>
                        <ChevronRight className="w-5 h-5 text-white/20 group-hover:text-accent group-hover:translate-x-1 transition-all" />
                    </div>
                    <h3 className="font-black text-white text-xl tracking-tight mb-2 uppercase">{group.name}</h3>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest">{group.levels?.name || 'Level undefined'}</p>
                </div>
            ))}
            {selectedGroup && <GroupDetailsModal group={selectedGroup} onClose={() => setSelectedGroup(null)} />}
        </div>
    );
}

function formatTimer(seconds: number) {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
