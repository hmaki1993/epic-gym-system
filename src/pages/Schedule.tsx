import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight, CalendarDays, LogOut } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addDays, addMonths } from 'date-fns';
import AddSessionForm from '../components/AddSessionForm';

interface Session {
    id: string;
    title: string;
    start_time: string;
    end_time: string;
    day_of_week: string;
    coach_id: string;
    coaches: {
        full_name: string;
    };
    capacity: number;
}

type ViewMode = 'day' | 'week' | 'month';

export default function Schedule() {
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const [sessions, setSessions] = useState<Session[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('week');
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingSession, setEditingSession] = useState<Session | null>(null);

    // Attendance State
    const [attendanceToday, setAttendanceToday] = useState<any>(null);
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [coachId, setCoachId] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState<string>('00:00:00');

    // Hoisted functions
    const fetchSessions = async () => {
        setLoading(true);

        let query = supabase
            .from('training_sessions')
            .select(`
                *,
                coaches ( full_name )
            `);

        // If user is a simple coach, only show THEIR sessions
        if (role === 'coach') {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Find the coach record for this user
                const { data: coachData } = await supabase
                    .from('coaches')
                    .select('id')
                    .eq('profile_id', user.id)
                    .single();

                if (coachData) {
                    query = query.eq('coach_id', coachData.id);
                }
            }
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error loading schedule:', error);
        } else {
            setSessions(data || []);
        }
        setLoading(false);
    };

    const fetchAttendanceStatus = async () => {
        setAttendanceLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            // 1. Get Coach ID
            const { data: coachData } = await supabase
                .from('coaches')
                .select('id')
                .eq('profile_id', user.id)
                .single();

            if (coachData) {
                setCoachId(coachData.id);
                // 2. Check today's attendance
                const today = new Date().toISOString().split('T')[0];
                const { data: attendance } = await supabase
                    .from('coach_attendance')
                    .select('*')
                    .eq('coach_id', coachData.id)
                    .eq('date', today)
                    .single();

                setAttendanceToday(attendance);
            }
        }
        setAttendanceLoading(false);
    };

    useEffect(() => {
        fetchSessions();
        if (role === 'coach') {
            fetchAttendanceStatus();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [role]);

    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (attendanceToday && attendanceToday.check_in_time && !attendanceToday.check_out_time) {
            const startTime = new Date(attendanceToday.check_in_time).getTime();

            const updateTimer = () => {
                const now = new Date().getTime();
                const diff = now - startTime;

                const hours = Math.floor(diff / (1000 * 60 * 60));
                const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((diff % (1000 * 60)) / 1000); // Fixed parentheses

                setElapsedTime(
                    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
                );
            };

            updateTimer(); // Initial call
            interval = setInterval(updateTimer, 1000);
        }

        return () => clearInterval(interval);
    }, [attendanceToday]);



    const handleCheckIn = async () => {
        if (!coachId) return;
        setAttendanceLoading(true);
        const today = new Date().toISOString().split('T')[0];
        // const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

        const { data, error } = await supabase
            .from('coach_attendance')
            .insert({
                coach_id: coachId,
                date: today,
                check_in_time: new Date().toISOString()
            })
            .select()
            .single();

        if (error) console.error('Check-in failed:', error);
        else setAttendanceToday(data);
        setAttendanceLoading(false);
    };

    const handleCheckOut = async () => {
        if (!attendanceToday) return;
        setAttendanceLoading(true);
        // const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

        const { data, error } = await supabase
            .from('coach_attendance')
            .update({ check_out_time: new Date().toISOString() })
            .eq('id', attendanceToday.id)
            .select()
            .single();

        if (error) console.error('Check-out failed:', error);
        else setAttendanceToday(data);
        setAttendanceLoading(false);
    };



    const navigateDate = (direction: 'prev' | 'next') => {
        if (viewMode === 'day') {
            setCurrentDate(d => direction === 'next' ? addDays(d, 1) : addDays(d, -1));
        } else if (viewMode === 'week') {
            setCurrentDate(d => direction === 'next' ? addDays(d, 7) : addDays(d, -7));
        } else {
            setCurrentDate(d => direction === 'next' ? addMonths(d, 1) : addMonths(d, -1));
        }
    };

    const getSessionsForDay = (date: Date) => {
        const dayName = format(date, 'EEEE');
        return sessions.filter(s => s.day_of_week === dayName);
    };

    const renderHeader = () => (
        <div className="flex flex-col gap-8 mb-10">
            <div className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/5 pb-8">
                <div className="text-center md:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">Class Schedule</h1>
                    <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">Manage training sessions and timings</p>
                </div>

                {/* Coach Attendance Controls */}
                {role === 'coach' && (
                    <div className="glass-card p-3 rounded-2xl border border-white/10 shadow-premium flex items-center gap-4">
                        {!attendanceToday ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={attendanceLoading}
                                className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-3 active:scale-95"
                            >
                                <Clock className="w-5 h-5 text-white" />
                                Check In
                            </button>
                        ) : !attendanceToday.check_out_time ? (
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-3 rounded-xl border border-emerald-500/20">
                                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                    <span className="text-xl font-mono font-black text-emerald-400 min-w-[100px] text-center tracking-tighter">
                                        {elapsedTime}
                                    </span>
                                </div>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={attendanceLoading}
                                    className="bg-rose-500 hover:bg-rose-600 text-white px-8 py-3 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-rose-500/20 transition-all flex items-center gap-3 active:scale-95"
                                >
                                    <LogOut className="w-5 h-5 text-white" />
                                    Check Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 bg-emerald-500/5 px-6 py-4 rounded-xl border border-emerald-500/10">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Clock className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-emerald-400/50 uppercase tracking-widest">Shift Completed</span>
                                    <span className="text-sm font-black text-emerald-400 uppercase tracking-tight">
                                        {new Date(attendanceToday.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(attendanceToday.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-6 glass-card p-2 rounded-[1.5rem] shadow-premium border border-white/10">
                    <div className="flex items-center gap-2 border-r border-white/5 pr-4 pl-2">
                        <button onClick={() => navigateDate('prev')} className="p-3 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-black text-white px-4 min-w-[180px] text-center uppercase tracking-widest text-xs">
                            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM dd, yyyy')}
                        </span>
                        <button onClick={() => navigateDate('next')} className="p-3 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex p-1.5 bg-white/5 rounded-xl border border-white/5">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'month' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'week' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`px-5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'day' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/30 hover:text-white hover:bg-white/5'}`}
                        >
                            Day
                        </button>
                    </div>

                    {['admin', 'head_coach'].includes(role || '') && (
                        <button
                            onClick={() => {
                                setEditingSession(null);
                                setShowAddModal(true);
                            }}
                            className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 border border-white/10"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-black uppercase tracking-widest text-[10px] hidden md:inline">Add Class</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const startDate = startOfWeek(monthStart, { weekStartsOn: 6 });
        const endDate = endOfWeek(monthEnd, { weekStartsOn: 6 });
        const days = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="overflow-x-auto pb-6 custom-scrollbar">
                <div className="grid grid-cols-7 gap-px bg-white/5 rounded-[2rem] overflow-hidden border border-white/10 min-w-[900px] shadow-premium">
                    {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                        <div key={day} className="bg-white/5 p-4 text-center text-[10px] font-black text-white/30 uppercase tracking-[0.2em] border-b border-white/5">
                            {day}
                        </div>
                    ))}
                    {days.map((day: Date, _dayIdx: number) => {
                        const isToday = isSameDay(day, new Date());
                        const daySessions = getSessionsForDay(day);
                        // Check if day is current month
                        const isCurrentMonth = day.getMonth() === currentDate.getMonth() && day.getFullYear() === currentDate.getFullYear();

                        return (
                            <div
                                key={day.toString()}
                                className={`bg-slate-900/50 min-h-[140px] p-4 relative group hover:bg-white/[0.03] transition-all cursor-pointer ${!isCurrentMonth ? 'opacity-30' : ''}`}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <span className={`text-xs font-black tracking-widest ${isToday ? 'bg-primary text-white w-8 h-8 flex items-center justify-center rounded-xl shadow-lg shadow-primary/30 scale-110 mb-2' : isCurrentMonth ? 'text-white/60' : 'text-white/20'}`}>
                                    {format(day, 'd')}
                                </span>

                                <div className="mt-4 space-y-1.5">
                                    {daySessions.slice(0, 3).map(session => (
                                        <div
                                            key={session.id}
                                            className="text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 truncate group-hover:bg-primary/20 transition-colors"
                                            title={`${session.title} (${session.start_time.slice(0, 5)})`}
                                        >
                                            {session.start_time.slice(0, 5)} {session.title}
                                        </div>
                                    ))}
                                    {daySessions.length > 3 && (
                                        <div className="text-[9px] font-black uppercase tracking-widest text-white/20 pl-2 mt-2">
                                            + {daySessions.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 6 });
        const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-6">
                {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const daySessions = getSessionsForDay(day);

                    return (
                        <div key={i} className={`flex flex-col gap-4 ${isToday ? 'relative' : ''}`}>
                            {isToday && (
                                <div className="absolute -inset-2 bg-primary/5 rounded-[2.5rem] blur-xl opacity-50"></div>
                            )}
                            <div
                                className={`relative z-10 text-center p-5 rounded-[1.5rem] cursor-pointer transition-all duration-500 hover:scale-105 border ${isToday ? 'bg-primary text-white shadow-premium border-primary' : 'glass-card border-white/10 hover:border-primary/50 text-white/60'}`}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 ${isToday ? 'text-white/80' : 'text-white/30'}`}>{format(day, 'EEE')}</p>
                                <p className="text-2xl font-black tracking-tight">{format(day, 'dd')}</p>
                            </div>

                            <div className="relative z-10 space-y-3">
                                {daySessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSession(session);
                                            setShowAddModal(true);
                                        }}
                                        className="glass-card p-5 rounded-2xl border border-white/10 shadow-lg hover:shadow-premium transition-all duration-500 border-l-4 border-l-primary group cursor-pointer hover:scale-[1.05]"
                                    >
                                        <h4 className="font-black text-white text-sm group-hover:text-primary transition-colors uppercase tracking-tight line-clamp-2">{session.title}</h4>
                                        <div className="mt-4 space-y-2">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                                <Clock className="w-3 h-3 text-primary" />
                                                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                            </p>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-white/30 flex items-center gap-2">
                                                <Users className="w-3 h-3 text-primary" />
                                                Coach {session.coaches?.full_name.split(' ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {daySessions.length === 0 && (
                                    <div className="h-28 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl text-white/20 gap-2">
                                        <CalendarIcon className="w-5 h-5 opacity-20" />
                                        <span className="text-[9px] font-black uppercase tracking-widest opacity-50">Empty</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const daySessions = getSessionsForDay(currentDate);

        return (
            <div className="glass-card rounded-[3rem] shadow-premium border border-white/10 overflow-hidden max-w-4xl mx-auto">
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="font-black text-2xl text-white uppercase tracking-tight flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                            <CalendarDays className="w-6 h-6" />
                        </div>
                        {format(currentDate, 'EEEE, MMMM do')}
                    </h3>
                </div>
                <div className="divide-y divide-white/5">
                    {daySessions.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                                <CalendarIcon className="w-10 h-10 text-white/10" />
                            </div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tight">No classes scheduled</h3>
                            <p className="text-white/30 mt-2 font-bold uppercase tracking-widest text-xs">Enjoy your free day!</p>
                        </div>
                    ) : (
                        daySessions
                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                            .map(session => (
                                <div
                                    key={session.id}
                                    className="p-8 flex items-center gap-8 hover:bg-white/[0.03] transition-all cursor-pointer group"
                                    onClick={() => {
                                        setEditingSession(session);
                                        setShowAddModal(true);
                                    }}
                                >
                                    <div className="text-center min-w-[100px] bg-white/5 p-4 rounded-2xl border border-white/5 group-hover:border-primary/20 group-hover:bg-primary/5 transition-all">
                                        <p className="font-black text-white text-xl tracking-tighter">{session.start_time.slice(0, 5)}</p>
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">{session.end_time.slice(0, 5)}</p>
                                    </div>
                                    <div className="w-1 h-16 bg-white/5 rounded-full group-hover:bg-primary transition-all duration-500"></div>
                                    <div className="flex-1">
                                        <h4 className="font-black text-white text-xl group-hover:text-primary transition-colors uppercase tracking-tight">{session.title}</h4>
                                        <div className="flex flex-wrap items-center gap-6 mt-3">
                                            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                                                <Users className="w-4 h-4 text-primary" />
                                                Coach {session.coaches?.full_name}
                                            </span>
                                            <span className="flex items-center gap-2 bg-primary/10 px-3 py-1.5 rounded-lg text-primary text-[10px] font-black uppercase tracking-widest border border-primary/20">
                                                {session.capacity} Spots Available
                                            </span>
                                        </div>
                                    </div>
                                    <div className="hidden md:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-4 group-hover:translate-x-0">
                                        Edit Details
                                        <ChevronRight className="w-4 h-4" />
                                    </div>
                                </div>
                            ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {renderHeader()}

            {viewMode === 'month' && renderMonthView()}
            {viewMode === 'week' && renderWeekView()}
            {viewMode === 'day' && renderDayView()}

            {showAddModal && (
                <AddSessionForm
                    initialData={editingSession}
                    onClose={() => setShowAddModal(false)}
                    onSuccess={fetchSessions}
                />
            )}
        </div>
    );
}
