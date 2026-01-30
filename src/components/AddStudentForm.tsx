import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Upload, UserPlus } from 'lucide-react';
import { parseISO, addMonths, format } from 'date-fns';
import toast from 'react-hot-toast';

interface AddStudentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddStudentForm({ onClose, onSuccess, initialData }: AddStudentFormProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        age: initialData?.age?.toString() || '',
        contact_number: initialData?.contact_number || '',
        parent_contact: initialData?.parent_contact || '',
        subscription_type: 'monthly',
        subscription_start: initialData?.subscription_expiry
            ? format(parseISO(initialData.created_at), 'yyyy-MM-dd') // Approximate start from creation or default
            : format(new Date(), 'yyyy-MM-dd'),
        notes: initialData?.notes || ''
    });

    // Theme-aware styles
    const inputStyle = {
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    const calculateExpiry = (start: string, type: string) => {
        const date = parseISO(start);
        let monthsToAdd = 1;
        if (type === 'quarterly') monthsToAdd = 3;
        if (type === 'annual') monthsToAdd = 12;
        return format(addMonths(date, monthsToAdd), 'yyyy-MM-dd');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const expiry = calculateExpiry(formData.subscription_start, formData.subscription_type);
            const studentData = {
                full_name: formData.full_name,
                age: parseInt(formData.age),
                contact_number: formData.contact_number,
                parent_contact: formData.parent_contact,
                subscription_expiry: expiry,
                notes: formData.notes
            };

            let error;

            if (initialData) {
                // Update existing student
                ({ error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', initialData.id));
            } else {
                // Insert new student
                ({ error } = await supabase
                    .from('students')
                    .insert([studentData]));
            }

            if (error) throw error;
            toast.success(initialData ? 'Student updated successfully' : 'Student added successfully');
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving student:', error);
            toast.error(`Error saving student: ${(error as any).message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div
                className="glass-card rounded-[3rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] border border-white/20"
            >
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-white/5">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-primary/20 rounded-xl text-primary">
                                <UserPlus className="w-6 h-6" />
                            </div>
                            {initialData ? 'Edit Student' : t('common.addStudent', 'Add New Student')}
                        </h2>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('common.fullName', 'Full Name')}</label>
                            <input
                                required
                                type="text"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('common.age', 'Age')}</label>
                            <input
                                required
                                type="number"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('common.phone', 'Phone Number')}</label>
                            <input
                                required
                                type="tel"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                value={formData.contact_number}
                                onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('common.parentPhone', 'Parent Phone')}</label>
                            <input
                                type="tel"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                value={formData.parent_contact}
                                onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/5 pt-8">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary mb-6 flex items-center gap-3">
                            <div className="p-1.5 bg-primary/20 rounded-lg">
                                <Upload className="w-3.5 h-3.5" />
                            </div>
                            Subscription Details
                        </h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Type</label>
                                <select
                                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white appearance-none cursor-pointer"
                                    value={formData.subscription_type}
                                    onChange={e => setFormData({ ...formData, subscription_type: e.target.value })}
                                >
                                    <option value="monthly" className="bg-slate-900">Monthly (1 Month)</option>
                                    <option value="quarterly" className="bg-slate-900">Quarterly (3 Months)</option>
                                    <option value="annual" className="bg-slate-900">Annual (1 Year)</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                    value={formData.subscription_start}
                                    onChange={e => setFormData({ ...formData, subscription_start: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-4 pt-8 border-t border-white/5 mt-8">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-2xl"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-10 py-4 bg-gradient-to-r from-primary to-primary/80 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 relative overflow-hidden group/btn"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                            {loading ? (
                                <span className="animate-pulse">Saving...</span>
                            ) : (
                                <>
                                    <Save className="w-4 h-4 relative z-10" />
                                    <span className="relative z-10">{t('common.save', 'Save Student')}</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
