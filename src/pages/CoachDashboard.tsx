import { useState, useEffect } from 'react';
import { Clock, Calendar, CheckCircle, XCircle, Globe, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function CoachDashboard() {
    const { t, i18n } = useTranslation();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [ptStudentName, setPtStudentName] = useState('');
    const [savedSessions, setSavedSessions] = useState<any[]>([]);
    const [syncLoading, setSyncLoading] = useState(true);
    const [dailyTotalSeconds, setDailyTotalSeconds] = useState(0);

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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Welcome Section */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold" style={{ color: 'var(--color-primary)' }}>
                        {t('coach.welcome')}
                    </h1>
                    <p className="opacity-70 mt-1 text-xs">
                        {format(currentTime, 'EEEE, MMMM dd, yyyy')}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Attendance Card */}
                <div
                    className="rounded-2xl p-6 shadow-sm border border-gray-100/10"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-base font-bold">{t('coach.attendance')}</h2>
                            <p className="text-[10px] opacity-70 mt-1">
                                {isCheckedIn ? t('coaches.workingNow') : t('coaches.away')}
                            </p>
                        </div>
                        <Clock className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    </div>

                    <div className="flex flex-col items-center gap-4">
                        {syncLoading ? (
                            <div className="flex items-center gap-2 text-sm opacity-50 animate-pulse py-4">
                                <Clock className="w-4 h-4" />
                                {t('common.loading')}...
                            </div>
                        ) : (
                            <>
                                {isCheckedIn && (
                                    <div className="text-3xl font-mono font-bold tracking-wider animate-in fade-in" style={{ color: 'var(--color-primary)' }}>
                                        {formatTimer(elapsedTime)}
                                    </div>
                                )}

                                {!isCheckedIn ? (
                                    <button
                                        onClick={handleCheckIn}
                                        className="px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm w-full justify-center"
                                        style={{ backgroundColor: 'var(--color-primary)' }}
                                    >
                                        <CheckCircle className="w-5 h-5" />
                                        {t('coach.checkIn')}
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleCheckOut}
                                        className="px-6 py-3 bg-red-500 rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2 text-sm w-full justify-center"
                                    >
                                        <XCircle className="w-5 h-5" />
                                        {t('coach.checkOut')}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Daily Work Summary Card */}
                <div
                    className="rounded-2xl p-6 shadow-sm border border-gray-100/10 flex flex-col justify-between"
                    style={{ backgroundColor: 'var(--color-surface)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-base font-bold">
                            {t('coach.dailySummary')}
                        </h2>
                        <Clock className="w-5 h-5 opacity-50" />
                    </div>

                    <div className="flex-1 flex flex-col justify-center items-center py-4">
                        <div className="text-4xl font-mono font-black" style={{ color: 'var(--color-primary)' }}>
                            {formatTimer(isCheckedIn ? elapsedTime : dailyTotalSeconds)}
                        </div>
                        <p className="text-[10px] opacity-40 mt-2 uppercase tracking-widest font-bold">
                            {isCheckedIn ? t('coach.inProgress') : t('coach.totalToday')}
                        </p>
                    </div>

                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-[10px] opacity-50">
                        <span>{t('coach.status')}:</span>
                        <span className={`font-bold ${isCheckedIn ? 'text-green-500' : 'text-gray-400'}`}>
                            {isCheckedIn ? t('coach.active') : t('coach.completed')}
                        </span>
                    </div>
                </div>
            </div>

            {/* PT Sessions Card */}
            <div
                className="rounded-2xl p-6 shadow-sm border border-gray-100/10"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                <h2 className="text-base font-bold mb-3">
                    {t('coach.ptSessions')}
                </h2>
                <p className="text-[10px] opacity-70 mb-4">
                    {t('coach.ptNote')}
                </p>

                <div className="flex flex-col md:flex-row gap-4 items-end">
                    <div className="flex-1 w-full">
                        <label className="text-xs font-medium opacity-70 mb-1.5 block">
                            {t('coach.playerName')}
                        </label>
                        <input
                            type="text"
                            value={ptStudentName}
                            onChange={(e) => setPtStudentName(e.target.value)}
                            className="w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-1 transition-all text-sm"
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.05)',
                                borderColor: 'var(--color-primary)',
                                color: 'inherit'
                            }}
                            placeholder={i18n.language.startsWith('ar') ? 'مثال: أحمد محمد' : 'e.g. John Doe'}
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

                                // 1. Ensure coach record exists in the coaches table
                                // (In case they signed up before we added the auto-create logic in Register)
                                const { data: coachRecord } = await supabase
                                    .from('coaches')
                                    .select('id')
                                    .eq('id', user.id)
                                    .single();

                                if (!coachRecord) {
                                    // Create a basic coach record for them
                                    await supabase.from('coaches').insert({
                                        id: user.id,
                                        full_name: user.user_metadata?.full_name || 'Coach',
                                        specialty: 'Gymnastics Coach',
                                        pt_rate: 0
                                    });
                                }

                                // 2. Save to PT Sessions table
                                const { error } = await supabase
                                    .from('pt_sessions')
                                    .insert({
                                        coach_id: user.id,
                                        date: today,
                                        sessions_count: 1, // Fixed to 1
                                        student_name: ptStudentName,
                                    });

                                if (error) throw error;

                                // Clear inputs
                                setPtStudentName('');

                                // Refresh list
                                fetchTodaySessions();

                                toast.success(t('common.saveSuccess'), {
                                    style: {
                                        background: 'var(--color-surface)',
                                        color: 'var(--color-primary)',
                                        border: '1px solid var(--color-primary)',
                                    }
                                });
                            } catch (error: any) {
                                console.error('Error saving PT sessions:', error);
                                toast.error(t('common.unknown') + ': ' + (error.message || ''));
                            }
                        }}
                        className="px-5 py-2.5 rounded-lg font-bold text-white shadow-lg transition-all hover:scale-105 active:scale-95 text-sm"
                        style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                        {t('coach.add')}
                    </button>
                </div>

                {/* Saved Sessions List */}
                {savedSessions.length > 0 && (
                    <div className="mt-6 space-y-3 pt-4 border-t border-gray-100/5">
                        <h3 className="text-xs font-bold opacity-50 uppercase tracking-wider">{t('coach.savedSessions')}</h3>
                        <div className="grid gap-2">
                            {savedSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 group"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
                                            <User className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{session.student_name}</p>
                                            <p className="text-[10px] opacity-50">
                                                {session.created_at ? format(new Date(session.created_at), 'hh:mm a') : '--:--'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteSession(session.id)}
                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <XCircle className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Today's Schedule */}
            <div
                className="rounded-2xl p-6 shadow-sm border border-gray-100/10"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                <h2 className="text-base font-bold mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    {t('coach.schedule')}
                </h2>

                <div className="space-y-2">
                    {todaySchedule.map((session, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-xl border border-gray-100/10 transition-all hover:scale-[1.01]"
                            style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-xs"
                                        style={{ backgroundColor: 'var(--color-primary)' }}
                                    >
                                        {session.time.split(' ')[0]}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-sm">
                                            {session.class === 'Beginners Class' ? (i18n.language.startsWith('ar') ? 'كورس المبتدئين' : 'Beginners Class') :
                                                session.class === 'Intermediate Training' ? (i18n.language.startsWith('ar') ? 'تدريب متوسط' : 'Intermediate Training') :
                                                    session.class === 'Advanced Gymnastics' ? (i18n.language.startsWith('ar') ? 'جمباز متقدم' : 'Advanced Gymnastics') :
                                                        (i18n.language.startsWith('ar') ? 'كورس أطفال' : 'Kids Fun Class')}
                                        </h3>
                                        <p className="text-[10px] opacity-70">
                                            {session.students} {t('common.students')} • {session.duration}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-[10px] opacity-50">{session.time.split(' ')[1]}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
