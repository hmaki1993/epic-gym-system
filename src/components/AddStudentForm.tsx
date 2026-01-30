import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Upload } from 'lucide-react';
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: 'inherit',
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
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
                style={{ backgroundColor: 'var(--color-surface)', color: 'inherit' }}
            >

                {/* Header */}
                <div className="px-6 py-4 flex items-center justify-between border-b border-white/10" style={{ backgroundColor: 'var(--color-primary)' }}>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {initialData ? 'Edit Student' : t('common.addStudent', 'Add New Student')}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('common.fullName', 'Full Name')}</label>
                            <input
                                required
                                type="text"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.full_name}
                                onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('common.age', 'Age')}</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.age}
                                onChange={e => setFormData({ ...formData, age: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('common.phone', 'Phone Number')}</label>
                            <input
                                required
                                type="tel"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.contact_number}
                                onChange={e => setFormData({ ...formData, contact_number: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('common.parentPhone', 'Parent Phone')}</label>
                            <input
                                type="tel"
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.parent_contact}
                                onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="border-t border-white/10 pt-4">
                        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2 opacity-90">
                            <Upload className="w-4 h-4 text-primary" />
                            Subscription Details
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-sm font-medium opacity-80">Type</label>
                                <select
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={formData.subscription_type}
                                    onChange={e => setFormData({ ...formData, subscription_type: e.target.value })}
                                    style={inputStyle}
                                >
                                    <option value="monthly" style={{ color: 'black' }}>Monthly (1 Month)</option>
                                    <option value="quarterly" style={{ color: 'black' }}>Quarterly (3 Months)</option>
                                    <option value="annual" style={{ color: 'black' }}>Annual (1 Year)</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-sm font-medium opacity-80">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                                    value={formData.subscription_start}
                                    onChange={e => setFormData({ ...formData, subscription_start: e.target.value })}
                                    style={inputStyle}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-white/10 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 opacity-70 hover:opacity-100 font-medium hover:bg-black/5 rounded-lg transition-colors"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 bg-primary text-white font-medium rounded-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                        >
                            {loading ? 'Saving...' : (
                                <>
                                    <Save className="w-5 h-5" />
                                    {t('common.save', 'Save Student')}
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
