import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

// --- Students Hooks ---
export function useStudents() {
    return useQuery({
        queryKey: ['students'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('students')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}

// --- Coaches Hooks ---
export function useCoaches() {
    return useQuery({
        queryKey: ['coaches'],
        queryFn: async () => {
            const today = new Date().toISOString().split('T')[0];

            // Get coaches
            const { data: coaches, error: coachesError } = await supabase
                .from('coaches')
                .select('*')
                .order('created_at', { ascending: false });

            if (coachesError) throw coachesError;

            // Get today's attendance for status
            const { data: attendanceData, error: attendanceError } = await supabase
                .from('coach_attendance')
                .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                .eq('date', today);

            if (attendanceError) console.error('Error fetching attendance status:', attendanceError);

            // Get today's PT sessions
            const { data: ptSessionsData, error: ptError } = await supabase
                .from('pt_sessions')
                .select('coach_id, sessions_count, student_name')
                .eq('date', today);

            if (ptError) console.error('Error fetching PT sessions:', ptError);

            // Merge everything
            const enrichedCoaches = coaches?.map(coach => {
                const dayAttendance = attendanceData?.find(a => a.coach_id === coach.id);
                const coachPTs = ptSessionsData?.filter(s => s.coach_id === coach.id) || [];

                // Aggregated PT Sessions (from both tables)
                const totalSessions = (dayAttendance?.pt_sessions_count || 0) +
                    coachPTs.reduce((acc, curr) => acc + (curr.sessions_count || 0), 0);

                const studentNames = coachPTs.map(s => s.student_name).join(', ');

                // Determine Status
                let status = 'away';
                if (dayAttendance) {
                    if (dayAttendance.check_in_time && !dayAttendance.check_out_time) {
                        status = 'working';
                    } else if (dayAttendance.check_out_time) {
                        status = 'done';
                    }
                }

                return {
                    ...coach,
                    pt_sessions_today: totalSessions,
                    pt_student_name: studentNames,
                    attendance_status: status,
                    check_in_time: dayAttendance?.check_in_time,
                    check_out_time: dayAttendance?.check_out_time
                };
            });

            return enrichedCoaches;
        },
        staleTime: 1000 * 30, // 30 seconds for live status
    });
}

// --- Finance Hooks ---
export function usePayments() {
    return useQuery({
        queryKey: ['payments'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('payments')
                .select('*, students(full_name)')
                .order('payment_date', { ascending: false });
            if (error) throw error;
            return data;
        },
    });
}

// --- Dashboard Hooks ---
export function useDashboardStats() {
    return useQuery({
        queryKey: ['dashboardStats'],
        queryFn: async () => {
            const [students, coaches, payments, recent] = await Promise.all([
                supabase.from('students').select('*', { count: 'exact', head: true }),
                supabase.from('coaches').select('*', { count: 'exact', head: true }),
                supabase.from('payments').select('amount').gte('payment_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
                supabase.from('students').select('id, full_name, created_at').order('created_at', { ascending: false }).limit(5)
            ]);

            return {
                totalStudents: students.count || 0,
                activeCoaches: coaches.count || 0,
                monthlyRevenue: (payments.data || []).reduce((acc, curr) => acc + Number(curr.amount), 0),
                recentActivity: recent.data || []
            };
        }
    });
}

// --- AI Context Hook ---
export function useGymData() {
    const { data: students } = useStudents();
    const { data: coaches } = useCoaches();
    const { data: payments } = usePayments();

    return {
        students: students || [],
        coaches: coaches || [],
        payments: payments || [],
        timestamp: new Date().toISOString()
    };
}
