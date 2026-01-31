
import { X, TrendingUp, Calendar, Wallet, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
    students: {
        full_name: string;
    };
}

interface PayrollEntry {
    coach_name: string;
    salary: number;
    total_earnings: number;
    total_pt_sessions: number;
}

interface ProfitData {
    revenue: number;
    expenses: number;
    profit: number;
}

interface FinanceDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: 'revenue' | 'income' | 'expenses' | 'profit' | null;
    title: string;
    data: Payment[] | PayrollEntry[] | ProfitData | null;
}

export default function FinanceDetailModal({ isOpen, onClose, type, title, data }: FinanceDetailModalProps) {
    if (!isOpen || !type || !data) return null;

    const renderContent = () => {
        switch (type) {
            case 'revenue':
            case 'income':
                const payments = data as Payment[];
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Student</th>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Method</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payments.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No records found</td></tr>
                                ) : (
                                    payments.map((p) => (
                                        <tr key={p.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-white group-hover:text-primary transition-colors">{p.students?.full_name || 'Unknown'}</td>
                                            <td className="px-6 py-4 text-white/60 text-xs font-mono">{format(new Date(p.payment_date), 'MMM dd, yyyy')}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-lg bg-white/5 text-[9px] font-black uppercase tracking-wider text-white/40 border border-white/5">
                                                    {p.payment_method}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right font-black text-emerald-400 tracking-tight">
                                                +{Number(p.amount).toLocaleString()} <span className="text-[9px] text-white/20">EGP</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                );

            case 'expenses':
                const payroll = data as PayrollEntry[];
                return (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="text-white/30 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4">Coach</th>
                                    <th className="px-6 py-4 text-center">Sessions</th>
                                    <th className="px-6 py-4 text-center">Base Salary</th>
                                    <th className="px-6 py-4 text-right">Total Payout</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {payroll.length === 0 ? (
                                    <tr><td colSpan={4} className="px-6 py-8 text-center text-white/20 font-black uppercase tracking-widest text-[10px]">No payroll records</td></tr>
                                ) : (
                                    payroll.map((p, i) => (
                                        <tr key={i} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-white group-hover:text-rose-400 transition-colors">{p.coach_name}</td>
                                            <td className="px-6 py-4 text-center text-white/60 font-bold">{p.total_pt_sessions}</td>
                                            <td className="px-6 py-4 text-center text-white/40 text-xs font-mono">{p.salary.toLocaleString()}</td>
                                            <td className="px-6 py-4 text-right font-black text-rose-400 tracking-tight">
                                                -{p.total_earnings.toLocaleString()} <span className="text-[9px] text-white/20">EGP</span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                );

            case 'profit':
                const profitData = data as ProfitData;
                const isProfitable = profitData.profit >= 0;
                return (
                    <div className="space-y-8 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Total Revenue</p>
                                <p className="text-2xl font-black text-white">{profitData.revenue.toLocaleString()} <span className="text-[10px] text-white/20">EGP</span></p>
                            </div>
                            <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-2">Total Expenses</p>
                                <p className="text-2xl font-black text-white">{profitData.expenses.toLocaleString()} <span className="text-[10px] text-white/20">EGP</span></p>
                            </div>
                        </div>

                        <div className="relative pt-6 flex flex-col items-center justify-center">
                            <div className={`p-6 rounded-[2rem] border-2 ${isProfitable ? 'bg-emerald-500/20 border-emerald-500 shadow-[0_0_50px_rgba(16,185,129,0.2)]' : 'bg-orange-500/20 border-orange-500 shadow-[0_0_50px_rgba(249,115,22,0.2)]'} transition-all duration-500`}>
                                <div className="text-center">
                                    <p className={`text-[10px] font-black uppercase tracking-[0.4em] mb-2 ${isProfitable ? 'text-emerald-300' : 'text-orange-300'}`}>Net Profit</p>
                                    <p className={`text-5xl font-black tracking-tighter ${isProfitable ? 'text-white' : 'text-white'}`}>
                                        {isProfitable ? '+' : ''}{profitData.profit.toLocaleString()}
                                    </p>
                                    <p className="text-[10px] font-black text-white/40 mt-2 uppercase tracking-widest">EGP</p>
                                </div>
                            </div>
                            {isProfitable ? (
                                <div className="mt-6 flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest animate-bounce">
                                    <TrendingUp className="w-4 h-4" /> Excellent Performance
                                </div>
                            ) : (
                                <div className="mt-6 flex items-center gap-2 text-orange-400 text-xs font-black uppercase tracking-widest animate-bounce">
                                    <AlertTriangle className="w-4 h-4" /> Action Needed
                                </div>
                            )}
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="glass-card w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[2.5rem] border border-white/10 shadow-2xl relative animate-in zoom-in-95 duration-300 overflow-hidden">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${type === 'expenses' ? 'bg-rose-500/20 text-rose-400' :
                                type === 'profit' ? 'bg-orange-500/20 text-orange-400' :
                                    'bg-primary/20 text-primary'
                            }`}>
                            {type === 'expenses' ? <Wallet className="w-6 h-6" /> :
                                type === 'profit' ? <TrendingUp className="w-6 h-6" /> :
                                    <Calendar className="w-6 h-6" />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{title}</h2>
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Detailed Breakdown</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
}
