import { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths, addMonths, isToday } from 'date-fns';
import {
    Users,
    UserPlus,
    Calendar,
    Clock,
    CheckCircle,
    XCircle,
    Dumbbell,
    CheckSquare,
    XSquare,
    MessageSquare,
    Save,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    RotateCcw,
    ArrowUpRight
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import AddStudentForm from '../components/AddStudentForm';
import AddPTSubscriptionForm from '../components/AddPTSubscriptionForm';
import PremiumClock from '../components/PremiumClock';
import { useTheme } from '../context/ThemeContext';
import toast from 'react-hot-toast';

export default function ReceptionDashboard() {
    const { t, i18n } = useTranslation();
    const { settings } = useTheme();
    const navigate = useNavigate();
    const { role: contextRole } = useOutletContext<{ role: string }>() || { role: null };
    // currentTime removed as PremiumClock handles it.

    // Modals State
    const [showAddStudent, setShowAddStudent] = useState(false);
    const [showAddPT, setShowAddPT] = useState(false);

    // Note Editing State
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [noteText, setNoteText] = useState('');

    // Class Attendance State
    const [todaysClasses, setTodaysClasses] = useState<any[]>([]);
    const [loadingClasses, setLoadingClasses] = useState(true);
    const [recentCheckIns, setRecentCheckIns] = useState<any[]>([]);

    // Coach Attendance State
    const [coachesList, setCoachesList] = useState<any[]>([]);
    const [loadingCoaches, setLoadingCoaches] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // PT Attendance State
    const [ptList, setPtList] = useState<any[]>([]);
    const [loadingPt, setLoadingPt] = useState(true);

    // Attendance History State
    const [historyEntityId, setHistoryEntityId] = useState<string | null>(null);
    const [historyEntityType, setHistoryEntityType] = useState<'student' | 'coach' | 'pt' | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    // Self Check-In State
    const [myCoachId, setMyCoachId] = useState<string | null>(null);
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [checkInTime, setCheckInTime] = useState<string | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);

    // Search State for Filtering
    const [searchGymnast, setSearchGymnast] = useState('');
    const [searchStaff, setSearchStaff] = useState('');
    const [searchPT, setSearchPT] = useState('');

    // --- Memoized Filtered Lists for Performance ---
    const filteredGymnasts = useMemo(() => {
        if (!searchGymnast.trim()) return todaysClasses;
        const query = searchGymnast.toLowerCase().trim();
        return todaysClasses.filter(s =>
            s.full_name?.toLowerCase().includes(query) ||
            s.coaches?.full_name?.toLowerCase().includes(query)
        );
    }, [todaysClasses, searchGymnast]);

    const filteredCoaches = useMemo(() => {
        if (!searchStaff.trim()) return coachesList;
        const query = searchStaff.toLowerCase().trim();
        return coachesList.filter(c =>
            c.full_name?.toLowerCase().includes(query) ||
            c.email?.toLowerCase().includes(query)
        );
    }, [coachesList, searchStaff]);

    const filteredPT = useMemo(() => {
        if (!searchPT.trim()) return ptList;
        const query = searchPT.toLowerCase().trim();
        return ptList.filter(s =>
            s.full_name?.toLowerCase().includes(query) ||
            s.coach_name?.toLowerCase().includes(query)
        );
    }, [ptList, searchPT]);

    // Refs for stale closures
    const myCoachIdRef = useRef<string | null>(null);
    const isCheckedInRef = useRef(false);

    useEffect(() => {
        myCoachIdRef.current = myCoachId;
    }, [myCoachId]);

    useEffect(() => {
        isCheckedInRef.current = isCheckedIn;
    }, [isCheckedIn]);

    // DEBUG STATES
    const [debugError, setDebugError] = useState<string>('');
    const [debugAuth, setDebugAuth] = useState<string>('Checking...');

    useEffect(() => {
        // Check Auth and Initialize Self
        const initializeSelf = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setDebugAuth('Logged In: ' + user.id.slice(0, 5));

                // 1. Try to find a coach record for this user
                const { data: coachData } = await supabase
                    .from('coaches')
                    .select('id')
                    .eq('profile_id', user.id)
                    .maybeSingle();

                if (coachData) {
                    setMyCoachId(coachData.id);
                    // 2. Check today's attendance
                    const todayStr = format(new Date(), 'yyyy-MM-dd');
                    const { data: attendance } = await supabase
                        .from('coach_attendance')
                        .select('*')
                        .eq('coach_id', coachData.id)
                        .eq('date', todayStr)
                        .maybeSingle();

                    if (attendance) {
                        const start = new Date(attendance.check_in_time);
                        if (!attendance.check_out_time && attendance.check_in_time) {
                            setIsCheckedIn(true);
                            setCheckInTime(format(start, 'HH:mm:ss'));
                            setElapsedTime(Math.floor((new Date().getTime() - start.getTime()) / 1000));

                            // Restore timer from local storage if needed or just sync with server time
                            localStorage.setItem(`receptionCheckInStart_${todayStr}`, JSON.stringify({
                                timestamp: start.getTime(),
                                recordId: attendance.id
                            }));
                        } else if (attendance.check_out_time) {
                            setIsCheckedIn(false);
                        }
                    }
                }
            } else {
                setDebugAuth('No User');
            }
        };

        initializeSelf();

        // No longer need internal timer for ReceptionDashboard as PremiumClock handles display
        // and fetchRecentCheckIns etc are triggered below.
        fetchRecentCheckIns();
        fetchCoachesStatus();
        fetchPtStatus(); // Fetch PTs

        // Realtime Subscription for Student Attendance
        const studentAttendanceSub = supabase
            .channel('public:student_attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'student_attendance' }, () => {
                fetchRecentCheckIns();
                fetchTodaysClasses(); // Auto refresh class list on changes
            })
            .subscribe();

        // Realtime Subscription for Coach Attendance
        const coachAttendanceSub = supabase
            .channel('public:coach_attendance')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'coach_attendance' }, () => {
                fetchCoachesStatus();
            })
            .subscribe();

        // Realtime Subscription for PT Sessions
        const ptSessionsSub = supabase
            .channel('public:pt_sessions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_sessions' }, () => {
                fetchPtStatus();
            })
            .subscribe();

        // Realtime Subscription for PT Subscriptions
        const ptSubscriptionsSub = supabase
            .channel('public:pt_subscriptions')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pt_subscriptions' }, () => {
                fetchPtStatus();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(studentAttendanceSub);
            supabase.removeChannel(coachAttendanceSub);
            supabase.removeChannel(ptSessionsSub);
            supabase.removeChannel(ptSubscriptionsSub);
        };
    }, []);

    // --- Class Attendance Logic ---
    const fetchTodaysClasses = async () => {
        try {
            if (todaysClasses.length === 0) setLoadingClasses(true);
            const todayIdx = new Date().getDay(); // 0 = Sunday, 6 = Saturday
            const dayMap = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
            const todayDay = dayMap[todayIdx];
            const dateStr = format(new Date(), 'yyyy-MM-dd');

            console.log('Fetching classes for:', todayDay);

            // 1. Fetch Students scheduled for today
            const { data: students, error: studentsError } = await supabase
                .from('students')
                .select('id, full_name, training_schedule, training_days, training_type, coaches(full_name)')
                .contains('training_days', [todayDay]);

            if (studentsError) {
                console.error('Error fetching students:', studentsError);
                return;
            }

            // 2. Fetch Attendance for today
            const { data: attendance, error: attendanceError } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('date', dateStr);

            if (attendanceError) {
                console.error('Error fetching attendance:', attendanceError);
            }

            // 3. Merge and Filter (Exclude PT-only students from the Gymnast List)
            const merged = (students || [])
                .filter(student => {
                    const type = student.training_type?.toLowerCase() || '';
                    return !type.includes('pt') && !type.includes('personal training');
                })
                .map(student => {
                    const record = attendance?.find(a => a.student_id === student.id);
                    const todaySchedule = student.training_schedule?.find((s: any) => s.day === todayDay);

                    let status = 'pending';
                    if (record) {
                        if (record.status === 'absent') status = 'absent';
                        else if (record.check_out_time) status = 'completed';
                        else status = 'present';
                    }

                    return {
                        ...student,
                        scheduledStart: todaySchedule?.start || '',
                        scheduledEnd: todaySchedule?.end || '',
                        attendanceId: record?.id,
                        status: status,
                        note: record?.note || '',
                        checkInTime: record?.check_in_time,
                        checkOutTime: record?.check_out_time
                    };
                }).sort((a, b) => {
                    if (a.scheduledStart !== b.scheduledStart) return a.scheduledStart.localeCompare(b.scheduledStart);
                    return a.full_name.localeCompare(b.full_name);
                });

            console.log('Classes Merged:', merged);
            setTodaysClasses(merged);
        } catch (error) {
            console.error('Error fetching classes:', error);
        } finally {
            setLoadingClasses(false);
        }
    };

    useEffect(() => {
        fetchTodaysClasses();
        const interval = setInterval(fetchTodaysClasses, 60000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Timer Logic for Self Check-In
    useEffect(() => {
        let interval: any;
        if (isCheckedIn) {
            interval = setInterval(() => {
                const today = format(new Date(), 'yyyy-MM-dd');
                const startTime = localStorage.getItem(`receptionCheckInStart_${today}`);
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

    // --- Data Fetching ---
    const fetchRecentCheckIns = async () => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data } = await supabase
                .from('student_attendance')
                .select('*, students(full_name)')
                .eq('date', today)
                .order('check_in_time', { ascending: false })
                .limit(20);

            setRecentCheckIns(data || []);
        } catch (error) {
            console.error('Error fetching recent check-ins:', error);
        }
    };

    const fetchCoachesStatus = async () => {
        try {
            if (coachesList.length === 0) setLoadingCoaches(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Get all coaches
            const { data: coaches, error: coachesError } = await supabase
                .from('coaches')
                .select('id, full_name, avatar_url, role')
                .order('full_name');

            if (coachesError) throw coachesError;
            if (!coaches) return;

            // 2. Get today's attendance
            const { data: attendance, error: attendanceError } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('date', today);

            if (attendanceError) throw attendanceError;

            // 3. Merge data
            // Use refs to avoid stale closures
            const currentMyCoachId = myCoachIdRef.current;
            const currentIsCheckedIn = isCheckedInRef.current;

            const merged = (coaches || [])
                .filter(coach => {
                    // Filter out non-coaching roles for Head Coach
                    if (contextRole === 'head_coach') {
                        const coachRole = coach.role?.toLowerCase().trim();
                        return coachRole !== 'reception' && coachRole !== 'receptionist' && coachRole !== 'cleaner';
                    }
                    return true;
                })
                .map(coach => {
                    const record = attendance?.find(a => a.coach_id === coach.id);

                    let status = 'pending';
                    let checkIn = record?.check_in_time;
                    const checkOut = record?.check_out_time;

                    if (record) {
                        if (record.status === 'absent') status = 'absent';
                        else if (record.check_out_time) status = 'completed';
                        else status = 'present';
                    }

                    // FORCE LOCAL STATE for current user to prevent flickering
                    if (coach.id === currentMyCoachId && currentIsCheckedIn) {
                        status = 'present';
                        if (!checkIn) checkIn = new Date().toISOString(); // Fallback if record not found yet
                    }

                    return {
                        ...coach,
                        status: status,
                        note: record?.note || '',
                        checkInTime: checkIn,
                        checkOutTime: checkOut,
                        attendanceId: record?.id
                    };
                });

            setCoachesList(merged);
        } catch (error) {
            console.error('Error fetching coaches status:', error);
            // Don't toast here to avoid spamming the user if it loops
        } finally {
            setLoadingCoaches(false);
        }
    };


    // --- Actions ---
    const fetchPtStatus = async () => {
        try {
            if (ptList.length === 0) setLoadingPt(true);
            const today = format(new Date(), 'yyyy-MM-dd');

            // 1. Get Subscriptions (Include expired to keep them visible if they attended today)
            const { data: subs, error: subsError } = await supabase
                .from('pt_subscriptions')
                .select('*, students(full_name), coaches(full_name)');

            if (subsError) throw subsError;
            if (!subs) return;

            // 2. Get Today's PT Sessions
            const { data: sessions, error: sessionsError } = await supabase
                .from('pt_sessions')
                .select('*')
                .eq('date', today);

            if (sessionsError) throw sessionsError;

            // 3. Merge & Filter
            // We only show students who have sessions remaining OR who have already attended today
            const merged = subs.filter(sub => {
                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const currentName = studentData?.full_name || sub.student_name;
                const hasSessionToday = sessions?.some(s => s.student_name === currentName && s.coach_id === sub.coach_id);
                return sub.sessions_remaining > 0 || hasSessionToday;
            }).map(sub => {
                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const currentName = studentData?.full_name || sub.student_name;
                const sessionRecord = sessions?.find(s => s.student_name === currentName && s.coach_id === sub.coach_id);

                let status = 'pending';
                if (sessionRecord) {
                    status = 'present';
                }

                return {
                    ...sub,
                    displayName: currentName,
                    status,
                    sessionId: sessionRecord?.id,
                    checkInTime: sessionRecord?.created_at,
                    note: '',
                    coachName: sub.coaches?.full_name
                };
            }).sort((a, b) => {
                if (a.status === 'present' && b.status !== 'present') return -1;
                if (a.status !== 'present' && b.status === 'present') return 1;
                return (a.displayName || '').localeCompare(b.displayName || '');
            });

            setPtList(merged);
        } catch (error) {
            console.error('Error fetching PT status:', error);
        } finally {
            setLoadingPt(false);
        }
    };

    const handlePtStatusUpdate = async (subscriptionId: string, currentSessionsRemaining: number, newStatus: 'present' | 'absent' | 'completed' | 'pending') => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Find subscription to verify
            const { data: sub } = await supabase
                .from('pt_subscriptions')
                .select('sessions_remaining, coach_id, student_name, students(full_name)')
                .eq('id', subscriptionId)
                .single();

            if (!sub) return toast.error('Subscription not found');

            // Logic for Check In (Present)
            if (newStatus === 'present') {
                if (sub.sessions_remaining <= 0) {
                    return toast.error('No sessions remaining!');
                }

                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const displayName = studentData?.full_name || sub.student_name;

                // 1. Create PT Session Record
                const { error: sessionError } = await supabase
                    .from('pt_sessions')
                    .insert({
                        coach_id: sub.coach_id,
                        date: today,
                        sessions_count: 1,
                        student_name: displayName
                    });

                if (sessionError) throw sessionError;

                // 2. Deduct Session
                const { error: subError } = await supabase
                    .from('pt_subscriptions')
                    .update({
                        sessions_remaining: sub.sessions_remaining - 1,
                        status: sub.sessions_remaining - 1 === 0 ? 'expired' : 'active'
                    })
                    .eq('id', subscriptionId);

                if (subError) throw subError;
                toast.success('PT Session Recorded');
            } else if (newStatus === 'pending') {
                // --- RESET LOGIC ---
                const studentData = Array.isArray(sub.students) ? sub.students[0] : sub.students;
                const displayName = studentData?.full_name || sub.student_name;

                // 1. Delete today's session
                const { error: deleteError } = await supabase
                    .from('pt_sessions')
                    .delete()
                    .eq('coach_id', sub.coach_id)
                    .eq('date', today)
                    .eq('student_name', displayName);

                if (deleteError) throw deleteError;

                // 2. Increment Session Back
                const { error: subError } = await supabase
                    .from('pt_subscriptions')
                    .update({
                        sessions_remaining: sub.sessions_remaining + 1,
                        status: 'active'
                    })
                    .eq('id', subscriptionId);

                if (subError) throw subError;
                toast.success('Attendance Reset & Session Refunded');
            }

            fetchPtStatus();
            // Refresh dashboard stats or other queries if needed
        } catch (error) {
            console.error('PT Status Switch Error:', error);
            toast.error(t('common.error'));
        }
    };

    // --- Actions ---
    const handleStatusUpdate = async (studentId: string, newStatus: 'present' | 'absent' | 'completed') => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Check existing
            const { data: existing } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('date', today)
                .maybeSingle();

            const payload: any = {
                student_id: studentId,
                date: today,
                status: newStatus
            };

            if (newStatus === 'present') {
                // Only set check_in_time if not already set or switching from absent
                if (!existing || !existing.check_in_time) {
                    payload.check_in_time = new Date().toISOString();
                }
                // Reset check_out_time if we mark as present (re-opening session)
                payload.check_out_time = null;
            } else if (newStatus === 'completed') {
                payload.check_out_time = new Date().toISOString();
            } else {
                // Absent
                payload.check_in_time = null;
                payload.check_out_time = null;
            }

            if (existing) {
                const { error } = await supabase
                    .from('student_attendance')
                    .update(payload)
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('student_attendance')
                    .insert(payload);
                if (error) throw error;
            }

            toast.success(newStatus === 'present' ? 'Marked as Present' : newStatus === 'completed' ? 'Session Completed' : 'Marked as Absent');
            fetchRecentCheckIns();
            fetchTodaysClasses();
        } catch (error) {
            console.error('Status update error:', error);
            toast.error(t('common.error') || 'An error occurred');
        }
    };

    const handleSaveNote = async (studentId: string) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            const { data: existing } = await supabase
                .from('student_attendance')
                .select('*')
                .eq('student_id', studentId)
                .eq('date', today)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('student_attendance')
                    .update({ note: noteText })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('student_attendance')
                    .insert({
                        student_id: studentId,
                        date: today,
                        note: noteText,
                        status: 'pending'
                    });
            }
            setEditingNoteId(null);
            fetchTodaysClasses();
            toast.success(t('reception.noteSaved'));
        } catch (error) {
            console.error('Save note error:', error);
        }
    };



    const handleStaffStatusUpdate = async (coachId: string, newStatus: 'present' | 'absent') => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            // Check existing
            const { data: existing } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .eq('date', today)
                .maybeSingle();

            // If we are resetting an 'absent' coach
            if (newStatus === 'present' && existing?.status === 'absent') {
                const { error } = await supabase
                    .from('coach_attendance')
                    .delete()
                    .eq('id', existing.id);
                if (error) throw error;
                toast.success('Status reset to pending');
            } else if (newStatus === 'absent') {
                const payload = {
                    coach_id: coachId,
                    date: today,
                    status: 'absent',
                    check_in_time: null,
                    check_out_time: null
                };

                if (existing) {
                    const { error } = await supabase
                        .from('coach_attendance')
                        .update(payload)
                        .eq('id', existing.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('coach_attendance')
                        .insert(payload);
                    if (error) throw error;
                }
                toast.success('Marked as Absent');
            }

            fetchCoachesStatus();
        } catch (error) {
            console.error('Staff status error:', error);
            toast.error(t('common.error') || 'An error occurred');
        }
    };

    const handleSaveStaffNote = async (coachId: string) => {
        try {
            const today = format(new Date(), 'yyyy-MM-dd');

            const { data: existing } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .eq('date', today)
                .maybeSingle();

            if (existing) {
                await supabase
                    .from('coach_attendance')
                    .update({ note: noteText })
                    .eq('id', existing.id);
            } else {
                await supabase
                    .from('coach_attendance')
                    .insert({
                        coach_id: coachId,
                        date: today,
                        note: noteText,
                        status: 'pending'
                    });
            }

            toast.success('Note saved');
            setEditingNoteId(null);
            setNoteText('');
            fetchCoachesStatus();
        } catch (error) {
            console.error('Save staff note error:', error);
            toast.error('Failed to save note');
        }
    };

    // --- Self Check-In Handlers ---
    const handleSelfCheckIn = async () => {
        if (!myCoachId) return toast.error('You are not linked to a staff profile');
        const now = new Date();
        const todayStr = format(now, 'yyyy-MM-dd');

        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .upsert({
                    coach_id: myCoachId,
                    date: todayStr,
                    check_in_time: now.toISOString(),
                    status: 'present'
                }, { onConflict: 'coach_id,date' })
                .select().single();

            if (error) throw error;

            setIsCheckedIn(true);
            setCheckInTime(format(now, 'HH:mm:ss'));
            localStorage.setItem(`receptionCheckInStart_${todayStr}`, JSON.stringify({ timestamp: now.getTime(), recordId: data.id }));

            // Optimistic Update
            console.log('Optimistic Update Triggered for:', myCoachId);
            setCoachesList(prev => prev.map(c => {
                if (c.id === myCoachId) {
                    console.log('Found coach in list, updating status to present');
                    return { ...c, status: 'present', checkInTime: now.toISOString() };
                }
                return c;
            }));

            toast.success('You are Checked In!');

            // Re-fetch after a short delay to ensure DB propagation
            setTimeout(() => {
                console.log('Delayed fetch triggered');
                fetchCoachesStatus();
            }, 1000);
        } catch (error: any) {
            console.error('Self check-in error:', error);
            toast.error(error.message || 'Check-in failed');
        }
    };

    const handleSelfCheckOut = async () => {
        if (!myCoachId) return;
        const now = new Date();
        const today = format(now, 'yyyy-MM-dd');
        const savedStart = localStorage.getItem(`receptionCheckInStart_${today}`);

        try {
            if (savedStart) {
                const { recordId } = JSON.parse(savedStart);
                await supabase.from('coach_attendance')
                    .update({ check_out_time: now.toISOString(), status: 'completed' }) // Or keep as present? completed implies done for day
                    .eq('id', recordId);
            } else {
                // Fallback if local storage missing, try to find active record
                const { data: record } = await supabase.from('coach_attendance')
                    .select('id')
                    .eq('coach_id', myCoachId)
                    .eq('date', today)
                    .is('check_out_time', null)
                    .maybeSingle();

                if (record) {
                    await supabase.from('coach_attendance')
                        .update({ check_out_time: now.toISOString(), status: 'completed' })
                        .eq('id', record.id);
                }
            }

            setIsCheckedIn(false);
            setCheckInTime(null);
            setElapsedTime(0);
            localStorage.removeItem(`receptionCheckInStart_${today}`);

            // Optimistic Update
            console.log('Optimistic Update Triggered (Check-out) for:', myCoachId);
            setCoachesList(prev => prev.map(c => {
                if (c.id === myCoachId) {
                    return { ...c, status: 'completed', checkOutTime: now.toISOString() };
                }
                return c;
            }));

            toast.success('You are Checked Out!');
            setTimeout(() => {
                fetchCoachesStatus();
            }, 1000);
        } catch (error) {
            console.error('Self check-out error:', error);
            toast.error('Check-out failed');
        }
    };

    const formatTimer = (seconds: number) => {
        if (isNaN(seconds) || seconds < 0) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-extrabold premium-gradient-text uppercase tracking-tight">
                        {t('reception.dashboard') || 'Reception Dashboard'}
                    </h1>
                    <div className="mt-6 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                            <p className="text-white/60 text-sm sm:text-lg font-bold tracking-[0.2em] uppercase opacity-100 italic">
                                {format(new Date(), 'EEEE, dd MMMM yyyy')}
                            </p>
                            {settings.clock_position === 'dashboard' && (
                                <>
                                    <div className="hidden sm:block w-px h-6 bg-white/10 mx-2"></div>
                                    <PremiumClock className="scale-110 !px-6 !py-3" />
                                </>
                            )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">{t('dashboard.welcome')}, {contextRole?.replace('_', ' ') || 'Staff'}.</p>

                            {(contextRole === 'admin' || contextRole === 'reception') && (
                                <a
                                    href="/registration"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-emerald-500/5 hover:scale-105 hover:bg-emerald-500/20 transition-all group self-start sm:self-auto"
                                >
                                    <UserPlus className="w-3.5 h-3.5" />
                                    {t('common.registrationPage')}
                                    <ArrowUpRight className="w-3 h-3 opacity-40 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-emerald-400" />
                                </a>
                            )}
                        </div>
                    </div>
                </div>

                {/* Self Check-In Widget */}
                {myCoachId && (
                    <div className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/10">
                        <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">My Duty Status</span>
                            {isCheckedIn ? (
                                <span className="text-2xl font-black text-white font-mono">{formatTimer(elapsedTime)}</span>
                            ) : (
                                <span className="text-sm font-bold text-white/40">Not Checked In</span>
                            )}
                        </div>

                        <button
                            onClick={isCheckedIn ? handleSelfCheckOut : handleSelfCheckIn}
                            className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${isCheckedIn ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20 hover:bg-rose-600' : 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-600'}`}
                            title={isCheckedIn ? "Check Out" : "Check In"}
                        >
                            {isCheckedIn ? <XCircle className="w-8 h-8" /> : <Clock className="w-8 h-8" />}
                        </button>
                    </div>
                )}
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <button
                    onClick={() => setShowAddStudent(true)}
                    className="glass-card p-6 rounded-3xl border border-white/10 hover:border-primary/50 group transition-all text-left relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <UserPlus className="w-24 h-24 text-primary" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <UserPlus className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                            {t('students.addStudent') || 'Add Student'}
                        </h3>
                        <p className="text-xs text-white/50 font-bold uppercase tracking-wider">
                            Register new gymnast
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => setShowAddPT(true)}
                    className="glass-card p-6 rounded-3xl border border-white/10 hover:border-accent/50 group transition-all text-left relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Dumbbell className="w-24 h-24 text-accent" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-accent/20 text-accent flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Dumbbell className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                            {t('students.addSubscription') || 'Add Subscription'}
                        </h3>
                        <p className="text-xs text-white/50 font-bold uppercase tracking-wider">
                            New Private Training
                        </p>
                    </div>
                </button>

                <button
                    onClick={() => navigate('/schedule')}
                    className="glass-card p-6 rounded-3xl border border-white/10 hover:border-purple-500/50 group transition-all text-left relative overflow-hidden"
                >
                    <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Calendar className="w-24 h-24 text-purple-500" />
                    </div>
                    <div className="relative z-10">
                        <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-1">
                            {t('common.schedule') || 'View Schedule'}
                        </h3>
                        <p className="text-xs text-white/50 font-bold uppercase tracking-wider">
                            Check classes timing
                        </p>
                    </div>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {/* Student Attendance Section */}
                <div className="glass-card rounded-3xl border border-white/10 p-8 flex flex-col h-[650px]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Users className="w-6 h-6 text-primary" />
                            {t('reception.studentAttendance') || 'Student Attendance'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-white/50">
                                {todaysClasses.filter(c => c.status === 'present' || c.status === 'completed').length} / {todaysClasses.length} Present
                            </span>
                        </div>
                    </div>

                    {/* Class List Table */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {loadingClasses ? (
                            <div className="text-center py-20 text-white/30 uppercase tracking-widest font-bold">
                                <Users className="w-12 h-12 mx-auto mb-4 animate-pulse opacity-50" />
                                Loading Today&apos;s Classes...
                            </div>
                        ) : todaysClasses.length === 0 ? (
                            <div className="text-center py-20 opacity-30">
                                <Calendar className="w-12 h-12 mx-auto mb-4" />
                                <p className="uppercase tracking-widest font-bold">No Classes Scheduled Today</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-4 pb-12">
                                {filteredGymnasts.map((student, index) => (
                                    <div key={student.id}
                                        style={{ zIndex: filteredGymnasts.length - index }}
                                        className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-500 cursor-pointer
                                            hover:-translate-y-2 hover:z-[100] hover:shadow-2xl hover:shadow-emerald-500/20
                                            ${student.status === 'present' ? 'bg-emerald-500/5 backdrop-blur-xl border-emerald-500/20' :
                                                student.status === 'completed' ? 'bg-white/5 backdrop-blur-md border-white/5 opacity-60' :
                                                    student.status === 'absent' ? 'bg-rose-500/5 backdrop-blur-xl border-rose-500/20' :
                                                        'bg-white/5 backdrop-blur-xl border-white/10'}`}
                                    >
                                        <div className="flex flex-col">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-5 min-w-0 flex-1">
                                                    <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex flex-col items-center justify-center font-black transition-transform group-hover:scale-110
                                                        ${student.status === 'present' ? 'bg-emerald-500/20 text-emerald-400' :
                                                            student.status === 'absent' ? 'bg-rose-500/20 text-rose-400' :
                                                                'bg-white/5 text-white/40'}`}>
                                                        <span className="text-xl leading-none">{student.scheduledStart ? format(new Date(`2000-01-01T${student.scheduledStart}`), 'HH:mm') : '--'}</span>
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        {student.status === 'present' && (
                                                            <div className="mb-1.5 self-start">
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                    <CheckCircle className="w-3 h-3" /> {t('students.active') || 'Present'}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {student.status === 'absent' && (
                                                            <div className="mb-1.5 self-start">
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 text-rose-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-rose-500/20">
                                                                    <XCircle className="w-3 h-3" /> {t('coaches.away') || 'Absent'}
                                                                </div>
                                                            </div>
                                                        )}
                                                        {student.status === 'completed' && (
                                                            <div className="mb-1.5 self-start">
                                                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 text-white/50 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">
                                                                    <CheckCircle className="w-3 h-3" /> {t('coach.completed') || 'Finished'}
                                                                </div>
                                                            </div>
                                                        )}
                                                        <h4
                                                            onClick={(e) => { e.stopPropagation(); setHistoryEntityId(student.id); setHistoryEntityType('student'); setShowHistoryModal(true); }}
                                                            className="font-black text-white text-xl tracking-tight group-hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4 truncate block w-full"
                                                        >
                                                            {student.full_name}
                                                        </h4>
                                                        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/30 mt-1">
                                                            <span className="flex items-center gap-1.5 truncate max-w-[150px]">
                                                                <Users className="w-3 h-3 flex-shrink-0" />
                                                                <span className="truncate">
                                                                    {Array.isArray(student.coaches)
                                                                        ? (student.coaches[0]?.full_name || 'No Coach')
                                                                        : (student.coaches?.full_name || 'No Coach')}
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Compact Action Footer */}
                                            <div className="mt-5 pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5">
                                                <div className={`flex flex-col justify-center min-w-0 rounded-lg px-2 transition-colors
                                                    ${student.status === 'present' ? 'bg-emerald-500/10' :
                                                        student.status === 'absent' ? 'bg-rose-500/10' :
                                                            student.status === 'completed' ? 'bg-white/5 opacity-50' : 'bg-white/5'}`}>
                                                    <span className={`text-[9.5px] font-black uppercase tracking-tight
                                                        ${student.status === 'present' ? 'text-emerald-400/50' :
                                                            student.status === 'absent' ? 'text-rose-400/50' : 'text-white/20'}`}>
                                                        {student.status === 'completed' ? 'Checked Out' : student.status === 'present' ? 'Checked In' : 'Scheduled'}
                                                    </span>
                                                    <span className={`text-[13px] font-black truncate
                                                        ${student.status === 'present' ? 'text-emerald-400' :
                                                            student.status === 'absent' ? 'text-rose-400' : 'text-white'}`}>
                                                        {student.status === 'completed' ? (student.checkOutTime ? format(new Date(student.checkOutTime), 'HH:mm') : '--:--') :
                                                            student.status === 'present' ? (student.checkInTime ? format(new Date(student.checkInTime), 'HH:mm') : '--:--') :
                                                                (student.scheduledStart ? format(new Date(`2000-01-01T${student.scheduledStart}`), 'HH:mm') : '--:--')}
                                                    </span>
                                                </div>

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingNoteId(student.id);
                                                        setNoteText(student.note || '');
                                                    }}
                                                    className={`h-8 px-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1 min-w-0
                                                        ${student.note ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/20' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}
                                                >
                                                    <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                                    <span className="truncate">{student.note ? 'Note' : 'Add Note'}</span>
                                                </button>

                                                <div className="min-w-0 flex items-center gap-1.5">
                                                    {(student.status === 'pending' || student.status === 'absent') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(student.id, 'present'); }}
                                                            className="h-10 px-3 rounded-lg text-[10px] font-black uppercase tracking-tight bg-emerald-500 text-white shadow-lg shadow-emerald-500/40 hover:bg-emerald-600 transition-all flex items-center justify-center gap-1 min-w-0"
                                                        >
                                                            <CheckSquare className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">Check In</span>
                                                        </button>
                                                    )}
                                                    {(student.status === 'pending' || student.status === 'present') && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(student.id, 'absent'); }}
                                                            className={`h-10 px-3 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1 min-w-0
                                                                ${student.status === 'present' ? 'bg-white/5 text-rose-400 border border-white/5 hover:bg-rose-500/10' : 'bg-rose-500 text-white shadow-lg shadow-rose-500/40 hover:bg-rose-600'}`}
                                                        >
                                                            <XSquare className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">Absent</span>
                                                        </button>
                                                    )}
                                                    {student.status === 'completed' && (
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(student.id, 'present'); }}
                                                            className="h-10 w-full px-1 rounded-lg text-[8.5px] font-black uppercase tracking-tight bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 min-w-0"
                                                        >
                                                            <RotateCcw className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">Reset</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Hidden/Expanded Details */}
                                        <div className="max-h-0 overflow-hidden group-hover:max-h-40 transition-all duration-500 ease-in-out">
                                            <div className="pt-6 mt-6 border-t border-white/5 flex flex-wrap gap-4">
                                                {student.note && (
                                                    <div className="text-sm text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                                        <MessageSquare className="w-4 h-4" />
                                                        {student.note}
                                                    </div>
                                                )}
                                                {student.checkInTime && (
                                                    <div className="text-sm text-white/40 bg-white/5 px-4 py-2 rounded-xl flex items-center gap-2">
                                                        <Clock className="w-4 h-4" />
                                                        Checked in at {format(new Date(student.checkInTime), 'HH:mm')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Note Input Modal/Overlay in Card */}
                                        {editingNoteId === student.id && (
                                            <div className="absolute inset-0 bg-[#0E1D21]/95 z-[110] rounded-2xl p-6 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    autoFocus
                                                    type="text"
                                                    value={noteText}
                                                    onChange={(e) => setNoteText(e.target.value)}
                                                    placeholder="Add a staff note..."
                                                    className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSaveNote(student.id)}
                                                />
                                                <button onClick={() => handleSaveNote(student.id)} className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><Save className="w-6 h-6" /></button>
                                                <button onClick={() => setEditingNoteId(null)} className="p-4 bg-white/10 text-white rounded-2xl"><X className="w-6 h-6" /></button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Recent Check-ins List */}
                    {/* Only show recent checkins that are NOT 'absent' if we want, or show all actions? user didn't specify. 
                        Let's keep recent checkins as 'Activity Log' basically. 
                        But the 'Recent' list in original code was just a view.
                        I'll keep it as is, but maybe filter out 'absent' if check_in_time is null?
                        Original logic: eq('date', today). order('check_in_time', false).
                        If check_in_time is null (absent), they might appear at end or beginning depending on sort nulls.
                        Let's verify logic of fetchRecentCheckIns. */}
                </div>

                {/* Staff Attendance Section */}
                <div className="glass-card rounded-3xl border border-white/10 p-8 flex flex-col h-[650px]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Users className="w-6 h-6 text-emerald-400" />
                            {t('reception.coachAttendance') || 'Staff Attendance'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-white/50">
                                {filteredCoaches.filter(c => c.status === 'present').length} / {filteredCoaches.length} Present
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4 pb-12">
                            {filteredCoaches.map((coach, index) => (
                                <div key={coach.id}
                                    style={{ zIndex: filteredCoaches.length - index }}
                                    className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-500 cursor-pointer
                                            hover:-translate-y-2 hover:z-[100] hover:shadow-2xl hover:shadow-emerald-500/20
                                            ${coach.status === 'present' ? 'bg-[#152b24]/60 backdrop-blur-xl border-emerald-500/30' :
                                            coach.status === 'absent' ? 'bg-[#2b1515]/60 backdrop-blur-xl border-rose-500/30' :
                                                'bg-white/5 backdrop-blur-xl border-white/10'}`}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5 min-w-0 flex-1">
                                                <div className="relative group-hover:scale-110 transition-transform duration-500 flex-shrink-0">
                                                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center overflow-hidden border border-white/10">
                                                        {coach.avatar_url ? (
                                                            <img src={coach.avatar_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="font-black text-white/50 text-2xl">{coach.full_name[0]}</span>
                                                        )}
                                                    </div>
                                                    <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0E1D21] 
                                                                ${coach.status === 'present' ? 'bg-emerald-400' :
                                                            coach.status === 'absent' ? 'bg-rose-500' : 'bg-white/20'}`}>
                                                    </div>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {coach.status === 'present' && (
                                                        <div className="mb-1.5">
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse border border-emerald-500/20">
                                                                <CheckCircle className="w-3 h-3" /> Active Shift
                                                            </div>
                                                        </div>
                                                    )}
                                                    <h4
                                                        onClick={(e) => { e.stopPropagation(); setHistoryEntityId(coach.id); setHistoryEntityType('coach'); setShowHistoryModal(true); }}
                                                        className="font-black text-white text-xl tracking-tight group-hover:text-primary transition-colors hover:underline decoration-primary/30 underline-offset-4 truncate"
                                                    >
                                                        {coach.full_name}
                                                    </h4>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Compact Action Footer */}
                                        <div className="mt-5 pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5">
                                            <div className={`flex flex-col justify-center min-w-0 rounded-lg px-2 transition-colors
                                                ${coach.status === 'present' ? 'bg-emerald-500/10' :
                                                    coach.status === 'absent' ? 'bg-rose-500/10' :
                                                        coach.status === 'completed' ? 'bg-white/5 opacity-50' : 'bg-white/5'}`}>
                                                <span className={`text-[9.5px] font-black uppercase tracking-tight
                                                    ${coach.status === 'present' ? 'text-emerald-400/50' :
                                                        coach.status === 'absent' ? 'text-rose-400/50' : 'text-white/20'}`}>
                                                    {coach.status === 'completed' ? 'Total Time' : coach.status === 'present' ? 'Active Since' : 'Status'}
                                                </span>
                                                <span className={`text-[13px] font-black truncate
                                                    ${coach.status === 'present' ? 'text-emerald-400' :
                                                        coach.status === 'absent' ? 'text-rose-400' : 'text-white'}`}>
                                                    {coach.status === 'completed' ? (
                                                        (() => {
                                                            if (!coach.checkInTime || !coach.checkOutTime) return '--:--';
                                                            const start = new Date(coach.checkInTime).getTime();
                                                            const end = new Date(coach.checkOutTime).getTime();
                                                            const diffSeconds = Math.floor((end - start) / 1000);
                                                            const h = Math.floor(diffSeconds / 3600);
                                                            const m = Math.floor((diffSeconds % 3600) / 60);
                                                            return `${h}h ${m}m`;
                                                        })()
                                                    ) : coach.status === 'present' ? (coach.checkInTime ? format(new Date(coach.checkInTime), 'HH:mm') : '--:--') :
                                                        'Offline'}
                                                </span>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingNoteId(coach.id);
                                                    setNoteText(coach.note || '');
                                                }}
                                                className={`h-8 px-1 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center justify-center gap-1 min-w-0
                                                    ${coach.note ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/20' : 'bg-white/5 text-white/40 border border-white/5 hover:bg-white/10'}`}
                                            >
                                                <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate">{coach.note ? 'Note' : 'Add Note'}</span>
                                            </button>

                                            <div className="min-w-0">
                                                {coach.status === 'present' ? (
                                                    <div className="h-8 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center gap-1 min-w-0">
                                                        <Clock className="w-3 h-3 flex-shrink-0 animate-pulse" />
                                                        <div className="truncate"><StaffTimer startTime={coach.checkInTime} /></div>
                                                    </div>
                                                ) : coach.status === 'absent' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStaffStatusUpdate(coach.id, 'present'); }}
                                                        className="h-8 w-full px-1 rounded-lg text-[8.5px] font-black uppercase tracking-tight bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 min-w-0"
                                                    >
                                                        <RotateCcw className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">Reset</span>
                                                    </button>
                                                ) : coach.status === 'completed' ? (
                                                    <div className="h-8 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-white/5 text-white/40 border border-white/5 flex items-center justify-center gap-1 min-w-0 overflow-hidden">
                                                        <CheckCircle className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">Finished</span>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleStaffStatusUpdate(coach.id, 'absent'); }}
                                                        className="h-8 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all flex items-center justify-center gap-1 min-w-0"
                                                    >
                                                        <XSquare className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">Absent</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="max-h-0 overflow-hidden group-hover:max-h-40 transition-all duration-500 ease-in-out">
                                        <div className="pt-6 mt-6 border-t border-white/5 flex flex-wrap gap-4">
                                            {coach.checkInTime && coach.status === 'present' && (
                                                <div className="text-sm text-emerald-400 bg-emerald-500/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                                    <Clock className="w-4 h-4" />
                                                    Shift Start: {format(new Date(coach.checkInTime), 'HH:mm')}
                                                    <span className="ml-2 font-mono opacity-60">
                                                        [<StaffTimer startTime={coach.checkInTime} />]
                                                    </span>
                                                </div>
                                            )}
                                            {coach.note && (
                                                <div className="text-sm text-yellow-400 bg-yellow-400/10 px-4 py-2 rounded-xl flex items-center gap-2">
                                                    <MessageSquare className="w-4 h-4" />
                                                    {coach.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {editingNoteId === coach.id && (
                                        <div className="absolute inset-0 bg-[#0E1D21]/95 z-[110] rounded-2xl p-6 flex items-center gap-4 animate-in fade-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                autoFocus
                                                type="text"
                                                value={noteText}
                                                onChange={(e) => setNoteText(e.target.value)}
                                                placeholder="Staff note..."
                                                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50"
                                                onKeyDown={(e) => e.key === 'Enter' && handleSaveStaffNote(coach.id)}
                                            />
                                            <button onClick={() => handleSaveStaffNote(coach.id)} className="p-4 bg-emerald-500 text-white rounded-2xl shadow-lg shadow-emerald-500/20"><Save className="w-6 h-6" /></button>
                                            <button onClick={() => setEditingNoteId(null)} className="p-4 bg-white/10 text-white rounded-2xl"><X className="w-6 h-6" /></button>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                {/* PT Attendance Section */}
                <div className="glass-card rounded-3xl border border-white/10 p-8 flex flex-col h-[650px]">
                    <div className="flex items-center justify-between mb-8">
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Dumbbell className="w-6 h-6 text-accent" />
                            {t('reception.ptGymnast') || 'PT GYMNAST'}
                        </h2>
                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 bg-white/5 text-xs font-bold uppercase tracking-wider rounded-lg text-white/50">
                                {filteredPT.filter(s => s.status === 'present').length} Active
                            </span>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <div className="flex flex-col gap-4 pb-12">
                            {filteredPT.map((item, index) => (
                                <div key={item.id}
                                    style={{ zIndex: filteredPT.length - index }}
                                    className={`group relative flex flex-col p-6 rounded-2xl border transition-all duration-500 cursor-pointer
                                            hover:-translate-y-2 hover:z-[100] hover:shadow-2xl hover:shadow-accent/20
                                            ${item.status === 'present' ? 'bg-emerald-500/5 backdrop-blur-xl border-emerald-500/20' :
                                            'bg-white/5 backdrop-blur-xl border-white/10'}`}
                                >
                                    <div className="flex flex-col">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5 min-w-0 flex-1">
                                                <div className={`w-16 h-16 rounded-2xl flex-shrink-0 flex items-center justify-center overflow-hidden font-black text-white/50 text-2xl group-hover:scale-110 transition-transform duration-500
                                                        ${item.status === 'present' ? 'bg-accent/20 text-accent' : 'bg-white/5'}`}>
                                                    {item.displayName ? item.displayName[0] : '?'}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    {item.status === 'present' && (
                                                        <div className="mb-1.5 self-start">
                                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-500/20">
                                                                <CheckCircle className="w-3 h-3" /> {t('coach.completed') || 'Attended'}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <h4
                                                        onClick={(e) => { e.stopPropagation(); setHistoryEntityId(item.id); setHistoryEntityType('pt'); setShowHistoryModal(true); }}
                                                        className="font-black text-white text-xl tracking-tight group-hover:text-accent transition-colors hover:underline decoration-accent/30 underline-offset-4 truncate block w-full"
                                                    >
                                                        {item.displayName}
                                                    </h4>
                                                    <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-widest text-white/30 mt-1">
                                                        <span className="flex items-center gap-1.5 truncate">
                                                            <Clock className="w-3 h-3 flex-shrink-0" />
                                                            <span className="truncate">{item.coachName || 'No Coach'}</span>
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Compact Action Footer */}
                                        <div className="mt-5 pt-3 border-t border-white/10 grid grid-cols-3 gap-1.5">
                                            {/* Sessions Left */}
                                            <div className="flex flex-col justify-center min-w-0 rounded-lg px-2 py-1 bg-white/5 transition-colors">
                                                <span className="text-[9.5px] font-black uppercase tracking-tight text-white/20">
                                                    Sessions
                                                </span>
                                                <span className="text-[13px] font-black truncate text-primary">
                                                    {item.sessions_total}/{item.sessions_remaining}
                                                </span>
                                            </div>

                                            {/* Arrival Time */}
                                            <div className={`flex flex-col justify-center min-w-0 rounded-lg px-2 py-1 transition-colors
                                                ${item.status === 'present' ? 'bg-emerald-500/10' : 'bg-white/5'}`}>
                                                <span className={`text-[9.5px] font-black uppercase tracking-tight
                                                    ${item.status === 'present' ? 'text-emerald-500/50' : 'text-white/20'}`}>
                                                    Time
                                                </span>
                                                <span className={`text-[13px] font-black truncate
                                                    ${item.status === 'present' ? 'text-emerald-400' : 'text-white/20'}`}>
                                                    {item.status === 'present' ? (item.checkInTime ? format(new Date(item.checkInTime), 'HH:mm') : '--:--') : '--:--'}
                                                </span>
                                            </div>

                                            <div className="min-w-0">
                                                {item.status !== 'present' && item.sessions_remaining > 0 ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePtStatusUpdate(item.id, item.sessions_remaining, 'present'); }}
                                                        className="h-10 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-accent text-white shadow-lg shadow-accent/40 transition-all hover:bg-accent/80 flex items-center justify-center gap-1 min-w-0"
                                                    >
                                                        <CheckSquare className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">Check In</span>
                                                    </button>
                                                ) : item.status === 'present' ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handlePtStatusUpdate(item.id, item.sessions_remaining, 'pending'); }}
                                                        className="h-10 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-white/5 text-white/40 border border-white/5 hover:bg-white/10 transition-all flex items-center justify-center gap-1 min-w-0 overflow-hidden"
                                                    >
                                                        <RotateCcw className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">Reset</span>
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="h-10 w-full px-1 rounded-lg text-[10px] font-black uppercase tracking-tight bg-white/5 text-white/20 border border-white/5 transition-all flex items-center justify-center gap-1 min-w-0"
                                                    >
                                                        <XCircle className="w-3 h-3 flex-shrink-0" />
                                                        <span className="truncate">No Subs</span>
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showAddStudent && (
                <AddStudentForm
                    onClose={() => setShowAddStudent(false)}
                    onSuccess={() => {
                        setShowAddStudent(false);
                        setRefreshTrigger(prev => prev + 1);
                        toast.success(t('reception.studentAdded') || 'Student added successfully');
                    }}
                />
            )}

            {showAddPT && (
                <AddPTSubscriptionForm
                    onClose={() => setShowAddPT(false)}
                    onSuccess={() => {
                        setShowAddPT(false);
                        toast.success(t('reception.subscriptionAdded'));
                    }}
                />
            )}

            {showHistoryModal && historyEntityId && historyEntityType && (
                <AttendanceHistoryModal
                    entityId={historyEntityId}
                    type={historyEntityType}
                    onClose={() => {
                        setShowHistoryModal(false);
                        setHistoryEntityId(null);
                        setHistoryEntityType(null);
                    }}
                />
            )}
        </div>
    );
}

function AttendanceHistoryModal({ entityId, type, onClose }: { entityId: string, type: 'student' | 'coach' | 'pt', onClose: () => void }) {
    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [name, setName] = useState('');

    useEffect(() => {
        fetchHistory();
        fetchEntityName();
    }, [entityId, currentMonth]);

    const fetchEntityName = async () => {
        if (type === 'pt') {
            const { data } = await supabase.from('pt_subscriptions').select('student_name, students(full_name)').eq('id', entityId).single();
            if (data) setName((data.students as any)?.full_name || data.student_name);
            return;
        }
        const table = type === 'student' ? 'students' : 'coaches';
        const { data } = await supabase.from(table).select('full_name').eq('id', entityId).single();
        if (data) setName(data.full_name);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const start = startOfMonth(currentMonth);
            const end = endOfMonth(currentMonth);

            let table = '';
            let idField = '';

            if (type === 'pt') {
                table = 'pt_attendance';
                idField = 'pt_subscription_id';
            } else if (type === 'student') {
                table = 'student_attendance';
                idField = 'student_id';
            } else {
                table = 'coach_attendance';
                idField = 'coach_id';
            }

            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq(idField, entityId)
                .gte('date', format(start, 'yyyy-MM-dd'))
                .lte('date', format(end, 'yyyy-MM-dd'));

            if (error) throw error;
            setHistory(data || []);
        } catch (error) {
            console.error('Error fetching history:', error);
        } finally {
            setLoading(false);
        }
    };

    const monthDays = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getRecordForDay = (day: Date) => {
        return history.find(h => isSameDay(new Date(h.date), day));
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-2xl rounded-3xl border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Calendar className="w-6 h-6 text-primary" />
                            {t('reception.attendanceHistory') || 'Attendance History'}
                        </h2>
                        <p className="text-white/40 font-bold uppercase tracking-wider text-xs mt-1">{name || 'Loading...'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X className="w-6 h-6 text-white/40" />
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-white/5 text-white/60 hover:text-white"
                        >
                            <ChevronLeft className="w-6 h-6" />
                        </button>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">
                            {format(currentMonth, 'MMMM yyyy')}
                        </h3>
                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-3 hover:bg-white/5 rounded-2xl transition-all border border-white/5 text-white/60 hover:text-white"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>

                    {loading ? (
                        <div className="h-64 flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-7 gap-3">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                                <div key={i} className="text-center text-[10px] font-black text-white/20 uppercase tracking-widest mb-2">
                                    {day}
                                </div>
                            ))}
                            {/* Empty cells for padding */}
                            {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                                <div key={`empty-${i}`} className="aspect-square" />
                            ))}
                            {monthDays.map((day) => {
                                const record = getRecordForDay(day);
                                const status = record?.status || 'none';
                                return (
                                    <div
                                        key={day.toISOString()}
                                        className={`aspect-square rounded-xl flex flex-col items-center justify-center border transition-all relative group/day
                                    ${isToday(day) ? 'ring-2 ring-primary/50 ring-offset-2 ring-offset-[#0E1D21]' : ''}
                                    ${status === 'present' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                                status === 'absent' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                                                    'bg-white/5 border-white/5 text-white/20 hover:border-white/10'}`}
                                    >
                                        <span className="text-sm font-black">{format(day, 'd')}</span>
                                        {record && (
                                            <div className="flex flex-col items-center leading-none mt-1">
                                                {record.check_in_time && (
                                                    <span className="text-[10.5px] font-black text-white">
                                                        {format(new Date(record.check_in_time), 'HH:mm')}
                                                    </span>
                                                )}
                                                {record.check_out_time && (
                                                    <span className="text-[10.5px] font-black text-white/50">
                                                        {format(new Date(record.check_out_time), 'HH:mm')}
                                                    </span>
                                                )}
                                                {/* If no times but has status, show dot */}
                                                {!record.check_in_time && !record.check_out_time && status !== 'none' && (
                                                    <div className="w-1 h-1 rounded-full bg-current mt-1" />
                                                )}
                                            </div>
                                        )}

                                        {/* Tooltip on hover */}
                                        <div className="absolute bottom-[110%] left-1/2 -translate-x-1/2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-lg border border-white/10 text-[10px] font-black uppercase tracking-wider text-white opacity-0 group-hover/day:opacity-100 pointer-events-none transition-all scale-95 group-hover/day:scale-100 z-10 whitespace-nowrap shadow-xl">
                                            {status === 'none' ? 'No Record' : status.toUpperCase()}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    <div className="grid grid-cols-3 gap-4 mt-8">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-center">
                            <div className="text-2xl font-black text-emerald-400">{history.filter(h => h.status === 'present').length}</div>
                            <div className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest mt-1">Present</div>
                        </div>
                        <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl text-center">
                            <div className="text-2xl font-black text-rose-400">{history.filter(h => h.status === 'absent').length}</div>
                            <div className="text-[10px] font-black text-rose-500/60 uppercase tracking-widest mt-1">Absent</div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-4 rounded-2xl text-center">
                            <div className="text-2xl font-black text-white/40">
                                {monthDays.length > 0 ? Math.round((history.filter(h => h.status === 'present').length / monthDays.length) * 100) : 0}%
                            </div>
                            <div className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Rate</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StaffTimer({ startTime }: { startTime: string }) {
    const [elapsed, setElapsed] = useState(0);

    useEffect(() => {
        const start = new Date(startTime).getTime();
        const update = () => {
            const now = new Date().getTime();
            setElapsed(Math.floor((now - start) / 1000));
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [startTime]);

    const h = Math.floor(elapsed / 3600);
    const m = Math.floor((elapsed % 3600) / 60);
    const s = elapsed % 60;

    return (
        <span>
            {h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:{s.toString().padStart(2, '0')}
        </span>
    );
}

