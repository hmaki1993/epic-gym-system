import { useState } from 'react';
import { Plus, Wallet, Calendar, TrendingUp, DollarSign, Receipt, Dumbbell, RefreshCw, Trash2, ArrowLeft, History } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import AddRefundForm from '../components/AddRefundForm';
import AddExpenseForm from '../components/AddExpenseForm';
import { format, startOfMonth, endOfMonth, addMonths, isSameMonth } from 'date-fns';
import { usePayments, useMonthlyPayroll, useRefunds, useExpenses, useAddRefund, useAddExpense } from '../hooks/useData';
import { useTranslation } from 'react-i18next';
import FinanceDetailModal from '../components/FinanceDetailModal';
import FinanceTrashModal from '../components/FinanceTrashModal';
import ConfirmModal from '../components/ConfirmModal';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../context/CurrencyContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';

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
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: paymentsData, isLoading: loading, refetch } = usePayments();
    const { data: refundsData } = useRefunds();
    const { data: expensesData } = useExpenses();
    const addRefundMutation = useAddRefund();
    const addExpenseMutation = useAddExpense();

    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [deleteIds, setDeleteIds] = useState<string[]>([]);
    const [deleteTable, setDeleteTable] = useState<string | null>(null);

    const handleDeleteTransaction = (id: string, table: string) => {
        setDeleteIds([id]);
        setDeleteTable(table);
        setConfirmDelete(true);
    };

    const handleBulkDelete = () => {
        if (selectedItems.length === 0) return;
        setDeleteIds(selectedItems);
        setDeleteTable('payments'); // Bulk delete currently optimized for payments list
        setConfirmDelete(true);
    };

    const confirmDeleteTransaction = async () => {
        if (deleteIds.length === 0 || !deleteTable) return;
        const toastId = toast.loading(deleteIds.length > 1 ? `Deleting ${deleteIds.length} transactions...` : 'Deleting transaction...');
        try {
            // 1. Fetch the data before deleting (to save in history)
            const { data: records, error: fetchError } = await supabase
                .from(deleteTable)
                .select('*')
                .in('id', deleteIds);

            if (fetchError) throw fetchError;

            // 2. Insert into history manually (Fallback for when triggers fail)
            if (records && records.length > 0) {
                const { data: { user } } = await supabase.auth.getUser();
                const historyEntries = records.map(record => ({
                    table_name: deleteTable,
                    row_id: record.id,
                    row_data: record,
                    action: 'DELETE',
                    created_by: user?.id
                }));

                const { error: historyError } = await supabase
                    .from('finance_history')
                    .insert(historyEntries);

                // If this fails, the table might not exist. We'll try to create it if possible, 
                // but for now we just log the error and proceed or show a warning.
                if (historyError) {
                    console.error('History logging failed:', historyError);
                    toast.error('Save to Recycle Bin failed. Please run the SQL command provided.', { id: toastId });
                    return; // Stop here if we can't backup the data
                }
            }

            // 3. Perform the actual delete
            const { error: deleteError } = await supabase.from(deleteTable).delete().in('id', deleteIds);
            if (deleteError) throw deleteError;

            toast.success(deleteIds.length > 1 ? `Deleted ${deleteIds.length} items to Trash` : 'Deleted and moved to Trash', { id: toastId });
            setSelectedItems([]);
            refetch();
            queryClient.invalidateQueries({ queryKey: ['refunds'] });
            queryClient.invalidateQueries({ queryKey: ['expenses'] });
        } catch (error: any) {
            toast.error(error.message || 'Delete failed', { id: toastId });
        } finally {
            setConfirmDelete(false);
            setDeleteIds([]);
            setDeleteTable(null);
        }
    };

    const [selectedDate, setSelectedDate] = useState(new Date());

    const currentMonthStr = format(selectedDate, 'yyyy-MM');
    const { data: payrollData, isLoading: payrollLoading } = useMonthlyPayroll(currentMonthStr);

    const payments = (paymentsData as Payment[]) || [];
    const totalRevenue = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

    // Period Filtering Logic
    const currentMonth = selectedDate.getMonth();
    const currentYear = selectedDate.getFullYear();

    const monthlyPayments = payments
        .filter(p => {
            const d = new Date(p.payment_date);
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
        });
    const monthlyRevenue = monthlyPayments.reduce((sum, p) => sum + Number(p.amount), 0);

    // Calculate monthly refunds and expenses
    const refunds = refundsData || [];
    const expenses = expensesData || [];
    const monthlyRefunds = refunds.filter(r => {
        const d = new Date(r.refund_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const monthlyGeneralExpenses = expenses.filter(e => {
        const d = new Date(e.expense_date);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    const totalMonthlyRefunds = monthlyRefunds.reduce((sum, r) => sum + Number(r.amount), 0);
    const totalMonthlyGeneralExpenses = monthlyGeneralExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    // Separate PT earnings from base salaries
    const monthlyBaseSalaries = payrollData?.payrollData?.reduce((sum, coach) => sum + Number(coach.salary), 0) || 0;
    const monthlyPTEarnings = payrollData?.payrollData?.reduce((sum, coach) => {
        const ptEarnings = Number(coach.total_pt_sessions) * Number(coach.pt_rate);
        return sum + ptEarnings;
    }, 0) || 0;
    const monthlyPayroll = payrollData?.totalPayroll || 0; // Total (Salaries + PT)

    const monthlyExpenses = monthlyBaseSalaries + monthlyPTEarnings + totalMonthlyRefunds + totalMonthlyGeneralExpenses;
    const netProfit = monthlyRevenue - monthlyExpenses;

    const [showAddModal, setShowAddModal] = useState(false);
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showTrashModal, setShowTrashModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal State
    const [detailType, setDetailType] = useState<'revenue' | 'income' | 'expenses' | 'profit' | 'refunds' | 'general_expenses' | 'pt_sessions' | null>(null);

    const getModalData = () => {
        switch (detailType) {
            case 'revenue': return payments;
            case 'income': return monthlyPayments;
            case 'expenses': return payrollData?.payrollData || [];
            case 'pt_sessions': return payrollData?.payrollData || [];
            case 'refunds': return monthlyRefunds;
            case 'general_expenses': return monthlyGeneralExpenses;
            case 'profit': return { revenue: monthlyRevenue, expenses: monthlyExpenses, profit: netProfit };
            default: return null;
        }
    };

    const getModalTitle = () => {
        switch (detailType) {
            case 'revenue': return t('finance.totalRevenue');
            case 'income': return t('finance.monthlyRevenue');
            case 'expenses': return t('finance.salaries');
            case 'pt_sessions': return t('finance.ptEarnings');
            case 'refunds': return t('finance.refunds');
            case 'general_expenses': return t('finance.expenses');
            case 'profit': return t('finance.netProfitSummary');
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
                <div className="flex flex-col sm:flex-row items-center gap-8">
                    {/* Period Selector */}
                    <div className="flex items-center gap-4 bg-white/5 p-2 rounded-[2rem] border border-white/10 shadow-inner">
                        <button
                            onClick={() => setSelectedDate(prev => addMonths(prev, -1))}
                            className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all active:scale-90"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="flex flex-col items-center px-4 min-w-[140px]">
                            <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em] leading-none mb-1">{t('finance.period')}</span>
                            <span className="text-lg font-black text-white uppercase tracking-tighter">
                                {format(selectedDate, 'MMMM yyyy')}
                            </span>
                        </div>
                        <button
                            onClick={() => setSelectedDate(prev => addMonths(prev, 1))}
                            className="p-3 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all active:scale-90"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-4 justify-center sm:justify-end items-center">
                        {/* Sync Button */}
                        <button
                            onClick={async () => {
                                setIsSyncing(true);
                                await refetch();
                                setTimeout(() => setIsSyncing(false), 500);
                                toast.success('Finance data synced');
                            }}
                            className="group relative w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex items-center justify-center overflow-hidden active:scale-90"
                            title={t('common.sync')}
                        >
                            <RefreshCw className={`w-5 h-5 text-white/40 group-hover:text-white transition-all duration-700 ${isSyncing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
                        </button>

                        {/* Trash / Restore Button */}
                        <button
                            onClick={() => setShowTrashModal(true)}
                            className="group relative w-12 h-12 rounded-2xl bg-white/5 hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all flex items-center justify-center overflow-hidden active:scale-90"
                            title="Deleted Transactions"
                        >
                            <History className="w-5 h-5 text-white/40 group-hover:text-rose-400 transition-colors" />
                        </button>

                        <div className="w-px h-8 bg-white/5 mx-2 hidden sm:block"></div>

                        <button
                            onClick={() => setShowAddModal(true)}
                            className="group bg-primary hover:bg-primary/90 text-white px-8 py-4 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Plus className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{t('finance.addPayment')}</span>
                        </button>
                        {/* ... other buttons ... */}
                        <button
                            onClick={() => setShowRefundModal(true)}
                            className="group bg-rose-500 hover:bg-rose-600 text-white px-8 py-4 rounded-[2rem] shadow-premium shadow-rose-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <DollarSign className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{t('finance.addRefund')}</span>
                        </button>
                        <button
                            onClick={() => setShowExpenseModal(true)}
                            className="group bg-orange-500 hover:bg-orange-600 text-white px-8 py-4 rounded-[2rem] shadow-premium shadow-orange-500/20 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-[10px] relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <Receipt className="w-4 h-4 relative z-10" />
                            <span className="relative z-10">{t('finance.addExpense')}</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Total Revenue */}
                <button onClick={() => setDetailType('revenue')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-primary/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-primary transition-colors truncate">{t('finance.totalRevenue')}</p>
                        <div className="p-2 bg-primary/20 rounded-xl text-primary shadow-inner">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tighter">{totalRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-primary flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Income */}
                <button onClick={() => setDetailType('income')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-indigo-400/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl group-hover:bg-indigo-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-indigo-400 transition-colors truncate">{t('finance.monthlyRevenue')}</p>
                        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400 shadow-inner">
                            <Calendar className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-white tracking-tighter">{monthlyRevenue.toLocaleString()}</h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-indigo-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Base Salaries */}
                <button onClick={() => setDetailType('expenses')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-orange-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-orange-400 transition-colors truncate">{t('finance.salaries')}</p>
                        <div className="p-2 bg-orange-500/20 rounded-xl text-orange-400 shadow-inner">
                            <Wallet className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-orange-400 tracking-tighter">
                            {payrollLoading ? '...' : monthlyBaseSalaries.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-orange-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* PT Sessions */}
                <button onClick={() => setDetailType('pt_sessions')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-purple-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl group-hover:bg-purple-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-purple-400 transition-colors truncate">{t('finance.ptEarnings')}</p>
                        <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400 shadow-inner">
                            <Dumbbell className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-purple-400 tracking-tighter">
                            {payrollLoading ? '...' : monthlyPTEarnings.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-purple-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Refunds */}
                <button onClick={() => setDetailType('refunds')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-rose-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-500/5 rounded-full blur-3xl group-hover:bg-rose-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-rose-400 transition-colors truncate">{t('finance.refunds')}</p>
                        <div className="p-2 bg-rose-500/20 rounded-xl text-rose-400 shadow-inner">
                            <DollarSign className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-rose-400 tracking-tighter">
                            {totalMonthlyRefunds.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-rose-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Monthly Expenses */}
                <button onClick={() => setDetailType('general_expenses')} className="text-left w-full glass-card p-5 rounded-3xl border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-amber-500/30">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl group-hover:bg-amber-500/10 transition-colors"></div>
                    <div className="flex items-center justify-between mb-4 relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 group-hover:text-amber-400 transition-colors truncate">{t('finance.expenses')}</p>
                        <div className="p-2 bg-amber-500/20 rounded-xl text-amber-400 shadow-inner">
                            <Receipt className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className="text-2xl font-black text-amber-400 tracking-tighter">
                            {totalMonthlyGeneralExpenses.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-4 flex items-center justify-between relative z-10">
                        <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em]">{currency.code}</span>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[9px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>

                {/* Net Profit */}
                <button onClick={() => setDetailType('profit')} className="text-left w-full glass-card p-8 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden group hover:scale-[1.02] transition-all duration-500 cursor-pointer hover:border-emerald-400/30">
                    <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl transition-colors ${netProfit >= 0 ? 'bg-emerald-500/5 group-hover:bg-emerald-500/10' : 'bg-orange-500/5 group-hover:bg-orange-500/10'}`}></div>
                    <div className="flex items-center justify-between mb-8 relative z-10">
                        <p className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${netProfit >= 0 ? 'text-white/40 group-hover:text-emerald-400' : 'text-white/40 group-hover:text-orange-400'}`}>{t('finance.netProfit')}</p>
                        <div className={`p-3 rounded-2xl shadow-inner ${netProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'}`}>
                            <Wallet className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 relative z-10">
                        <h3 className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-emerald-400' : 'text-orange-400'}`}>
                            {payrollLoading ? '...' : netProfit.toLocaleString()}
                        </h3>
                    </div>
                    <div className="mt-8 flex items-center justify-between relative z-10">
                        <div className="flex items-center gap-3 text-[9px] font-black uppercase tracking-[0.3em] opacity-60">
                            {netProfit >= 0 ? (
                                <span className="text-emerald-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {t('finance.profitable')}</span>
                            ) : (
                                <span className="text-orange-400 flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span> {t('finance.deficit')}</span>
                            )}
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-black uppercase tracking-widest text-emerald-400 flex items-center gap-1">
                            {t('finance.viewDetails')} →
                        </div>
                    </div>
                </button>
            </div>

            <FinanceDetailModal
                isOpen={!!detailType}
                onClose={() => setDetailType(null)}
                type={detailType}
                title={getModalTitle()}
                data={getModalData()}
                onDelete={handleDeleteTransaction}
            />
            {/* Recent Transactions List */}
            <div className="glass-card rounded-[3rem] overflow-hidden border border-white/10 shadow-premium mt-12 bg-white/[0.01]">
                <div className="flex items-center justify-between px-10 py-8 bg-white/[0.02] border-b border-white/5">
                    <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                        {t('finance.recentTransactions')}
                        {selectedItems.length > 0 && (
                            <span className="text-[10px] bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/20">
                                {selectedItems.length} {t('common.selected')}
                            </span>
                        )}
                    </h2>
                    {selectedItems.length > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-6 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('finance.bulkDelete')}
                        </button>
                    )}
                </div>
                <div className="overflow-x-auto overflow-y-visible">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="sticky top-0 z-10">
                            <tr className="bg-white/[0.02] backdrop-blur-md">
                                <th className="px-10 py-6">
                                    <input
                                        type="checkbox"
                                        checked={payments.length > 0 && selectedItems.length === payments.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedItems(payments.map(p => p.id));
                                            } else {
                                                setSelectedItems([]);
                                            }
                                        }}
                                        className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer accent-primary"
                                    />
                                </th>
                                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{t('common.student')}</th>
                                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{t('common.role')}</th>
                                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{t('common.date')}</th>
                                <th className="px-10 py-7 text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{t('common.method')}</th>
                                <th className="px-10 py-7 text-right text-[10px] font-black uppercase tracking-[0.4em] text-white/20">{t('finance.amount')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr><td colSpan={6} className="px-10 py-40 text-center"><div className="flex flex-col items-center gap-4"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div><p className="text-[10px] font-black uppercase tracking-widest text-white/20">{t('common.loading')}</p></div></td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={6} className="px-10 py-40 text-center text-white/10 font-black uppercase tracking-[0.3em] italic text-xs">{t('common.noResults')}</td></tr>
                            ) : (
                                payments.map((payment) => {
                                    const isPT = payment.notes?.toLowerCase().includes('pt');
                                    const isSelected = selectedItems.includes(payment.id);
                                    return (
                                        <tr key={payment.id} className={`group hover:bg-white/[0.04] transition-all duration-500 ${isSelected ? 'bg-primary/5' : ''}`}>
                                            <td className="px-10 py-8">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => {
                                                        setSelectedItems(prev =>
                                                            prev.includes(payment.id)
                                                                ? prev.filter(id => id !== payment.id)
                                                                : [...prev, payment.id]
                                                        );
                                                    }}
                                                    className="w-5 h-5 rounded-lg border-2 border-white/10 bg-white/5 checked:bg-primary checked:border-primary transition-all cursor-pointer accent-primary"
                                                />
                                            </td>
                                            <td className="px-10 py-8">
                                                <div className="flex items-center gap-5">
                                                    <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center text-sm font-black text-white/40 group-hover:bg-primary/20 group-hover:text-primary group-hover:scale-110 transition-all duration-500 shadow-inner">
                                                        {payment.students?.full_name?.[0] || (payment.notes?.split(' - ')[1]?.[0] || 'G')}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-white text-xl tracking-tight leading-none mb-1 group-hover:text-primary transition-colors">
                                                            {payment.students?.full_name || (payment.notes?.split(' - ')[1] || t('common.guest'))}
                                                        </div>
                                                        <div className="text-[10px] font-black text-white/20 uppercase tracking-[0.1em]">
                                                            {payment.students?.full_name ? t('pt.academyStudent') : t('pt.guestStudent')}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-10 py-8">
                                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${isPT
                                                    ? 'bg-primary/10 text-primary border-primary/20 group-hover:bg-primary/20'
                                                    : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 group-hover:bg-emerald-500/20'
                                                    }`}>
                                                    {isPT ? t('pt.title') : t('common.student')}
                                                </span>
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
                                                <div className="flex flex-col items-end group-hover:scale-105 transition-transform duration-500 origin-right">
                                                    <span className="text-4xl font-black text-emerald-400 tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">
                                                        +{Number(payment.amount).toLocaleString()}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] font-black text-white/10 uppercase tracking-[0.3em]">{currency.code}</span>
                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            {
                showAddModal && (
                    <AddPaymentForm
                        onClose={() => setShowAddModal(false)}
                        onSuccess={refetch}
                    />
                )
            }
            {
                showRefundModal && (
                    <AddRefundForm
                        onClose={() => setShowRefundModal(false)}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['refunds'] });
                        }}
                        onAdd={async (refund) => {
                            await addRefundMutation.mutateAsync(refund);
                        }}
                    />
                )
            }
            {
                showExpenseModal && (
                    <AddExpenseForm
                        onClose={() => setShowExpenseModal(false)}
                        onSuccess={() => {
                            queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        }}
                        onAdd={async (expense) => {
                            await addExpenseMutation.mutateAsync(expense);
                        }}
                    />
                )
            }
            {
                showTrashModal && (
                    <FinanceTrashModal
                        isOpen={showTrashModal}
                        onClose={() => setShowTrashModal(false)}
                        onRestore={() => {
                            refetch();
                            queryClient.invalidateQueries({ queryKey: ['refunds'] });
                            queryClient.invalidateQueries({ queryKey: ['expenses'] });
                        }}
                    />
                )
            }

            <ConfirmModal
                isOpen={confirmDelete}
                onClose={() => setConfirmDelete(false)}
                onConfirm={confirmDeleteTransaction}
                title={t('common.delete')}
                message={t('common.deleteConfirm')}
                type="danger"
            />
        </div >
    );
}
