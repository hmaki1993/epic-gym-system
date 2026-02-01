import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, Globe, User, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function CoachDashboard() {
    const { t, i18n } = useTranslation();
    const { role, fullName } = useOutletContext<{ role: string, fullName: string }>() || { role: null, fullName: null };
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [ptStudentName, setPtStudentName] = useState('');
    const [ptSessionCount, setPtSessionCount] = useState(1);
    const [savedSessions, setSavedSessions] = useState<any[]>([]); // Restore savedSessions
    const [todaySessions, setTodaySessions] = useState<any[]>([]);
    const [syncLoading, setSyncLoading] = useState(true);
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);

    // Removed redundant toggleLanguage - handled by DashboardLayout

    useEffect(() => {
        // Update clock every second
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    const [elapsedTime, setElapsedTime] = useState(0);

    // Timer logic references
    useEffect(() => {
        let interval: any;

        if (isCheckedIn) {
            interval = setInterval(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const startTime = localStorage.getItem(`checkInStart_${today}`);
                if (startTime) {
                    const params = JSON.parse(startTime);
                    const now = new Date().getTime();
                    const diffInSeconds = Math.floor((now - params.timestamp) / 1000);
                    setElapsedTime(diffInSeconds);
                }
            }, 1000);
        } else {
            setElapsedTime(0);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isCheckedIn]);

    useEffect(() => {
        const syncAttendance = async () => {
            setSyncLoading(true);
            const todayStr = format(new Date(), 'yyyy-MM-dd');

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    const { data: attendance } = await supabase
                        .from('coach_attendance')
                        .select('*')
                        .eq('coach_id', user.id)
                        .eq('date', todayStr)
                        .maybeSingle();

                    if (attendance) {
                        const start = new Date(attendance.check_in_time);
                        if (!attendance.check_out_time) {
                            setIsCheckedIn(true);
                            setCheckInTime(format(start, 'HH:mm:ss'));

                            const now = new Date().getTime();
                            setElapsedTime(Math.floor((now - start.getTime()) / 1000));

                            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({
                                timestamp: start.getTime(),
                                recordId: attendance.id
                            }));
                        } else {
                            setIsCheckedIn(false);
                            const end = new Date(attendance.check_out_time);
                            setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                        }
                        setSyncLoading(false);
                        return;
                    }
                }
            } catch (err) {
                console.error('Sync failed:', err);
            }

            // LocalStorage fallback
            const savedCheckIn = localStorage.getItem(`checkIn_${todayStr}`);
            const savedStart = localStorage.getItem(`checkInStart_${todayStr}`);
            if (savedCheckIn && savedStart) {
                setIsCheckedIn(true);
                setCheckInTime(savedCheckIn);
                const params = JSON.parse(savedStart);
                setElapsedTime(Math.floor((new Date().getTime() - params.timestamp) / 1000));
            }
            setSyncLoading(false);
        };

        syncAttendance();

        // Load saved student name for today
        const today = format(new Date(), 'yyyy-MM-dd');
        const savedStudent = localStorage.getItem(`ptStudent_${today}`);
        if (savedStudent) {
            setPtStudentName(savedStudent);
        }

        fetchTodaySessions();

        // Real-time subscription for PT sessions
        const ptSessionsSubscription = supabase
            .channel('pt_sessions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pt_sessions'
                },
                (payload) => {
                    console.log('PT sessions changed:', payload);
                    fetchTodaySessions();
                }
            )
            .subscribe();

        // Real-time subscription for PT subscriptions
        const ptSubscriptionsChannel = supabase
            .channel('coach_pt_subscriptions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pt_subscriptions'
                },
                (payload) => {
                    console.log('PT subscriptions changed:', payload);
                    fetchPTSubscriptions();
                }
            )
            .subscribe();

        // Fetch PT subscriptions on mount
        fetchPTSubscriptions();

        // Real-time subscription for coach attendance
        const attendanceSubscription = supabase
            .channel('coach_attendance_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'coach_attendance'
                },
                async (payload) => {
                    console.log('Coach attendance changed:', payload);
                    // Re-sync attendance data
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        const { data: attendance } = await supabase
                            .from('coach_attendance')
                            .select('*')
                            .eq('coach_id', user.id)
                            .eq('date', todayStr)
                            .maybeSingle();

                        if (attendance) {
                            const start = new Date(attendance.check_in_time);
                            if (!attendance.check_out_time) {
                                setIsCheckedIn(true);
                                setCheckInTime(format(start, 'HH:mm:ss'));
                                const now = new Date().getTime();
                                setElapsedTime(Math.floor((now - start.getTime()) / 1000));
                            } else {
                                setIsCheckedIn(false);
                                const end = new Date(attendance.check_out_time);
                                setDailyTotalSeconds(Math.floor((end.getTime() - start.getTime()) / 1000));
                            }
                        }
                    }
                }
            )
            .subscribe();

        // Cleanup subscriptions
        return () => {
            ptSessionsSubscription.unsubscribe();
            ptSubscriptionsChannel.unsubscribe();
            attendanceSubscription.unsubscribe();
        };
    }, []);

    const fetchTodaySessions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const today = format(new Date(), 'yyyy-MM-dd');
            const { data, error } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('coach_id', user.id)
                .eq('date', today)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSavedSessions(data || []);
        } catch (error) {
            console.error('Error fetching sessions:', error);
        }
    };

    const fetchPTSubscriptions = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('pt_subscriptions')
                .select(`
                    *,
                    students(id, full_name)
                `)
                .eq('coach_id', user.id)
                // Removed .eq('status', 'active') to show expired subscriptions too
                .order('status', { ascending: true }) // Active first, then expired
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPtSubscriptions(data || []);
        } catch (error) {
            console.error('Error fetching PT subscriptions:', error);
        }
    };

    const handleDeleteSession = async (id: string) => {
        try {
            const { error } = await supabase
                .from('pt_sessions')
                .delete()
                .eq('id', id);

            if (error) throw error;
            toast.success(t('common.saveSuccess'));
            fetchTodaySessions();
        } catch (error) {
            console.error('Error deleting session:', error);
            toast.error(t('common.deleteError'));
        }
    };

    const formatTimer = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleCheckIn = async () => {
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return toast.error(t('common.login'));

            // Upsert attendance record - this handles "already exists" perfectly
            const { data, error } = await supabase
                .from('coach_attendance')
                .upsert({
                    coach_id: user.id,
                    date: todayStr,
                    check_in_time: now.toISOString(),
                }, {
                    onConflict: 'coach_id,date',
                    ignoreDuplicates: false // We want to update it if it exists by some chance
                })
                .select()
                .single();

            if (error) throw error;

            setIsCheckedIn(true);
            setCheckInTime(format(now, 'HH:mm:ss'));
            localStorage.setItem(`checkInStart_${todayStr}`, JSON.stringify({
                timestamp: now.getTime(),
                recordId: data.id
            }));

            toast.success(t('coach.checkInSuccess'));
        } catch (error: any) {
            console.error('Check-in error:', error);
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

                // Update record on Supabase
                const { error } = await supabase
                    .from('coach_attendance')
                    .update({
                        check_out_time: now.toISOString()
                    })
                    .eq('id', recordId);

                if (error) throw error;

                // Calculate final duration
                setDailyTotalSeconds(Math.floor((now.getTime() - timestamp) / 1000));
            } else {
                // Fallback: update most recent active record for this coach
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase
                        .from('coach_attendance')
                        .update({ check_out_time: now.toISOString() })
                        .eq('coach_id', user.id)
                        .eq('date', today)
                        .is('check_out_time', null);
                }
            }

            // Cleanup local state
            setIsCheckedIn(false);
            setCheckInTime(null);
            setElapsedTime(0);
            localStorage.removeItem(`checkIn_${today}`);
            localStorage.removeItem(`checkInStart_${today}`);

            toast.success(t('coach.checkOutSuccess'));

        } catch (error) {
            console.error('Check-out error:', error);
            toast.error(t('common.error'));
        }
    };

    // Mock schedule data
    const todaySchedule = [
        { time: '09:00 AM', class: 'Beginners Class', students: 12, duration: '1h' },
        { time: '11:00 AM', class: 'Intermediate Training', students: 8, duration: '1.5h' },
        { time: '02:00 PM', class: 'Advanced Gymnastics', students: 6, duration: '2h' },
        { time: '05:00 PM', class: 'Kids Fun Class', students: 15, duration: '1h' },
    ];

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Attendance Card */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-all duration-700"></div>

                    <div className="flex items-center justify-between mb-10 relative z-10">
                        <div>
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">{t('coach.attendance')}</h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${isCheckedIn ? 'bg-emerald-400 animate-pulse' : 'bg-white/20'}`}></span>
                                <span className={isCheckedIn ? 'text-emerald-400' : 'text-white/40'}>
                                    {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                                </span>
                            </p>
                        </div>
                        <div className="p-4 bg-primary/20 rounded-2xl text-primary shadow-inner">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="flex flex-col items-center gap-8 relative z-10">
                        {syncLoading ? (
                            <div className="flex flex-col items-center gap-4 py-10">
                                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">{t('common.loading')}...</span>
                            </div>
                        ) : (
                            <>
                                {isCheckedIn && (
                                    <div className="text-6xl font-black text-white tracking-widest animate-in zoom-in-95 duration-500 font-mono">
                                        {formatTimer(elapsedTime)}
                                    </div>
                                )}

                                {!isCheckedIn ? (
                                    <button
                                        onClick={handleCheckIn}
                                        className="group/btn bg-primary hover:bg-primary/90 text-white px-12 py-6 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-4 font-black uppercase tracking-widest text-sm relative overflow-hidden w-full justify-center"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                        <CheckCircle className="w-6 h-6 relative z-10" />
                                        <span className="relative z-10">{t('coach.checkIn')}</span>
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCheckOut}
                                        className="group/btn bg-rose-500/10 hover:bg-rose-500 border border-rose-500/20 text-rose-500 hover:text-white px-12 py-6 rounded-[2rem] shadow-premium transition-all hover:scale-105 active:scale-95 flex items-center gap-4 font-black uppercase tracking-widest text-sm relative overflow-hidden w-full justify-center"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                                        <XCircle className="w-6 h-6 relative z-10" />
                                        <span className="relative z-10">{t('coach.checkOut')}</span>
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Daily Work Summary Card */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group flex flex-col justify-between">
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-all duration-700"></div>

                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            {t('coach.dailySummary')}
                        </h2>
                        <div className="p-4 bg-white/5 rounded-2xl text-white/20 group-hover:text-primary transition-colors">
                            <Clock className="w-6 h-6" />
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center py-10 relative z-10">
                        <div className="text-6xl font-black text-primary tracking-tighter group-hover:scale-110 transition-transform duration-500 font-mono">
                            {formatTimer(isCheckedIn ? elapsedTime : dailyTotalSeconds)}
                        </div>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mt-4">
                            {isCheckedIn ? t('coach.inProgress') : t('coach.totalToday')}
                        </p>
                    </div>

                    <div className="pt-8 border-t border-white/5 flex justify-between items-center relative z-10">
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">{t('coach.status')}:</span>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isCheckedIn ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20 shadow-lg shadow-emerald-400/5' : 'bg-white/5 text-white/30 border-white/10'}`}>
                            {isCheckedIn ? t('coach.active') : t('coach.completed')}
                        </div>
                    </div>
                </div>
            </div>

            {/* PT Sessions Card */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden bg-white/[0.01]">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                            <User className="w-6 h-6" />
                        </div>
                        {t('coach.ptSessions')}
                    </h2>
                    <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mb-10 ml-16">
                        {t('coach.ptNote')}
                    </p>

                    <div className="flex flex-col md:flex-row gap-6 items-end mb-12">
                        <div className="flex-1 w-full group">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors">
                                {t('coach.playerName')}
                            </label>
                            <input
                                type="text"
                                value={ptStudentName}
                                onChange={(e) => setPtStudentName(e.target.value)}
                                className="w-full px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/10 outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold text-lg"
                                placeholder={i18n.language.startsWith('ar') ? 'مثال: أحمد محمد' : 'e.g. John Doe'}
                            />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors">
                                {t('pt.sessionCount') || 'Count'}
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={ptSessionCount}
                                onChange={(e) => setPtSessionCount(parseInt(e.target.value) || 1)}
                                className="w-24 px-6 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 outline-none transition-all focus:ring-8 focus:ring-primary/5 font-black text-xl text-center"
                            />
                        </div>
                        <button
                            onClick={async () => {
                                if (!ptStudentName.trim()) {
                                    toast.error(t('coach.enterNameError'));
                                    return;
                                }
                                try {
                                    const { data: { user } } = await supabase.auth.getUser();
                                    if (!user) {
                                        toast.error(t('common.login'));
                                        return;
                                    }

                                    const today = format(new Date(), 'yyyy-MM-dd');

                                    // 1. Ensure coach record exists
                                    const { data: coachRecord } = await supabase
                                        .from('coaches')
                                        .select('id')
                                        .eq('id', user.id)
                                        .single();

                                    if (!coachRecord) {
                                        await supabase.from('coaches').insert({
                                            id: user.id,
                                            full_name: user.user_metadata?.full_name || 'Coach',
                                            specialty: 'Gymnastics Coach',
                                            pt_rate: 0
                                        });
                                    }

                                    // 2. Save session
                                    const { error } = await supabase
                                        .from('pt_sessions')
                                        .insert({
                                            coach_id: user.id,
                                            date: today,
                                            sessions_count: ptSessionCount,
                                            student_name: ptStudentName,
                                        });

                                    if (error) throw error;

                                    // 3. Try to record payment (Best Effort)
                                    try {
                                        // Find student by name
                                        const { data: students } = await supabase
                                            .from('students')
                                            .select('id')
                                            .ilike('full_name', ptStudentName)
                                            .limit(1);

                                        if (students && students.length > 0) {
                                            const studentId = students[0].id;
                                            // Get coach rate if not already available
                                            let rate = 0;
                                            if (user.user_metadata?.pt_rate) {
                                                rate = user.user_metadata.pt_rate;
                                            } else {
                                                const { data: coachData } = await supabase
                                                    .from('coaches')
                                                    .select('pt_rate')
                                                    .eq('id', user.id)
                                                    .single();
                                                rate = coachData?.pt_rate || 0;
                                            }

                                            if (rate > 0) {
                                                await supabase.from('payments').insert({
                                                    student_id: studentId,
                                                    amount: rate * ptSessionCount,
                                                    payment_date: new Date().toISOString(),
                                                    payment_method: 'cash',
                                                    notes: `PT Session - ${ptStudentName}`
                                                });

                                                // Note: We can't easily invalidate queries here as we don't have queryClient context easily accessible without refactoring
                                                // But since this is a separate dashboard, it might be fine.
                                                // Ideally we should use useQueryClient like we did in AddStudentForm.
                                            }
                                        }
                                    } catch (payError) {
                                        console.error('Error recording auto-payment for PT session:', payError);
                                        // Don't block the UI for payment error
                                    }

                                    setPtStudentName('');
                                    setPtSessionCount(1);
                                    fetchTodaySessions();
                                    toast.success(t('common.saveSuccess'));
                                } catch (error: any) {
                                    console.error('Error saving PT sessions:', error);
                                    toast.error(t('common.unknown'));
                                }
                            }}
                            className="group/add bg-primary hover:bg-primary/90 text-white px-12 py-5 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 font-black uppercase tracking-widest text-xs min-w-[180px] h-[72px] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/add:translate-y-0 transition-transform duration-500"></div>
                            <span className="relative z-10">{t('coach.add')}</span>
                        </button>
                    </div>

                    {/* Saved Sessions List */}
                    {savedSessions.length > 0 && (
                        <div className="space-y-6 pt-10 border-t border-white/5 animate-in fade-in duration-700">
                            <h3 className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] ml-4">{t('coach.savedSessions')}</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {savedSessions.map((session) => (
                                    <div
                                        key={session.id}
                                        className="flex items-center justify-between p-6 rounded-[2rem] bg-white/[0.02] border border-white/10 group hover:border-primary/50 transition-all duration-500 hover:scale-[1.02] shadow-premium"
                                    >
                                        <div className="flex items-center gap-5">
                                            <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                                <User className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-white text-lg tracking-tight group-hover:text-primary transition-colors">{session.student_name}</p>
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">
                                                    {session.created_at ? format(new Date(session.created_at), 'hh:mm a') : '--:--'}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteSession(session.id)}
                                            className="p-3 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-2xl transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Today's Schedule */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden">
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-[120px] pointer-events-none"></div>

                <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4 relative z-10">
                    <div className="p-3 bg-accent/20 rounded-2xl text-accent">
                        <Calendar className="w-6 h-6" />
                    </div>
                    {t('coach.schedule')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
                    {todaySchedule.map((session, index) => (
                        <div
                            key={index}
                            className="p-8 rounded-[2.5rem] border border-white/5 bg-white/[0.02] transition-all hover:scale-[1.02] hover:bg-white/[0.05] hover:border-white/10 group shadow-premium"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className="w-16 h-16 rounded-[1.5rem] bg-primary text-white flex flex-col items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-6 transition-all duration-500">
                                        <span className="text-xl font-black leading-none">{session.time.split(' ')[0].split(':')[0]}</span>
                                        <span className="text-[10px] font-black uppercase opacity-60">{session.time.split(' ')[1]}</span>
                                    </div>
                                    <div>
                                        <h3 className="font-black text-white text-xl tracking-tight group-hover:text-primary transition-colors">
                                            {session.class === 'Beginners Class' ? (i18n.language.startsWith('ar') ? 'كورس المبتدئين' : 'Beginners Class') :
                                                session.class === 'Intermediate Training' ? (i18n.language.startsWith('ar') ? 'تدريب متوسط' : 'Intermediate Training') :
                                                    session.class === 'Advanced Gymnastics' ? (i18n.language.startsWith('ar') ? 'جمباز متقدم' : 'Advanced Gymnastics') :
                                                        (i18n.language.startsWith('ar') ? 'كورس أطفال' : 'Kids Fun Class')}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] bg-white/5 px-3 py-1 rounded-lg">
                                                {session.students} {t('common.students')}
                                            </span>
                                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">
                                                {session.duration}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* My PT Students Section */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-accent/10 to-primary/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-8 flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-accent to-primary rounded-2xl text-white shadow-lg shadow-accent/20">
                            <User className="w-6 h-6" />
                        </div>
                        My PT Students
                        <span className="px-3 py-1 bg-accent/20 text-accent text-xs rounded-full border border-accent/30 font-black uppercase tracking-wider">
                            Premium
                        </span>
                    </h2>

                    {ptSubscriptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ptSubscriptions.map((subscription) => (
                                <div
                                    key={subscription.id}
                                    className="glass-card p-8 rounded-[2.5rem] border border-white/10 hover:border-accent/30 transition-all duration-500 group hover:scale-[1.02] relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem]"></div>

                                    <div className="relative z-10">
                                        {/* Student Info */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-accent/20 group-hover:scale-110 transition-transform">
                                                {subscription.students?.full_name?.[0] || 'S'}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="font-black text-white text-xl tracking-tight group-hover:text-accent transition-colors">
                                                    {subscription.students?.full_name || 'Unknown'}
                                                </h3>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                                                    PT Student
                                                </p>
                                            </div>
                                        </div>

                                        {/* Sessions Progress */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-3">
                                                <span className="text-xs font-black text-white/60 uppercase tracking-wider">Sessions Progress</span>
                                                <span className="text-xs font-black text-accent">
                                                    {subscription.sessions_remaining}/{subscription.sessions_total}
                                                </span>
                                            </div>
                                            <div className="h-3 bg-white/5 rounded-full overflow-hidden border border-white/10">
                                                <div
                                                    className="h-full bg-gradient-to-r from-accent to-primary transition-all duration-500 rounded-full"
                                                    style={{
                                                        width: `${(subscription.sessions_remaining / subscription.sessions_total) * 100}%`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Remaining</p>
                                                <p className="text-3xl font-black text-accent">{subscription.sessions_remaining}</p>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Per Session</p>
                                                <p className="text-2xl font-black text-white">${subscription.price_per_session}</p>
                                            </div>
                                        </div>

                                        {/* Expiry Date */}
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Expires</p>
                                                <p className="text-sm font-bold text-white/80">{format(new Date(subscription.expiry_date), 'MMM dd, yyyy')}</p>
                                            </div>
                                            {(() => {
                                                const isExpired = new Date(subscription.expiry_date) < new Date();
                                                return isExpired ? (
                                                    <div className="px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-full animate-pulse">
                                                        <span className="text-xs font-black text-red-500 uppercase tracking-wider">Expired</span>
                                                    </div>
                                                ) : (
                                                    <div className="px-4 py-2 bg-accent/10 border border-accent/20 rounded-full">
                                                        <span className="text-xs font-black text-accent uppercase tracking-wider">Active</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Payment Alert for Expired */}
                                        {(() => {
                                            const isExpired = new Date(subscription.expiry_date) < new Date();
                                            return isExpired && (
                                                <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in duration-300">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                        <p className="text-xs font-black text-red-500 uppercase tracking-wider">
                                                            Payment Required
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] text-red-400/80 mt-2 font-bold">
                                                        Student needs to renew subscription
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                <User className="w-12 h-12 text-white/20" />
                            </div>
                            <p className="text-white/40 font-black uppercase tracking-widest text-sm">No PT Students Yet</p>
                            <p className="text-white/20 text-xs mt-2">PT students will appear here when assigned</p>
                        </div>
                    )}
                </div>
            </div>

            {/* My Groups Section */}
            <div className="mt-8">
                <h2 className="text-2xl font-black text-white italic tracking-tighter mb-6 flex items-center gap-3">
                    <User className="w-6 h-6 text-primary" />
                    MY <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">GROUPS</span>
                </h2>
                <GroupsList />
            </div>
        </div > // End of main div
    );
}

// Add import at the top
import GroupDetailsModal from '../components/GroupDetailsModal';

// ... (existing imports)

function GroupsList() {
    const { t } = useTranslation();
    const [groups, setGroups] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedGroup, setSelectedGroup] = useState<any>(null);

    useEffect(() => {
        let coachId: string | null = null;

        const fetchGroups = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get Coach ID from profile
            const { data: coachData } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (!coachData) {
                setLoading(false);
                return;
            }

            coachId = coachData.id;

            // 2. Fetch Groups using Coach ID
            const { data, error } = await supabase
                .from('training_groups')
                .select('*, students(id, full_name, birth_date)')
                .eq('coach_id', coachData.id)
                .order('name', { ascending: true });

            if (error) {
                console.error('Error fetching groups:', error);
            } else {
                setGroups(data || []);
            }
            setLoading(false);
        };

        fetchGroups();

        // Real-time subscription for training_groups changes
        const groupsSubscription = supabase
            .channel('training_groups_changes')
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
                    schema: 'public',
                    table: 'training_groups'
                },
                async (payload) => {
                    console.log('Training groups changed:', payload);
                    // Refetch groups when any change happens
                    if (coachId) {
                        const { data } = await supabase
                            .from('training_groups')
                            .select('*, students(id, full_name, birth_date)')
                            .eq('coach_id', coachId)
                            .order('name', { ascending: true });

                        if (data) {
                            setGroups(data);
                        }
                    }
                }
            )
            .subscribe();

        // Real-time subscription for students changes (affects group member counts)
        const studentsSubscription = supabase
            .channel('students_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'students'
                },
                async (payload) => {
                    console.log('Students changed:', payload);
                    // Refetch groups when students are updated
                    if (coachId) {
                        const { data } = await supabase
                            .from('training_groups')
                            .select('*, students(id, full_name, birth_date)')
                            .eq('coach_id', coachId)
                            .order('name', { ascending: true });

                        if (data) {
                            setGroups(data);
                        }
                    }
                }
            )
            .subscribe();

        // Cleanup subscriptions on unmount
        return () => {
            groupsSubscription.unsubscribe();
            studentsSubscription.unsubscribe();
        };
    }, []);

    if (loading) return <div className="text-white/40 italic">Loading groups...</div>;
    if (groups.length === 0) return <div className="p-6 bg-white/5 rounded-2xl border border-white/10 text-white/40 italic">No groups assigned yet.</div>;

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {groups.map(group => (
                    <div key={group.id} className="glass-card p-6 rounded-3xl border border-white/10 relative group hover:-translate-y-1 transition-transform duration-300 flex flex-col">
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl pointer-events-none"></div>
                        <div className="relative z-10 flex-1">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    {/* Icon removed as requested */}
                                </div>
                                <span className="px-3 py-1 bg-white/5 rounded-lg text-xs font-black text-white/60 uppercase tracking-widest border border-white/5">
                                    {group.students?.length || 0} Students
                                </span>
                            </div>
                            <h3 className="text-xl font-black text-white tracking-wide mb-1">{group.name}</h3>
                            <p className="text-white/40 text-xs font-mono tracking-widest uppercase mb-6">
                                {group.schedule_key.split('|').length} Sessions / Week
                            </p>

                            <button
                                onClick={() => setSelectedGroup(group)}
                                className="w-full py-3 rounded-xl bg-white/5 hover:bg-primary hover:text-white border border-white/10 hover:border-primary/20 text-white/60 font-black text-xs uppercase tracking-widest transition-all duration-300 group/btn flex items-center justify-center gap-2"
                            >
                                View Gymnasts
                                <ChevronRight className="w-4 h-4 opacity-0 group-hover/btn:opacity-100 -translate-x-2 group-hover/btn:translate-x-0 transition-all" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {selectedGroup && (
                <GroupDetailsModal
                    group={selectedGroup}
                    onClose={() => setSelectedGroup(null)}
                />
            )}
        </>
    );
}
