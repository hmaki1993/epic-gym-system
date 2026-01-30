import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Smile, Edit, Trash2 } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import AddStudentForm from '../components/AddStudentForm';
import { useTranslation } from 'react-i18next';
import { useStudents } from '../hooks/useData';

interface Student {
    id: number; // bigint
    full_name: string;
    age: number;
    contact_number: string;
    subscription_expiry: string;
    created_at: string;
}

export default function Students() {
    const { t } = useTranslation();
    const { data: studentsData, isLoading: loading, refetch } = useStudents();
    const students = studentsData || [];

    const [searchQuery, setSearchQuery] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);

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

    const handleDelete = async (id: number) => {
        if (!confirm(t('common.deleteConfirm'))) return;

        const { error } = await supabase.from('students').delete().eq('id', id);
        if (error) {
            console.error('Error deleting:', error);
            alert(t('common.deleteError'));
        } else {
            refetch();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">{t('students.title')}</h1>
                    <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">{t('students.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingStudent(null);
                        setShowAddModal(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">{t('dashboard.addStudent')}</span>
                </button>
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

            {/* Filters and Search */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/10 shadow-premium flex flex-col md:flex-row gap-6 items-center">
                <div className="relative flex-1 w-full group">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 group-focus-within:text-primary transition-colors" />
                    <input
                        type="text"
                        placeholder={t('common.search')}
                        className="w-full pl-14 pr-6 py-5 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 transition-all focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <button className="p-5 bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all hover:scale-110 border border-white/5">
                    <Filter className="w-5 h-5" />
                </button>
            </div>

            {/* Students Table */}
            <div className="glass-card rounded-[2.5rem] overflow-hidden border border-white/10 shadow-premium">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-white/20 font-black text-[10px] uppercase tracking-[0.2em] border-b border-white/5">
                            <tr>
                                <th className="px-10 py-7">{t('common.name')}</th>
                                <th className="px-10 py-7">{t('students.status')}</th>
                                <th className="px-10 py-7">{t('students.contact')}</th>
                                <th className="px-10 py-7 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                                            <span className="text-white/20 font-black uppercase tracking-widest text-[10px] animate-pulse">{t('common.loading')}</span>
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-10 py-20 text-center">
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
                                                    <div className="relative w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary font-black text-xl shadow-inner group-hover:scale-110 transition-transform duration-500">
                                                        {student.full_name?.[0] || '?'}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="font-black text-white text-lg group-hover:text-primary transition-colors duration-300">
                                                        {student.full_name || <span className="text-white/20 italic font-medium">{t('common.unknown')}</span>}
                                                    </div>
                                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-primary/30"></span>
                                                        ID: {String(student.id).slice(0, 8)}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8">
                                            <span className={`inline-flex items-center px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 ${student.subscription_status === 'active'
                                                ? 'bg-emerald-500/5 text-emerald-400 border-emerald-500/10 shadow-[0_0_20px_rgba(52,211,153,0.05)]'
                                                : 'bg-rose-500/5 text-rose-400 border-rose-500/10 shadow-[0_0_20px_rgba(251,113,133,0.05)]'
                                                }`}>
                                                <span className={`w-2 h-2 rounded-full mr-2.5 ${student.subscription_status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                                                {student.subscription_status}
                                            </span>
                                        </td>
                                        <td className="px-10 py-8">
                                            <div className="flex flex-col">
                                                <span className="text-white font-mono text-sm tracking-widest">{student.contact_number || <span className="text-white/20">-</span>}</span>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">Contact Number</span>
                                            </div>
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <div className="flex items-center justify-end gap-3">
                                                <button
                                                    onClick={() => {
                                                        setEditingStudent(student);
                                                        setShowAddModal(true);
                                                    }}
                                                    className="p-4 bg-white/5 text-white/30 hover:text-primary hover:bg-primary/10 rounded-2xl transition-all hover:scale-110 border border-white/5"
                                                    title="Edit Student"
                                                >
                                                    <Edit className="w-5 h-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="p-4 bg-white/5 text-white/30 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all hover:scale-110 border border-white/5"
                                                    title="Delete Student"
                                                >
                                                    <Trash2 className="w-5 h-5" />
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

            {/* Modal */}
            {showAddModal && (
                <AddStudentForm
                    initialData={editingStudent}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingStudent(null);
                    }}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}
