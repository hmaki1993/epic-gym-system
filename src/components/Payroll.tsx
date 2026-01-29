import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Banknote } from 'lucide-react';

interface PayrollEntry {
    coach_id: string;
    coach_name: string;
    total_pt_sessions: number;
    pt_rate: number;
    salary: number;
    total_earnings: number;
}

interface PayrollProps {
    refreshTrigger?: number;
}

export default function Payroll({ refreshTrigger }: PayrollProps) {
    const [payrollData, setPayrollData] = useState<PayrollEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

    useEffect(() => {
        fetchPayroll();
    }, [month, refreshTrigger]);

    const fetchPayroll = async () => {
        setLoading(true);
        try {
            // 1. Get all coaches
            const { data: coaches, error: coachError } = await supabase
                .from('coaches')
                .select('id, full_name, pt_rate, salary');

            if (coachError) throw coachError;

            // 2. Get attendance for the selected month
            const startOfMonth = `${month}-01`;
            const endOfMonth = `${month}-31`;

            const { data: attendance, error: attError } = await supabase
                .from('coach_attendance')
                .select('coach_id, pt_sessions_count')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);

            if (attError) throw attError;

            // 3. Aggregate data
            const stats = coaches.map(coach => {
                const coachAttendance = attendance?.filter(a => a.coach_id === coach.id) || [];

                const totalSessions = coachAttendance.reduce((sum, record) => {
                    const count = Number(record.pt_sessions_count);
                    return sum + (isNaN(count) ? 0 : count);
                }, 0);

                const salary = coach.salary || 0;
                const ptEarnings = totalSessions * (coach.pt_rate || 0);

                return {
                    coach_id: coach.id,
                    coach_name: coach.full_name,
                    pt_rate: coach.pt_rate || 0,
                    salary: salary,
                    total_pt_sessions: totalSessions,
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
                    Monthly Payroll
                </h3>
                <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
                />
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-700 font-medium">
                        <tr>
                            <th className="px-6 py-4">Coach Name</th>
                            <th className="px-6 py-4 text-center">PT Sessions</th>
                            <th className="px-6 py-4 text-center">Rate</th>
                            <th className="px-6 py-4 text-center">Base Salary</th>
                            <th className="px-6 py-4 text-right">Total Earnings</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Calculating...</td></tr>
                        ) : payrollData.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No data for this month.</td></tr>
                        ) : (
                            payrollData.map((row) => (
                                <tr key={row.coach_id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900">{row.coach_name}</td>
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
