import { useState } from 'react';
import { Plus, Wallet, Calendar, TrendingUp } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import { format } from 'date-fns';
import { usePayments, useMonthlyPayroll } from '../hooks/useData';
import { useTranslation } from 'react-i18next';
import FinanceDetailModal from '../components/FinanceDetailModal';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
    created_at: string;
    students: {
        full_name: string;
    }
}

export default function Finance() {
    const { t } = useTranslation();
    const { data: paymentsData, isLoading: loading, refetch } = usePayments();

    // Monthly Payroll Integration
    const currentMonthStr = format(new Date(), 'yyyy-MM');
    const { data: payrollData, isLoading: payrollLoading } = useMonthlyPayroll(currentMonthStr);

    const payments = (paymentsData as Payment[]) || [];
    const totalRevenue = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

    // Calculate monthly revenue (simple filter for current month)
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyPayments = payments
        .filter(p => {
            const d = new Date(p.payment_date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    const monthlyExpenses = payrollData?.totalPayroll || 0;
    const netProfit = monthlyRevenue - monthlyExpenses;

    const [showAddModal, setShowAddModal] = useState(false);

    // Modal State
    const [detailType, setDetailType] = useState<'revenue' | 'income' | 'expenses' | 'profit' | null>(null);

    const getModalData = () => {
        switch (detailType) {
            case 'revenue': return payments;
            case 'income': return monthlyPayments;
            case 'expenses': return payrollData?.payrollData || [];
            case 'profit': return { revenue: monthlyRevenue, expenses: monthlyExpenses, profit: netProfit };
            default: return null;
        }
    };

    const getModalTitle = () => {
        switch (detailType) {
            case 'revenue': return t('finance.totalRevenue');
            case 'income': return 'Monthly Income';
            case 'expenses': return 'Outstanding Payroll (Liabilities)'; // Renamed
            case 'profit': return 'Net Profit Summary';
            default: return '';
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-8 border-b border-white/5 pb-10">
                <div className="text-center sm:text-left">
                    <h1 className="text-4xl sm:text-5xl font-black premium-gradient-text tracking-tighter uppercase">{t('finance.title')}</h1>
                    <p className="text-white/60 mt-3 text-sm sm:text-base font-bold tracking-[0.2em] uppercase opacity-100">{t('finance.subtitle') || 'Track revenue and handle payments'}</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="group bg-primary hover:bg-primary/90 text-white px-10 py-5 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-4 font-black uppercase tracking-widest text-xs relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                    <Plus className="w-5 h-5 relative z-10" />
                    <span className="relative z-10">{t('finance.recordPayment') || 'Record Payment'}</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Revenue */}
                <button onClick={() => setDetailType('revenue')} className="text-left w-full glass-card p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-primary/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-primary transition-colors">{t('finance.totalRevenue')}</p>
                        <div className="p-3 bg-primary/20 rounded-2xl text-primary shadow-inner">
                            <TrendingUp className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-3xl font-black text-white tracking-tighter">{totalRevenue.toLocaleString()}</h3>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">EGP</span>
                    </div>
                    <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                        View Details →
                    </div>
                </button>

                {/* Monthly Income */}
                <button onClick={() => setDetailType('income')} className="text-left w-full glass-card p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-indigo-400/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-indigo-400 transition-colors">Income (Month)</p>
                        <div className="p-3 bg-indigo-500/20 rounded-2xl text-indigo-400 shadow-inner">
                            <Calendar className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-3xl font-black text-white tracking-tighter">{monthlyRevenue.toLocaleString()}</h3>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">EGP</span>
                    </div>
                    <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                        View Details →
                    </div>
                </button>

                {/* Liabilities (Outstanding Payroll) */}
                <button onClick={() => setDetailType('expenses')} className="text-left w-full glass-card p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-orange-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-orange-400 transition-colors">Outstanding Liabilities</p>
                        <div className="p-3 bg-orange-500/20 rounded-2xl text-orange-400 shadow-inner">
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-3xl font-black text-orange-400 tracking-tighter">
                            {payrollLoading ? '...' : monthlyExpenses.toLocaleString()}
                        </h3>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">EGP</span>
                    </div>
                    <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
                        View Debts →
                    </div>
                </button>

                {/* Net Profit */}
                <button onClick={() => setDetailType('profit')} className="text-left w-full glass-card p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-emerald-400/30">
                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-colors ${netProfit >= 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-orange-500/5 group-hover:bg-orange-500/10'}`}></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${netProfit >= 0 ? 'text-white/40 group-hover:text-emerald-400' : 'text-white/40 group-hover:text-orange-400'}`}>Net Profit</p>
                        <div className={`p-3 rounded-2xl shadow-inner ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {payrollLoading ? '...' : netProfit.toLocaleString()}
                        </h3>
                        <span className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">EGP</span>
                    </div>
                    {/* Glowing indicator */}
                    <div className="mt-4 flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] relative z-10 opacity-60">
                        {netProfit >= 0 ? (
                            <span className="text-emerald-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> PROFITABLE</span>
                        ) : (
                            <span className="text-orange-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> DEFICIT</span>
                        )}
                    </div>
                    <div className="absolute bottom-6 right-8 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                        View Details →
                    </div>
                </button>
            </div>

            <FinanceDetailModal
                isOpen={!!detailType}
                onClose={() => setDetailType(null)}
                type={detailType}
                title={getModalTitle()}
                data={getModalData()}
            />

            {/* Recent Transactions List */}
            <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-premium mt-12 bg-white/[0.01]">
                <div className="p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                        <span className="w-1.5 h-10 bg-primary rounded-full shadow-[0_0_15px_rgba(var(--color-primary-rgb),0.5)]"></span>
                        {t('finance.recentTransactions') || 'Recent Transactions'}
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/[0.01] text-white/30 font-black text-[10px] uppercase tracking-[0.3em] border-b border-white/5">
                            <tr>
                                <th className="px-10 py-8">{t('common.student')}</th>
                                <th className="px-10 py-8">{t('common.date')}</th>
                                <th className="px-10 py-8">{t('finance.method')}</th>
                                <th className="px-10 py-8 text-right">{t('finance.amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={4} className="px-10 py-32 text-center text-white/20 font-black uppercase tracking-[0.2em] italic">Loading assets...</td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={4} className="px-10 py-32 text-center text-white/20 font-black uppercase tracking-[0.2em] italic">No transaction data discovered.</td></tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-white/[0.02] transition-all duration-500 group border-l-2 border-transparent hover:border-primary">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary group-hover:scale-110 transition-all duration-500 shadow-inner">
                                                    {payment.students?.full_name?.[0] || '?'}
                                                </div>
                                                <div>
                                                    <div className="font-black text-white text-xl tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">
                                                        {payment.students?.full_name || 'Unknown Gymnast'}
                                                    </div>
                                                    <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.1em]">Verified Payment</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="text-white/60 font-black text-sm tracking-widest uppercase">
                                                {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className="inline-flex items-center px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] bg-white/5 text-white/40 border border-white/5 group-hover:border-primary/30 group-hover:text-primary transition-all duration-500 shadow-inner">
                                                {payment.payment_method.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex flex-col items-end group-hover:scale-110 transition-transform duration-500 origin-right">
                                                <span className="text-3xl font-black text-primary tracking-tighter">
                                                    +{Number(payment.amount).toLocaleString()}
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

            {/* Modal */}
            {showAddModal && (
                <AddPaymentForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}
