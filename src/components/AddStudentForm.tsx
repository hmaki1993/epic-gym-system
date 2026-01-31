import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, UserPlus, Upload, ChevronDown } from 'lucide-react';
import { parseISO, addMonths, format } from 'date-fns';
import toast from 'react-hot-toast';

import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionPlans, useCoaches } from '../hooks/useData';

interface AddStudentFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: any;
}

export default function AddStudentForm({ onClose, onSuccess, initialData }: AddStudentFormProps) {
    const { t, i18n } = useTranslation();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);
    const { data: plansData, isLoading: isLoadingPlans } = useSubscriptionPlans();
    const plans = plansData || [];

    const [formData, setFormData] = useState({
        full_name: initialData?.full_name || '',
        birth_date: initialData?.birth_date || '',
        contact_number: initialData?.contact_number || '',
        parent_contact: initialData?.parent_contact || '',
        subscription_type: initialData?.subscription_type || '', // Initialize empty, will be set by effect
        subscription_start: format(new Date(), 'yyyy-MM-dd'),
        subscription_expiry: initialData?.subscription_expiry || '', // Manual expiry date
        training_days: initialData?.training_days || [],
        training_schedule: initialData?.training_schedule || [],
        coach_id: initialData?.coach_id || '',
        notes: initialData?.notes || ''
    });

    // Update subscription_type when plans are loaded
    useEffect(() => {
        if (plans.length > 0 && (!formData.subscription_type || formData.subscription_type === '') && !initialData) {
            setFormData(prev => ({ ...prev, subscription_type: plans[0].id }));
        }
    }, [plans, initialData]);


    // Auto-calculate expiry date when plan or start date changes
    useEffect(() => {
        if (formData.subscription_start && formData.subscription_type && plans.length > 0) {
            const calculatedExpiry = calculateExpiry(formData.subscription_start, formData.subscription_type);
            // Always update to calculated expiry when plan or start date changes
            // User can manually edit after if needed
            setFormData(prev => ({ ...prev, subscription_expiry: calculatedExpiry }));
        }
    }, [formData.subscription_start, formData.subscription_type, plans]);

    const { data: coaches } = useCoaches();

    const daysOfWeek = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isAlreadyActive = prev.training_days.includes(day);
            if (isAlreadyActive) {
                return {
                    ...prev,
                    training_days: prev.training_days.filter((d: string) => d !== day),
                    training_schedule: prev.training_schedule.filter((s: any) => s.day !== day)
                };
            } else {
                return {
                    ...prev,
                    training_days: [...prev.training_days, day],
                    training_schedule: [...prev.training_schedule, { day, start: '16:00', end: '18:00' }]
                };
            }
        });
    };

    const updateTime = (day: string, type: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            training_schedule: prev.training_schedule.map((s: any) =>
                s.day === day ? { ...s, [type]: value } : s
            )
        }));
    };

    const calculateAge = (birthDate: string) => {
        if (!birthDate) return 0;
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return age;
    };

    // Theme-aware styles
    const inputStyle = {
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    const calculateExpiry = (start: string, planId: string) => {
        const date = parseISO(start);
        const plan = plans.find(p => p.id === planId) || plans[0];
        const monthsToAdd = plan.duration_months;
        return format(addMonths(date, monthsToAdd), 'yyyy-MM-dd');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // Use manual expiry date from form (already calculated by useEffect or manually edited)
            // Ensure we don't send empty string - fallback to calculated expiry
            const expiry = (formData.subscription_expiry && formData.subscription_expiry.trim() !== '')
                ? formData.subscription_expiry
                : calculateExpiry(formData.subscription_start, formData.subscription_type);

            // 1. Determine Group (Auto-Grouping Logic)
            let trainingGroupId = null;
            if (formData.coach_id && formData.training_schedule.length > 0) {
                // Generate Schedule Key: "day:start:end|day:start:end" (sorted)
                const scheduleKey = formData.training_schedule
                    .map((s: any) => `${s.day}:${s.start}:${s.end}`)
                    .sort()
                    .join('|');

                // Generate Group Name: "Sat/Mon 4PM"
                // Generate Group Name: "Sat/Mon 4PM"
                const days = formData.training_days.map((d: string) => {
                    const translated = t(`days.${d}`);
                    // If translation returns the key (e.g. days.saturday) or is undefined, fallback to capitalization
                    return (translated && !translated.startsWith('days.')) ? translated.substring(0, 3) : d.substring(0, 3).toUpperCase();
                }).join('/');
                const time = formData.training_schedule[0]?.start ? format(parseISO(`2000-01-01T${formData.training_schedule[0].start}`), 'h a') : '';
                const groupName = `${days} ${time}`;

                // Check if group exists
                const { data: existingGroup } = await supabase
                    .from('training_groups')
                    .select('id')
                    .eq('coach_id', formData.coach_id)
                    .eq('schedule_key', scheduleKey)
                    .maybeSingle();

                if (existingGroup) {
                    trainingGroupId = existingGroup.id;
                } else {
                    // Create new group
                    const { data: newGroup, error: groupError } = await supabase
                        .from('training_groups')
                        .insert({
                            coach_id: formData.coach_id,
                            name: groupName,
                            schedule_key: scheduleKey
                        })
                        .select()
                        .single();

                    if (groupError) throw groupError;
                    trainingGroupId = newGroup.id;
                }
            }

            const studentData = {
                full_name: formData.full_name,
                birth_date: formData.birth_date,
                age: calculateAge(formData.birth_date),
                contact_number: formData.contact_number,
                parent_contact: formData.parent_contact,
                subscription_expiry: expiry,
                training_days: formData.training_days,
                training_schedule: formData.training_schedule,
                coach_id: formData.coach_id && formData.coach_id.trim() !== '' ? formData.coach_id : null,
                subscription_plan_id: formData.subscription_type && formData.subscription_type.trim() !== '' ? formData.subscription_type : null,
                notes: formData.notes,
                training_group_id: trainingGroupId || null // Assign to Training Group
            };

            let error;
            let studentId = initialData?.id;

            if (initialData) {
                // Update existing student
                ({ error } = await supabase
                    .from('students')
                    .update(studentData)
                    .eq('id', initialData.id));
            } else {
                // Insert new student and get the ID
                const { data, error: insertError } = await supabase
                    .from('students')
                    .insert([studentData])
                    .select('id')
                    .single();
                error = insertError;
                studentId = data?.id;

                // Record initial payment for new student
                if (studentId && formData.subscription_type) {
                    const selectedPlan = plans.find(p => p.id === formData.subscription_type);
                    if (selectedPlan) {
                        await supabase.from('payments').insert({
                            student_id: studentId,
                            amount: selectedPlan.price,
                            payment_date: formData.subscription_start || new Date().toISOString(),
                            payment_method: 'cash', // Default to cash
                            notes: `New Registration - ${selectedPlan.name}`
                        });
                    }
                }
            }

            if (error) throw error;

            // Handle training schedule and auto-create training sessions
            if (studentId && formData.training_schedule.length > 0) {
                // First, clear existing schedule for updates, or just insert for new students
                if (initialData) {
                    await supabase.from('student_training_schedule').delete().eq('student_id', studentId);
                }

                const trainingInserts = formData.training_schedule.map((s: any) => ({
                    student_id: studentId,
                    day_of_week: s.day,
                    start_time: s.start,
                    end_time: s.end
                }));

                const { error: trainingError } = await supabase
                    .from('student_training_schedule')
                    .insert(trainingInserts);

                if (trainingError) throw trainingError;

                // --- AUTO-CREATE CLASS LOGIC ---
                if (formData.coach_id) {
                    const dayMapping: { [key: string]: string } = {
                        'sat': 'Saturday',
                        'sun': 'Sunday',
                        'mon': 'Monday',
                        'tue': 'Tuesday',
                        'wed': 'Wednesday',
                        'thu': 'Thursday',
                        'fri': 'Friday'
                    };

                    for (const schedule of formData.training_schedule) {
                        const { day, start, end } = schedule as { day: string, start: string, end: string };
                        const fullDayName = dayMapping[day];

                        // Check if session exists using Full Day Name
                        const { data: sessions } = await supabase
                            .from('training_sessions')
                            .select('id')
                            .eq('coach_id', formData.coach_id)
                            .eq('day_of_week', fullDayName)
                            .eq('start_time', start)
                            .eq('end_time', end)
                            .limit(1);

                        // If NOT exists, create it
                        if (!sessions || sessions.length === 0) {
                            await supabase
                                .from('training_sessions')
                                .insert([{
                                    coach_id: formData.coach_id,
                                    day_of_week: fullDayName,
                                    start_time: start,
                                    end_time: end,
                                    title: 'Group Training', // Default Title
                                    capacity: 20             // Default Capacity
                                }]);
                        }
                    }
                }
            }

            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });
            queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
            if (formData.coach_id) queryClient.invalidateQueries({ queryKey: ['training_groups'] }); // Invalidate groups too

            toast.success(initialData ? 'Gymnast updated successfully' : 'Gymnast added successfully', {
                icon: '🎉',
                style: {
                    borderRadius: '20px',
                    background: '#10B981',
                    color: '#fff',
                },
            });
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving gymnast:', error);
            const msg = (error as any).message || 'Unknown error';
            toast.error(`Error saving gymnast: ${msg}`);
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
                            {initialData ? 'Edit Gymnast' : t('dashboard.addStudent', 'Add New Gymnast')}
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
                            <div className="flex items-center justify-between ml-1">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">{t('students.birthDate', 'Birth Date')}</label>
                                {formData.birth_date && (
                                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-primary/20 text-primary rounded-md">
                                        {calculateAge(formData.birth_date)} {i18n.language === 'ar' ? 'سنة' : 'Years'}
                                    </span>
                                )}
                            </div>
                            <input
                                required
                                type="date"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20"
                                value={formData.birth_date}
                                onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
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

                    <div className="space-y-4 border-t border-white/5 pt-8">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">
                            {t('students.trainingDays', 'Training Days')}
                        </label>
                        <div className="flex flex-col gap-4">
                            <div className="flex flex-wrap gap-3">
                                {daysOfWeek.map(day => {
                                    const isActive = formData.training_days.includes(day);
                                    return (
                                        <button
                                            key={day}
                                            type="button"
                                            onClick={() => toggleDay(day)}
                                            className={`flex-1 min-w-[70px] py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all duration-300 ${isActive
                                                ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 scale-105'
                                                : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10 hover:border-white/20'
                                                }`}
                                        >
                                            {t(`students.days.${day}`)}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Time Inputs for Active Days */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                                {formData.training_schedule.map((schedule: any) => (
                                    <div
                                        key={schedule.day}
                                        className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 animate-in zoom-in-95 duration-300"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black uppercase text-primary tracking-widest">
                                                {t(`students.days.${schedule.day}`)}
                                            </span>
                                            <div className="h-px flex-1 bg-white/10 mx-4"></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-white/20 ml-1">{t('students.startTime')}</label>
                                                <input
                                                    type="time"
                                                    value={schedule.start}
                                                    onChange={(e) => updateTime(schedule.day, 'start', e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary transition-colors outline-none"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[8px] font-black uppercase text-white/20 ml-1">{t('students.endTime')}</label>
                                                <input
                                                    type="time"
                                                    value={schedule.end}
                                                    onChange={(e) => updateTime(schedule.day, 'end', e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-primary transition-colors outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
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
                                <div className="flex items-center justify-between ml-1">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40">Type</label>
                                    {plans.find(p => p.id === formData.subscription_type)?.price > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full animate-in fade-in slide-in-from-right-4 duration-500">
                                            <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]"></div>
                                            <span className="text-[10px] font-black text-primary uppercase tracking-wider">
                                                {plans.find(p => p.id === formData.subscription_type)?.price} EGP
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="relative group/subtype">
                                    <select
                                        className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white appearance-none cursor-pointer pr-12 focus:bg-white/10"
                                        value={formData.subscription_type}
                                        onChange={e => setFormData({ ...formData, subscription_type: e.target.value })}
                                    >
                                        {plans.map(plan => (
                                            <option key={plan.id} value={plan.id} className="bg-slate-900">
                                                {plan.name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none opacity-40 group-hover/subtype:opacity-100 transition-opacity">
                                        <ChevronDown className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Start Date & Expiry Date */}
                        <div className="grid grid-cols-2 gap-6 mt-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Start Date</label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                    value={formData.subscription_start}
                                    onChange={e => setFormData({ ...formData, subscription_start: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                                    Expiry Date
                                    <span className="px-2 py-0.5 bg-accent/10 text-accent text-[8px] rounded-full border border-accent/20">Editable</span>
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white"
                                    value={formData.subscription_expiry}
                                    onChange={e => setFormData({ ...formData, subscription_expiry: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2 mt-6">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('students.assignedCoach')}</label>
                            <div className="relative group/coach">
                                <select
                                    className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white appearance-none cursor-pointer pr-12 focus:bg-white/10"
                                    value={formData.coach_id}
                                    onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                                >
                                    <option value="" className="bg-slate-900">{t('students.selectCoach')}</option>
                                    {coaches?.map(coach => (
                                        <option key={coach.id} value={coach.id} className="bg-slate-900">
                                            {coach.full_name} ({t(`roles.${coach.role}`)})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-5 flex items-center pointer-events-none opacity-40 group-hover/coach:opacity-100 transition-opacity">
                                    <ChevronDown className="w-4 h-4 text-white" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">{t('common.notes', 'Notes')}</label>
                        <textarea
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none transition-all text-white placeholder:text-white/20 min-h-[100px]"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
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
