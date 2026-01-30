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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mt-8">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                    <Banknote className="w-5 h-5 text-green-600" />
                    {t('coaches.payrollTitle')}
                </h3>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                        <tr>
                            <th className="px-6 py-4">{t('common.name')}</th>
                            <th className="px-6 py-4 text-center">{t('coaches.workHours')}</th>
                            <th className="px-6 py-4 text-center">{t('coaches.sessionCount')}</th>
                            <th className="px-6 py-4 text-center">{t('coaches.rate')}</th>
                            <th className="px-6 py-4 text-center">{t('coaches.baseSalary')}</th>
                            <th className="px-6 py-4 text-right">{t('coaches.totalEarnings')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
                        ) : payrollData.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">{t('common.noResults')}</td></tr>
                        ) : (
                            payrollData.map((row) => (
                                <tr key={row.coach_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 flex items-center justify-between group">
                                        <span>{row.coach_name}</span>
                                        {onViewAttendance && (
                                            <button
                                                onClick={() => onViewAttendance(row.coach_id)}
                                                className="p-1 hover:bg-gray-100 rounded-md text-gray-400 hover:text-primary transition-all opacity-0 group-hover:opacity-100"
                                                title="View Logs"
                                            >
                                                <Clock className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-gray-700 text-center font-mono">{row.total_hours}h</td>
                                    <td className="px-6 py-4 text-gray-700 text-center">{row.total_pt_sessions}</td>
                                    <td className="px-6 py-4 text-gray-700 text-center">{row.pt_rate}</td>
                                    <td className="px-6 py-4 text-gray-700 text-center">{row.salary?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-right font-bold text-green-600">
                                        {row.total_earnings.toLocaleString()}
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
