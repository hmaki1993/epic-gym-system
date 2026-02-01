import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Smile, Edit, Trash2, TrendingUp, User as UserIcon, Calendar, RefreshCw } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import AddStudentForm from '../components/AddStudentForm';
import AddPTSubscriptionForm from '../components/AddPTSubscriptionForm';
import RenewSubscriptionForm from '../components/RenewSubscriptionForm';
import RenewPTSubscriptionForm from '../components/RenewPTSubscriptionForm';
import ConfirmModal from '../components/ConfirmModal';
import { useTranslation } from 'react-i18next';
import { useStudents } from '../hooks/useData';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';



interface Student {
    id: number;
    full_name: string;
    age: number;
    contact_number: string;
    parent_contact: string;
    subscription_expiry: string;
    is_active: boolean;
    created_at: string;
    coaches?: {
        full_name: string;
    };
    subscription_plans?: {
        name: string;
        price: number;
    };
    training_groups?: {
        name: string;
    };
}

export default function Students() {
    const { t, i18n } = useTranslation();
    const { currency } = useCurrency();
    const { data: studentsData, isLoading: loading, refetch } = useStudents();
    const students = studentsData || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [idToDelete, setIdToDelete] = useState<number | null>(null);
    const [showPTModal, setShowPTModal] = useState(false);
    const [ptSubscriptions, setPtSubscriptions] = useState<any[]>([]);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [showPTRenewModal, setShowPTRenewModal] = useState(false);
    const [studentToRenew, setStudentToRenew] = useState<Student | null>(null);
    const [ptToDelete, setPtToDelete] = useState<any>(null);
    const [ptToEdit, setPtToEdit] = useState<any>(null);
    const [ptToRenew, setPtToRenew] = useState<any>(null);

    // Group View State
    // const [viewMode, setViewMode] = useState<'list' | 'groups'>('list'); // Removed
    // const [groups, setGroups] = useState<any[]>([]); // Removed
    // const [groupsLoading, setGroupsLoading] = useState(false); // Removed
    // const [selectedGroup, setSelectedGroup] = useState<any>(null); // Removed

    // Fetch Groups logic removed

    useEffect(() => {
        fetchPTSubscriptions();

        // Real-time subscription for PT subscriptions
        const ptSubscription = supabase
            .channel('pt_subscriptions_changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'pt_subscriptions'
                },
                () => {
                    console.log('PT subscriptions changed');
                    fetchPTSubscriptions();
                }
            )
            .subscribe();

        return () => {
            ptSubscription.unsubscribe();
        };
    }, []);

    const fetchPTSubscriptions = async () => {
        const { data, error } = await supabase
            .from('pt_subscriptions')
            .select(`
                *,
                students(id, full_name),
                coaches(id, full_name)
            `)
            .order('status', { ascending: true })
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching PT subscriptions:', error);
        } else {
            setPtSubscriptions(data || []);
        }
    };

    const handleDeletePT = async () => {
        if (!ptToDelete) return;

        const { error } = await supabase
            .from('pt_subscriptions')
            .delete()
            .eq('id', ptToDelete.id);

        if (error) {
            console.error('Error deleting PT:', error);
            toast.error(t('common.deleteError'));
        } else {
            toast.success(t('common.deleteSuccess'));
            fetchPTSubscriptions();
            setPtToDelete(null);
        }
    };


    const getSubscriptionStatus = (expiryDate: string | null) => {
        if (!expiryDate) return { label: t('common.unknown'), color: 'bg-gray-100 text-gray-700 border-gray-200' };

        const date = new Date(expiryDate);
        if (isNaN(date.getTime())) return { label: t('common.invalid'), color: 'bg-red-50 text-red-500 border-red-100' };

        const daysLeft = differenceInDays(date, new Date());

        if (daysLeft < 0) return { label: t('students.expired'), color: 'bg-red-100 text-red-700 border-red-200' };
        if (daysLeft <= 3) return { label: t('students.expiringSoon'), color: 'bg-orange-100 text-orange-700 border-orange-200' };
        if (daysLeft <= 7) return { label: t('common.daysLeft', { count: daysLeft }), color: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
        return { label: t('students.active'), color: 'bg-green-100 text-green-700 border-green-200' };
    };

    const filteredStudents = students.filter(student =>
        (student.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (student.contact_number || '').includes(searchQuery)
    );

    const [editingStudent, setEditingStudent] = useState<Student | null>(null);

    const handleDelete = async () => {
        if (!idToDelete) return;

        const { error } = await supabase.from('students').delete().eq('id', idToDelete);
        if (error) {
            console.error('Error deleting:', error);
            alert(t('common.deleteError'));
        } else {
            refetch();
            setIdToDelete(null);
        }
    };

    const toggleStudentStatus = async (studentId: number, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('students')
                .update({ is_active: !currentStatus })
                .eq('id', studentId);

            if (error) throw error;
            refetch();
        } catch (error) {
            console.error('Error toggling student status:', error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">{t('students.title')}</h1>
                    <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">{t('students.subtitle')}</p>
                </div>

                <div className="flex gap-4 w-full sm:w-auto">
                    {/* View Toggle */}


                    <button
                        onClick={() => {
                            setEditingStudent(null);
                            setShowAddModal(true);
                        }}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                    >
                        <Plus className="w-5 h-5" />
                        <span className="font-semibold">{t('dashboard.addStudent')}</span>
                    </button>
                </div>
            </div>

            {/* Stats Cards (Optional Quick View) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium flex items-center justify-between group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-1">{t('dashboard.totalStudents')}</p>
                        <h3 className="text-4xl font-black text-white">{students.length}</h3>
                    </div>
                    <div className="relative z-10 w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                        <Smile className="w-8 h-8" />
                    </div>
                </div>
            </div>

            {/* PT Subscriptions Section - PREMIUM */}
            <div className="glass-card p-12 rounded-[3.5rem] border border-white/10 shadow-premium relative overflow-hidden bg-gradient-to-br from-white/[0.02] to-transparent">
                {/* Gradient Background Effects */}
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br from-primary/10 to-accent/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-gradient-to-tr from-accent/5 to-primary/5 rounded-full blur-3xl pointer-events-none"></div>

                <div className="relative z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-10">
                        <div className="flex items-center gap-5">
                            <div className="p-5 bg-gradient-to-br from-primary via-primary/80 to-accent rounded-[1.5rem] shadow-lg shadow-primary/30 relative group">
                                <div className="absolute inset-0 bg-white/20 rounded-[1.5rem] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <TrendingUp className="w-8 h-8 text-white relative z-10" />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                                    Personal Training
                                    <span className="px-3 py-1 bg-accent/20 text-accent text-xs rounded-full border border-accent/30 font-black uppercase tracking-wider">
                                        Premium
                                    </span>
                                </h2>
                                <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mt-2">
                                    Professional 1-on-1 Training Sessions
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPTModal(true)}
                            className="group/btn bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-4 rounded-[1.5rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-3 font-black uppercase tracking-widest text-sm relative overflow-hidden"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-500"></div>
                            <Plus className="w-5 h-5 relative z-10" />
                            <span className="relative z-10">Add PT Subscription</span>
                        </button>
                    </div>

                    {/* Active PT Subscriptions */}
                    {ptSubscriptions.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {ptSubscriptions.map((subscription) => (
                                <div
                                    key={subscription.id}
                                    className="glass-card p-8 rounded-[2.5rem] border border-white/10 hover:border-primary/30 transition-all duration-500 group hover:scale-[1.02] relative overflow-hidden"
                                >
                                    {/* Card Gradient */}
                                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[2.5rem]"></div>

                                    <div className="relative z-10">
                                        {/* Card Actions */}
                                        <div className="absolute top-0 right-0 flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setPtToRenew(subscription);
                                                    setShowPTRenewModal(true);
                                                }}
                                                className="p-2 bg-accent/10 hover:bg-accent/20 text-accent rounded-xl border border-accent/20 transition-all"
                                                title="Renew PT Subscription"
                                            >
                                                <RefreshCw className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setPtToEdit(subscription)}
                                                className="p-2 bg-white/5 hover:bg-primary/20 text-white/20 hover:text-primary rounded-xl border border-white/5 transition-all"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setPtToDelete(subscription)}
                                                className="p-2 bg-white/5 hover:bg-rose-500/20 text-white/20 hover:text-rose-500 rounded-xl border border-white/5 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>

                                        {/* Student Info */}
                                        <div className="flex items-center gap-4 mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                                                {(subscription.students?.full_name || subscription.student_name || 'S')?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0 pr-20">
                                                <h3 className="font-black text-white text-lg tracking-tight group-hover:text-primary transition-colors truncate" title={subscription.students?.full_name || subscription.student_name || 'Unknown'}>
                                                    {subscription.students?.full_name || subscription.student_name || 'Unknown'}
                                                </h3>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">
                                                    {subscription.student_name && !subscription.students ? 'Guest Student' : 'Academy Student'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Coach Info */}
                                        <div className="flex items-center gap-3 mb-6 p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <UserIcon className="w-4 h-4 text-accent" />
                                            <div className="flex-1">
                                                <p className="text-xs font-black text-white/60 uppercase tracking-wider">Coach</p>
                                                <p className="text-sm font-black text-white">{subscription.coaches?.full_name || 'Unknown'}</p>
                                            </div>
                                        </div>

                                        {/* Progress Bar */}
                                        <div className="mb-6">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-wider">Progress</span>
                                                <span className="text-xs font-black text-accent">{subscription.sessions_remaining}/{subscription.sessions_total}</span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                                <div
                                                    className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-700"
                                                    style={{ width: `${(subscription.sessions_remaining / subscription.sessions_total) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {/* Sessions Info */}
                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 group-hover:bg-primary/5 transition-colors">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Remaining</p>
                                                <p className="text-2xl font-black text-primary">{subscription.sessions_remaining}</p>
                                            </div>
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total</p>
                                                <p className="text-2xl font-black text-white">{subscription.sessions_total}</p>
                                            </div>
                                        </div>

                                        {/* Price & Expiry */}
                                        <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                            <div>
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Total Price</p>
                                                <p className="text-xl font-black premium-gradient-text tracking-tighter">
                                                    {subscription.total_price?.toLocaleString()} <span className="text-[10px] uppercase ml-1">{currency.code}</span>
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Expires</p>
                                                <p className="text-xs font-bold text-white/80">{format(new Date(subscription.expiry_date), 'MMM dd, yyyy')}</p>
                                            </div>
                                        </div>

                                        {/* Status Badge */}
                                        <div className="mt-4">
                                            {(() => {
                                                const isExpired = new Date(subscription.expiry_date) < new Date() || subscription.status === 'expired' || subscription.sessions_remaining <= 0;
                                                return isExpired ? (
                                                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                                <span className="text-xs font-black text-red-500 uppercase tracking-wider">
                                                                    {(subscription.sessions_remaining <= 0 || subscription.status === 'expired') ? 'Out of Sessions' : 'Expired'}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <p className="text-[10px] text-red-400/80 font-bold uppercase tracking-wider">
                                                            ⚠️ Renewal Required
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center justify-center gap-2 p-3 bg-accent/10 border border-accent/20 rounded-2xl group-hover:bg-accent/20 transition-all">
                                                        <div className="w-2 h-2 rounded-full bg-accent animate-pulse"></div>
                                                        <span className="text-xs font-black text-accent uppercase tracking-wider">Active Subscription</span>
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-24 h-24 mx-auto mb-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center">
                                <TrendingUp className="w-12 h-12 text-white/20" />
                            </div>
                            <p className="text-white/40 font-black uppercase tracking-widest text-sm">No Active PT Subscriptions</p>
                            <p className="text-white/20 text-xs mt-2">Click "Add PT Subscription" to get started</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters and Search Container */}
            <div className="glass-card p-10 rounded-[3.5rem] border border-white/10 shadow-premium flex flex-col md:flex-row gap-8 items-center bg-gradient-to-tr from-white/[0.02] to-transparent">
                <div className="flex-1 relative group w-full max-w-3xl">
                    {/* Premium Outer Glow */}
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-white/5 to-accent/10 rounded-[2rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-all duration-1000"></div>

                    <div className="relative flex items-center bg-[#0d1321]/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] px-8 overflow-hidden transition-all duration-500 group-focus-within:border-primary/40 group-focus-within:shadow-[0_0_60px_-15px_rgba(129,140,248,0.2)] group-hover:border-white/20">
                        {/* Animated Icon Container */}
                        <div className="relative flex items-center justify-center mr-5">
                            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg scale-0 group-focus-within:scale-150 transition-transform duration-700 opacity-50"></div>
                            <Search className="relative w-5 h-5 text-white/30 group-focus-within:text-primary transition-all duration-500 flex-shrink-0" />
                        </div>

                        {/* Search Input */}
                        <input
                            type="text"
                            spellCheck="false"
                            placeholder={i18n.language === 'ar' ? 'ابحث بالاسم أو رقم الهاتف...' : 'Search by name or contact number...'}
                            className="relative flex-1 py-6 bg-transparent border-none text-white text-lg font-bold tracking-tight outline-none placeholder:text-white/10 placeholder:font-black placeholder:uppercase placeholder:text-xs placeholder:tracking-[0.2em] selection:bg-primary/30"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />

                        {/* Pro Shortcut Indicator */}
                        <div className="hidden sm:flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/5 text-[9px] font-black text-white/20 group-focus-within:text-primary group-focus-within:border-primary/20 group-focus-within:bg-primary/5 transition-all duration-500 uppercase tracking-[0.2em] whitespace-nowrap">
                            <span className="italic opacity-50">{i18n.language === 'ar' ? 'فلترة بحث' : 'FOCUSED'}</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        className="group/filter flex items-center gap-4 px-8 py-5 bg-white/5 hover:bg-primary/10 text-white/30 hover:text-primary rounded-[2rem] border border-white/10 hover:border-primary/30 transition-all duration-500 hover:scale-105 active:scale-95 shadow-lg"
                        title="Advanced Filters"
                    >
                        <Filter className="w-5 h-5 group-hover/filter:rotate-180 transition-transform duration-700" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">{i18n.language === 'ar' ? 'تصفية' : 'Filter'}</span>
                    </button>
                </div>
            </div>

            {/* Students Table */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-premium">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-white/20 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                            <tr>
                                <th className="px-10 py-7">{t('common.name')}</th>
                                <th className="px-10 py-7">{t('students.status')}</th>
                                <th className="px-10 py-7">{t('students.assignedCoach', 'Coach')}</th>
                                <th className="px-10 py-7">{t('students.plan', 'Plan')}</th>
                                <th className="px-10 py-7">{t('students.contact')}</th>
                                <th className="px-10 py-7 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-white/20 font-black uppercase tracking-widest text-[10px] animate-pulse">{t('common.loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-10 py-20 text-center">
                                        <div className="text-white/20 font-black uppercase tracking-widest text-xs">{t('common.noResults')}</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="hover:bg-white/[0.02] transition-all duration-300 group">
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-5">
                                                <div className="relative">
                                                    <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-2xl blur opacity-0 group-hover:opacity-20 transition-all duration-500"></div>
                                                    <div className={`relative w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:scale-110 transition-transform duration-500 ${!student.is_active && 'opacity-40'}`}>
                                                        {student.full_name?.[0] || '?'}
                                                    </div>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`font-black text-white text-lg group-hover:text-primary transition-colors duration-300 ${!student.is_active && 'opacity-40'}`}>
                                                            {student.full_name || <span className="text-white/20 italic font-medium">{t('common.unknown')}</span>}
                                                        </div>
                                                        {!student.is_active && (
                                                            <span className="px-2 py-1 bg-red-500/10 border border-red-500/20 rounded-lg text-[8px] font-black text-red-500 uppercase tracking-wider">
                                                                Inactive
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className={`text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2 ${!student.is_active && 'opacity-40'}`}>
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                                                        ID: {String(student.id).slice(0, 8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            {(() => {
                                                if (!student.is_active) {
                                                    return (
                                                        <button
                                                            onClick={() => toggleStudentStatus(student.id, student.is_active)}
                                                            className="inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 bg-red-500/10 border-red-500/20 text-red-500 hover:bg-red-500/20 hover:scale-105"
                                                        >
                                                            <span className="w-2 h-2 rounded-full mr-2.5 bg-red-500"></span>
                                                            Inactive
                                                        </button>
                                                    );
                                                }

                                                const status = getSubscriptionStatus(student.subscription_expiry);
                                                return (
                                                    <button
                                                        onClick={() => toggleStudentStatus(student.id, student.is_active)}
                                                        className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${status.color} hover:scale-105 hover:shadow-lg cursor-pointer`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full mr-2.5 ${status.label === t('students.active') ? 'bg-emerald-400 animate-pulse' : 'bg-current'}`}></span>
                                                        {status.label}
                                                    </button>
                                                );
                                            })()}
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:border-primary/30 transition-colors">
                                                    <span className="text-[10px] font-black text-primary">
                                                        {student.coaches?.full_name?.charAt(0) || '?'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-white/80 group-hover:text-white transition-colors">
                                                        {student.coaches?.full_name || <span className="text-white/20 text-xs uppercase tracking-wider">Not Assigned</span>}
                                                    </span>
                                                    {student.training_groups?.name && (
                                                        <span className="text-[10px] font-black text-accent uppercase tracking-wider mt-0.5">
                                                            {student.training_groups.name}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-white font-black text-sm tracking-wide">
                                                    {student.subscription_plans?.name || <span className="text-white/20 italic font-medium">No Plan</span>}
                                                </span>
                                                {student.subscription_plans?.price !== undefined && (
                                                    <div className="flex items-center gap-2 self-start px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg shadow-[0_0_10px_rgba(245,158,11,0.1)] group-hover:bg-amber-500/20 transition-all duration-300">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider">
                                                            {student.subscription_plans.price} {currency.code}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-white font-mono text-sm tracking-widest">{student.contact_number || <span className="text-white/20">-</span>}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">Contact Number</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                {/* Renew Button - Only for expired subscriptions */}
                                                {(() => {
                                                    const status = getSubscriptionStatus(student.subscription_expiry);
                                                    const isExpired = status.label !== t('students.active');
                                                    return isExpired && (
                                                        <button
                                                            onClick={() => {
                                                                setStudentToRenew(student);
                                                                setShowRenewModal(true);
                                                            }}
                                                            className="p-3 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent hover:text-accent border border-accent/20 hover:border-accent/40 transition-all duration-300 group/renew"
                                                            title="Renew Subscription"
                                                        >
                                                            <RefreshCw className="w-4 h-4 group-hover/renew:rotate-180 transition-transform duration-500" />
                                                        </button>
                                                    );
                                                })()}
                                                <button
                                                    onClick={() => {
                                                        setEditingStudent(student);
                                                        setShowAddModal(true);
                                                    }}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary transition-all duration-300"
                                                >
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => setIdToDelete(student.id)}
                                                    className="p-3 rounded-xl bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-500 transition-all duration-300"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showAddModal && (
                <AddStudentForm
                    onClose={() => setShowAddModal(false)}
                    initialData={editingStudent}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditingStudent(null);
                        refetch();
                    }}
                />
            )}

            {(showPTModal || ptToEdit) && (
                <AddPTSubscriptionForm
                    editData={ptToEdit}
                    onClose={() => {
                        setShowPTModal(false);
                        setPtToEdit(null);
                    }}
                    onSuccess={() => {
                        setShowPTModal(false);
                        setPtToEdit(null);
                        fetchPTSubscriptions();
                    }}
                />
            )}

            {showPTRenewModal && ptToRenew && (
                <RenewPTSubscriptionForm
                    subscription={ptToRenew}
                    onClose={() => {
                        setShowPTRenewModal(false);
                        setPtToRenew(null);
                    }}
                    onSuccess={() => {
                        setShowPTRenewModal(false);
                        setPtToRenew(null);
                        fetchPTSubscriptions();
                    }}
                />
            )}

            {showRenewModal && studentToRenew && (
                <RenewSubscriptionForm
                    student={studentToRenew}
                    onClose={() => {
                        setShowRenewModal(false);
                        setStudentToRenew(null);
                    }}
                    onSuccess={() => {
                        setShowRenewModal(false);
                        setStudentToRenew(null);
                        refetch();
                    }}
                />
            )}

            {idToDelete && (
                <ConfirmModal
                    isOpen={!!idToDelete}
                    onClose={() => setIdToDelete(null)}
                    onConfirm={handleDelete}
                    title={t('students.deleteConfirm')}
                    message={t('students.deleteWarning')}
                />
            )}

            {ptToDelete && (
                <ConfirmModal
                    isOpen={!!ptToDelete}
                    onClose={() => setPtToDelete(null)}
                    onConfirm={handleDeletePT}
                    title="Delete PT Subscription"
                    message={`Are you sure you want to delete the PT subscription for ${ptToDelete.students?.full_name || ptToDelete.student_name || 'this student'}? This action cannot be undone.`}
                />
            )}
        </div>
    );
}
