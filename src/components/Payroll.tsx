import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Banknote, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface PayrollEntry {
    coach_id: string;
    coach_name: string;
    total_pt_sessions: number;
    pt_rate: number;
    salary: number;
    total_hours: number;
    total_earnings: number;
}

interface PayrollProps {
    refreshTrigger?: number;
    onViewAttendance?: (coachId: string) => void;
}

export default function Payroll({ refreshTrigger, onViewAttendance }: PayrollProps) {
    const { t } = useTranslation();
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchPayroll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshTrigger]);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            // 1. Get all coaches
            const { data: coaches, error: coachError } = await supabase
                .from('coaches')
                .select('id, full_name, pt_rate, salary');

            if (coachError) throw coachError;

            // 2. Get attendance and PT sessions for the selected month
            const startOfMonth = `${month}-01`;
            const lastDay = new Date(Number(month.split('-')[0]), Number(month.split('-')[1]), 0).getDate();
            const endOfMonth = `${month}-${lastDay}`;

            const [attendanceRes, sessionsRes] = await Promise.all([
                supabase
                    .from('coach_attendance')
                    .select('coach_id, check_in_time, check_out_time, pt_sessions_count')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth),
                supabase
                    .from('pt_sessions')
                    .select('coach_id, sessions_count')
                    .gte('date', startOfMonth)
                    .lte('date', endOfMonth)
            ]);

            if (attendanceRes.error) throw attendanceRes.error;
            if (sessionsRes.error) throw sessionsRes.error;

            // 3. Aggregate data
            const stats = coaches.map(coach => {
                const coachAttendance = attendanceRes.data?.filter(a => a.coach_id === coach.id) || [];
                const coachSessions = sessionsRes.data?.filter(s => s.coach_id === coach.id) || [];

                // Calculate total work hours
                let totalSeconds = 0;
                coachAttendance.forEach(record => {
                    if (record.check_in_time && record.check_out_time) {
                        const start = new Date(record.check_in_time).getTime();
                        const end = new Date(record.check_out_time).getTime();
                        totalSeconds += Math.max(0, (end - start) / 1000);
                    }
                });
                const totalHours = Number((totalSeconds / 3600).toFixed(1));

                // Calculate total PT sessions (from both sources)
                const attSessions = coachAttendance.reduce((sum, r) => sum + (Number(r.pt_sessions_count) || 0), 0);
                const tableSessions = coachSessions.reduce((sum, s) => sum + (Number(s.sessions_count) || 1), 0);
                const totalSessions = attSessions + tableSessions;

                const salary = coach.salary || 0;
                const ptEarnings = totalSessions * (coach.pt_rate || 0);

                return {
                    coach_id: coach.id,
                    coach_name: coach.full_name,
                    pt_rate: coach.pt_rate || 0,
                    salary: salary,
                    total_pt_sessions: totalSessions,
                    total_hours: totalHours,
                    total_earnings: ptEarnings + salary
                };
            });

            setPayrollData(stats);

        } catch (error) {
            console.error('Error calculating payroll:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-premium mt-12 bg-white/[0.01] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="p-10 border-b border-white/5 flex flex-col sm:flex-row items-center justify-between bg-white/[0.02] gap-6">
                <h3 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-inner">
                        <Banknote className="w-6 h-6" />
                    </div>
                    {t('coaches.payrollTitle')}
                </h3>
                <div className="relative group w-full sm:w-auto">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="w-full sm:w-auto bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-white focus:outline-none focus:ring-4 focus:ring-primary/20 transition-all font-black uppercase tracking-widest text-xs appearance-none cursor-pointer hover:bg-white/10"
                    />
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-white/[0.01] text-white/30 font-black text-[10px] uppercase tracking-[0.3em] border-b border-white/5">
                        <tr>
                            <th className="px-10 py-8">{t('common.name')}</th>
                            <th className="px-10 py-8 text-center">{t('coaches.workHours')}</th>
                            <th className="px-10 py-8 text-center">{t('coaches.sessionCount')}</th>
                            <th className="px-10 py-8 text-center">{t('coaches.rate')}</th>
                            <th className="px-10 py-8 text-center">{t('coaches.baseSalary')}</th>
                            <th className="px-10 py-8 text-right">{t('coaches.totalEarnings')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {loading ? (
                            <tr><td colSpan={6} className="px-10 py-32 text-center text-white/20 font-black uppercase tracking-[0.2em] italic">{t('common.loading')}</td></tr>
                        ) : payrollData.length === 0 ? (
                            <tr><td colSpan={6} className="px-10 py-32 text-center text-white/20 font-black uppercase tracking-[0.2em] italic">{t('common.noResults')}</td></tr>
                        ) : (
                            payrollData.map((row) => (
                                <tr key={row.coach_id} className="hover:bg-white/[0.02] transition-all duration-500 group border-l-2 border-transparent hover:border-primary">
                                    <td className="px-10 py-8">
                                        <div className="flex items-center justify-between group/name">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-xs font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary transition-all duration-500 shadow-inner">
                                                    {row.coach_name?.[0] || '?'}
                                                </div>
                                                <span className="font-black text-white text-xl tracking-tight group-hover:text-primary transition-colors">{row.coach_name}</span>
                                            </div>
                                            {onViewAttendance && (
                                                <button
                                                    onClick={() => onViewAttendance(row.coach_id)}
                                                    className="p-3 hover:bg-white/10 rounded-2xl text-white/20 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                                    title="View Logs"
                                                >
                                                    <Clock className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="text-white/60 font-black text-sm tracking-widest uppercase bg-white/5 px-4 py-2 rounded-xl group-hover:text-white transition-colors">{row.total_hours}h</span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="text-white/40 font-black text-lg group-hover:text-white transition-colors">{row.total_pt_sessions}</span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="text-white/40 font-bold text-sm">{row.pt_rate}</span>
                                    </td>
                                    <td className="px-10 py-8 text-center">
                                        <span className="text-white/40 font-bold text-sm tracking-tight">{row.salary?.toLocaleString()}</span>
                                    </td>
                                    <td className="px-10 py-8 text-right">
                                        <div className="flex flex-col items-end group-hover:scale-110 transition-transform duration-500 origin-right">
                                            <span className="text-3xl font-black text-emerald-400 tracking-tighter">
                                                {row.total_earnings.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em]">EGP</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
