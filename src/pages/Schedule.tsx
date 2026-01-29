import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar as CalendarIcon, Clock, Users, Plus, ChevronLeft, ChevronRight, LayoutGrid, List, CalendarDays, LogOut } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addDays, addMonths, subMonths, addWeeks, subWeeks, startOfDay, isWithinInterval } from 'date-fns';
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

    useEffect(() => {
        fetchSessions();
        if (role === 'coach') {
            fetchAttendanceStatus();
        }
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

    const handleCheckIn = async () => {
        if (!coachId) return;
        setAttendanceLoading(true);
        const today = new Date().toISOString().split('T')[0];
        const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

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
        const nowTime = new Date().toLocaleTimeString('en-US', { hour12: false });

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

    const navigateDate = (direction: 'prev' | 'next') => {
        if (viewMode === 'day') {
            setCurrentDate(d => direction === 'next' ? addDays(d, 1) : addDays(d, -1));
        } else if (viewMode === 'week') {
            setCurrentDate(d => direction === 'next' ? addWeeks(d, 1) : subWeeks(d, 1));
        } else {
            setCurrentDate(d => direction === 'next' ? addMonths(d, 1) : subMonths(d, 1));
        }
    };

    const getSessionsForDay = (date: Date) => {
        const dayName = format(date, 'EEEE');
        return sessions.filter(s => s.day_of_week === dayName);
    };

    const renderHeader = () => (
        <div className="flex flex-col gap-6 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">Class Schedule</h1>
                    <p className="text-gray-500 mt-1">Manage training sessions and timings</p>
                </div>

                {/* Coach Attendance Controls */}
                {role === 'coach' && (
                    <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
                        {!attendanceToday ? (
                            <button
                                onClick={handleCheckIn}
                                disabled={attendanceLoading}
                                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-green-500/20 transition-all flex items-center gap-2"
                            >
                                <Clock className="w-5 h-5" />
                                Check In
                            </button>
                        ) : !attendanceToday.check_out_time ? (
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-mono font-bold text-green-600 bg-green-50 px-3 py-1 rounded-lg border border-green-100 min-w-[100px] text-center">
                                    {elapsedTime}
                                </span>
                                <button
                                    onClick={handleCheckOut}
                                    disabled={attendanceLoading}
                                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-red-500/20 transition-all flex items-center gap-2"
                                >
                                    <LogOut className="w-5 h-5" />
                                    Check Out
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-3 bg-green-50 px-4 py-2 rounded-lg border border-green-100">
                                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                                <span className="text-sm font-medium text-green-700">
                                    Done ({new Date(attendanceToday.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(attendanceToday.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                                </span>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-4 bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center gap-1 border-r border-gray-200 pr-2">
                        <button onClick={() => navigateDate('prev')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-gray-700 min-w-[150px] text-center">
                            {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : 'MMM dd, yyyy')}
                        </span>
                        <button onClick={() => navigateDate('next')} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`p-2 rounded-md text-sm font-medium transition-all ${viewMode === 'month' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Month
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`p-2 rounded-md text-sm font-medium transition-all ${viewMode === 'week' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Week
                        </button>
                        <button
                            onClick={() => setViewMode('day')}
                            className={`p-2 rounded-md text-sm font-medium transition-all ${viewMode === 'day' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
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
                            className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-105"
                        >
                            <Plus className="w-5 h-5" />
                            <span className="font-semibold hidden md:inline">Add Class</span>
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
            <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-xl overflow-hidden border border-gray-200">
                {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(day => (
                    <div key={day} className="bg-gray-50 p-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
                {days.map((day, dayIdx) => {
                    const isToday = isSameDay(day, new Date());
                    const daySessions = getSessionsForDay(day);
                    // Check if day is current month
                    const isCurrentMonth = isSameMonth(day, currentDate);

                    return (
                        <div
                            key={day.toString()}
                            className={`bg-white min-h-[120px] p-2 relative group hover:bg-gray-50 transition-colors ${!isCurrentMonth ? 'bg-gray-50/50' : ''}`}
                            onClick={() => {
                                setCurrentDate(day);
                                setViewMode('day');
                            }}
                        >
                            <span className={`text-sm font-medium ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-900'} ${isToday ? 'bg-primary text-white w-7 h-7 flex items-center justify-center rounded-full' : ''}`}>
                                {format(day, 'd')}
                            </span>

                            <div className="mt-2 space-y-1">
                                {daySessions.slice(0, 3).map(session => (
                                    <div
                                        key={session.id}
                                        className="text-[10px] px-1.5 py-1 rounded bg-secondary/10 text-secondary border border-secondary/20 truncate"
                                        title={`${session.title} (${session.start_time.slice(0, 5)})`}
                                    >
                                        {session.start_time.slice(0, 5)} {session.title}
                                    </div>
                                ))}
                                {daySessions.length > 3 && (
                                    <div className="text-[10px] text-gray-400 pl-1">
                                        + {daySessions.length - 3} more
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const startDate = startOfWeek(currentDate, { weekStartsOn: 6 });
        const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(startDate, i));

        return (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    const daySessions = getSessionsForDay(day);

                    return (
                        <div key={i} className={`flex flex-col gap-3 ${isToday ? 'bg-primary/5 ring-2 ring-primary/20 rounded-xl p-2' : ''}`}>
                            <div
                                className={`text-center p-3 rounded-xl cursor-pointer transition-all hover:scale-105 ${isToday ? 'bg-primary text-white shadow-lg' : 'bg-white border border-gray-100 hover:border-primary/50 text-gray-700'}`}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setViewMode('day');
                                }}
                            >
                                <p className="text-xs font-bold uppercase opacity-80">{format(day, 'EEE')}</p>
                                <p className="text-xl font-bold">{format(day, 'dd')}</p>
                            </div>

                            <div className="space-y-2">
                                {daySessions.map(session => (
                                    <div
                                        key={session.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingSession(session);
                                            setShowAddModal(true);
                                        }}
                                        className="bg-white p-3 rounded-lg border border-l-4 border-gray-100 shadow-sm hover:shadow-md transition-all border-l-secondary group cursor-pointer hover:scale-[1.02]"
                                    >
                                        <h4 className="font-bold text-gray-800 text-sm truncate">{session.title}</h4>
                                        <div className="mt-2 space-y-1">
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)}
                                            </p>
                                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                Coach {session.coaches?.full_name.split(' ')[0]}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {daySessions.length === 0 && (
                                    <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                                        No Classes
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <h3 className="font-bold text-xl text-gray-800 flex items-center gap-2">
                        <CalendarDays className="w-5 h-5 text-primary" />
                        {format(currentDate, 'EEEE, MMMM do')}
                    </h3>
                </div>
                <div className="divide-y divide-gray-100">
                    {daySessions.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CalendarIcon className="w-8 h-8 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No classes scheduled</h3>
                            <p className="text-gray-500 mt-1">Enjoy your free day!</p>
                        </div>
                    ) : (
                        daySessions
                            .sort((a, b) => a.start_time.localeCompare(b.start_time))
                            .map(session => (
                                <div
                                    key={session.id}
                                    className="p-4 flex items-center gap-6 hover:bg-gray-50 transition-colors cursor-pointer group"
                                    onClick={() => {
                                        setEditingSession(session);
                                        setShowAddModal(true);
                                    }}
                                >
                                    <div className="text-center min-w-[80px]">
                                        <p className="font-bold text-gray-900 text-lg">{session.start_time.slice(0, 5)}</p>
                                        <p className="text-xs text-gray-500">{session.end_time.slice(0, 5)}</p>
                                    </div>
                                    <div className="w-1 h-12 bg-primary/20 rounded-full group-hover:bg-primary transition-colors"></div>
                                    <div className="flex-1">
                                        <h4 className="font-bold text-gray-900 text-lg">{session.title}</h4>
                                        <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                                            <span className="flex items-center gap-1">
                                                <Users className="w-4 h-4" />
                                                Coach {session.coaches?.full_name}
                                            </span>
                                            <span className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded text-xs">
                                                {session.capacity} Spots
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                        Click to Edit
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
