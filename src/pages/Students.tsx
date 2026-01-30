import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Smile } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import AddStudentForm from '../components/AddStudentForm';
import { useTranslation } from 'react-i18next';
import { useStudents } from '../hooks/useData';

interface Student {
    id: string; // uuid
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

    const handleDelete = async (id: string) => {
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
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">{t('students.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('students.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingStudent(null);
                        setShowAddModal(true);
                    }}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">{t('dashboard.addStudent')}</span>
                </button>
            </div>

            {/* Stats Cards (Optional Quick View) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <p className="text-sm text-gray-500 font-medium">{t('dashboard.totalStudents')}</p>
                        <h3 className="text-2xl font-bold text-secondary">{students.length}</h3>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full text-blue-600">
                        <Smile className="w-6 h-6" />
                    </div>
                </div>
                {/* Add more stats here later */}
            </div>

            {/* Main Content Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Toolbar */}
                <div className="p-5 border-b border-gray-100 flex gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder={t('common.search')}
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/10 outline-none transition-all text-gray-900"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="p-2.5 text-gray-500 hover:bg-gray-50 rounded-lg border border-gray-200 transition-colors">
                        <Filter className="w-5 h-5" />
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-600 font-medium text-sm uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-4">{t('common.name')}</th>
                                <th className="px-6 py-4">{t('students.age')}</th>
                                <th className="px-6 py-4">{t('students.contact')}</th>
                                <th className="px-6 py-4">{t('students.subscription')}</th>
                                <th className="px-6 py-4 text-right">{t('common.actions')}</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        {t('common.loading')}
                                    </td>
                                </tr>
                            ) : filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                                        {t('common.noResults')}
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => {
                                    const status = getSubscriptionStatus(student.subscription_expiry);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="font-semibold text-gray-900">
                                                    {student.full_name || <span className="text-gray-400 italic">{t('common.unknown')}</span>}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">{student.age || '-'}</td>
                                            <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                                {student.contact_number || <span className="text-gray-300">-</span>}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${status.color}`}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setEditingStudent(student);
                                                        setShowAddModal(true);
                                                    }}
                                                    className="text-blue-600 hover:text-blue-800 transition-colors font-medium text-sm p-1"
                                                >
                                                    {t('common.edit')}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="text-red-500 hover:text-red-700 transition-colors font-medium text-sm p-1"
                                                >
                                                    {t('common.delete')}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
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
