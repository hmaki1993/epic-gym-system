import { useState, useEffect } from 'react';
import { X, User, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { format, addMonths } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';

interface AddPTSubscriptionFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

interface Coach {
    id: string;
    full_name: string;
    pt_rate: number;
}

interface Student {
    id: number;
    full_name: string;
}

export default function AddPTSubscriptionForm({ onClose, onSuccess }: AddPTSubscriptionFormProps) {
    const { t } = useTranslation();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);
    const [students, setStudents] = useState<Student[]>([]);

    const [formData, setFormData] = useState({
        student_id: '',
        coach_id: '',
        sessions_total: 1,
        start_date: format(new Date(), 'yyyy-MM-dd'),
        expiry_date: format(addMonths(new Date(), 3), 'yyyy-MM-dd'),
        price: 0
    });

    const selectedCoach = coaches.find(c => c.id === formData.coach_id);
    const pricePerSession = selectedCoach?.pt_rate || 0;

    // Update price when coach or sessions change
    useEffect(() => {
        if (selectedCoach) {
            setFormData(prev => ({
                ...prev,
                price: (selectedCoach.pt_rate || 0) * prev.sessions_total
            }));
        }
    }, [formData.coach_id, formData.sessions_total, coaches]);

    useEffect(() => {
        fetchCoaches();
        fetchStudents();
    }, []);

    const fetchCoaches = async () => {
        const { data, error } = await supabase
            .from('coaches')
            .select('id, full_name, pt_rate')
            .order('full_name');

        if (error) {
            console.error('Error fetching coaches:', error);
        } else {
            setCoaches(data || []);
        }
    };

    const fetchStudents = async () => {
        const { data, error } = await supabase
            .from('students')
            .select('id, full_name')
            .order('full_name');

        if (error) {
            console.error('Error fetching students:', error);
        } else {
            setStudents(data || []);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.student_id || !formData.coach_id) {
            toast.error(t('common.fillRequired'));
            return;
        }

        if (formData.sessions_total < 1) {
            toast.error('Number of sessions must be at least 1');
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase
                .from('pt_subscriptions')
                .insert({
                    student_id: parseInt(formData.student_id),
                    coach_id: formData.coach_id,
                    sessions_total: formData.sessions_total,
                    sessions_remaining: formData.sessions_total,
                    price_per_session: formData.sessions_total > 0 ? formData.price / formData.sessions_total : 0,
                    total_price: formData.price,
                    start_date: formData.start_date,
                    expiry_date: formData.expiry_date,
                    status: 'active'
                });

            if (error) throw error;

            // Record payment for PT Subscription
            await supabase.from('payments').insert({
                student_id: parseInt(formData.student_id),
                amount: formData.price,
                payment_date: formData.start_date || new Date().toISOString(),
                payment_method: 'cash',
                notes: `PT Subscription - Coach ${selectedCoach?.full_name}`
            });

            // Invalidate queries to update Revenue UI and PT lists
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            toast.success(t('common.saveSuccess'));
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating PT subscription:', error);
            toast.error(error.message || t('common.error'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
            <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium max-w-2xl w-full max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-300">
                {/* Gradient Background Effect */}
                <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-accent/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Header */}
                <div className="flex items-center justify-between mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-gradient-to-br from-primary to-accent rounded-2xl shadow-lg shadow-primary/20">
                            <TrendingUp className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight">
                                {t('pt.addSubscription') || 'PT Subscription'}
                            </h2>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-[0.2em] mt-1">
                                Professional Training
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/5 rounded-2xl transition-all text-white/40 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    {/* Student Selection */}
                    <div className="group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {t('common.student') || 'Student'}
                        </label>
                        <select
                            value={formData.student_id}
                            onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
                            className="w-full px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold text-lg appearance-none cursor-pointer"
                            required
                        >
                            <option value="" className="bg-gray-900">Select Student</option>
                            {students.map(student => (
                                <option key={student.id} value={student.id} className="bg-gray-900">
                                    {student.full_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Coach Selection */}
                    <div className="group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors flex items-center gap-2">
                            <User className="w-3 h-3" />
                            {t('common.coach') || 'Coach'}
                        </label>
                        <select
                            value={formData.coach_id}
                            onChange={(e) => setFormData({ ...formData, coach_id: e.target.value })}
                            className="w-full px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold text-lg appearance-none cursor-pointer"
                            required
                        >
                            <option value="" className="bg-gray-900">Select Coach</option>
                            {coaches.map(coach => (
                                <option key={coach.id} value={coach.id} className="bg-gray-900">
                                    {coach.full_name} - ${coach.pt_rate}/session
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Sessions Count */}
                    <div className="group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors">
                            {t('pt.sessionCount') || 'Number of Sessions'}
                        </label>
                        <input
                            type="number"
                            min="1"
                            value={formData.sessions_total}
                            onChange={(e) => setFormData({ ...formData, sessions_total: parseInt(e.target.value) || 1 })}
                            className="w-full px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold text-lg"
                            required
                        />
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="group">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {t('common.startDate') || 'Start Date'}
                            </label>
                            <input
                                type="date"
                                value={formData.start_date}
                                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                                className="w-full px-6 py-4 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold"
                                required
                            />
                        </div>
                        <div className="group">
                            <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors flex items-center gap-2">
                                <Calendar className="w-3 h-3" />
                                {t('common.expiryDate') || 'Expiry Date'}
                            </label>
                            <input
                                type="date"
                                value={formData.expiry_date}
                                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                                className="w-full px-6 py-4 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white outline-none transition-all focus:ring-8 focus:ring-primary/5 font-bold"
                                required
                            />
                        </div>
                    </div>

                    {/* Price Input & Display */}
                    <div className="group">
                        <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em] mb-3 ml-4 block group-focus-within:text-primary transition-colors flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            {t('common.price') || 'Price'}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 outline-none transition-all focus:ring-8 focus:ring-primary/5 font-black text-2xl premium-gradient-text"
                                required
                            />
                            <div className="absolute right-8 top-1/2 -translate-y-1/2 text-white/20 text-sm font-black uppercase tracking-widest pointer-events-none">
                                EGP
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-5 rounded-[2rem] border border-white/10 bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-widest text-sm transition-all hover:scale-105 active:scale-95"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white px-8 py-5 rounded-[2rem] shadow-premium shadow-primary/20 transition-all hover:scale-105 active:scale-95 font-black uppercase tracking-widest text-sm disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden group"
                        >
                            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                            <span className="relative z-10">
                                {loading ? t('common.saving') : t('common.save')}
                            </span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
