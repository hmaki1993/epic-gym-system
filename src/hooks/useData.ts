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
            const { data, error } = await supabase
                .from('coaches')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        },
        staleTime: 1000 * 60 * 10,
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
