import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Clock, Calendar, User, Timer, Search, Check, Users } from 'lucide-react';
import { useCoaches, useStudents } from '../hooks/useData';
import toast from 'react-hot-toast';

interface GroupFormModalProps {
    initialData?: any;
    onClose: () => void;
    onSuccess: () => void;
}

const DAYS = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

export default function GroupFormModal({ initialData, onClose, onSuccess }: GroupFormModalProps) {
    const { t } = useTranslation();
    const { data: coaches } = useCoaches();
    const { data: students } = useStudents();
    const [loading, setLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState('');
    const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

    const [formData, setFormData] = useState({
        name: '',
        coach_id: '',
        days: [] as string[],
        startTime: '16:00', // Default 4 PM
        duration: 60 // Minutes
    });

    useEffect(() => {
        if (initialData) {
            let days = [] as string[];
            let startTime = '16:00';
            let duration = 60;

            if (initialData.schedule_key) {
                const parts = initialData.schedule_key.split('|');
                if (parts.length > 0) {
                    const firstPart = parts[0].split(':');
                    const start = firstPart[1];
                    const end = firstPart[2];

                    if (start && end) {
                        try {
                            const [startH, startM] = start.split(':').map(Number);
                            const [endH, endM] = end.split(':').map(Number);
                            const startTotal = startH * 60 + startM;
                            const endTotal = endH * 60 + endM;
                            duration = endTotal - startTotal;
                        } catch (e) {
                            console.error('Error parsing time for duration:', e);
                        }
                    }

                    startTime = start || '16:00';
                    days = parts.map((p: string) => p.split(':')[0]);
                }
            }

            setFormData({
                name: initialData.name,
                coach_id: initialData.coach_id,
                days: days,
                startTime: startTime,
                duration: duration > 0 ? duration : 60
            });

            if (initialData.students) {
                setSelectedStudents(initialData.students.map((s: any) => s.id));
            } else if (students) {
                const groupStudents = students.filter((s: any) => s.training_group_id === initialData.id);
                setSelectedStudents(groupStudents.map((s: any) => s.id));
            }
        }
    }, [initialData, students]);

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const toggleStudent = (studentId: string) => {
        setSelectedStudents(prev =>
            prev.includes(studentId)
                ? prev.filter(id => id !== studentId)
                : [...prev, studentId]
        );
    };

    const filteredStudents = students?.filter((s: any) =>
        s.full_name.toLowerCase().includes(studentSearch.toLowerCase())
    ) || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const [startH, startM] = formData.startTime.split(':').map(Number);
            const totalStartMinutes = startH * 60 + startM;
            const totalEndMinutes = totalStartMinutes + parseInt(String(formData.duration));

            const endH = Math.floor(totalEndMinutes / 60);
            const endM = totalEndMinutes % 60;
            const endTime = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;

            const scheduleKey = formData.days
                .map(d => `${d}:${formData.startTime}:${endTime}`)
                .sort()
                .join('|');

            const payload = {
                name: formData.name,
                coach_id: formData.coach_id,
                schedule_key: scheduleKey,
                updated_at: new Date().toISOString()
            };

            let groupId = initialData?.id;

            if (initialData?.id) {
                const { error } = await supabase
                    .from('training_groups')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                toast.success('Group updated successfully');
            } else {
                const { data: newGroup, error } = await supabase
                    .from('training_groups')
                    .insert([payload])
                    .select()
                    .single();

                if (error) throw error;
                groupId = newGroup.id;
                toast.success('Group created successfully');
            }

            // --- NEW NOTIFICATION TRIGGER ---
            if (formData.coach_id) {
                const assignedCoach = coaches?.find((c: any) => c.id === formData.coach_id);
                if (assignedCoach?.profile_id) {
                    await supabase.from('notifications').insert({
                        title: 'New Training Group Assigned',
                        message: `You have been assigned to the training group: ${formData.name}`,
                        type: 'schedule',
                        user_id: assignedCoach.profile_id,
                        is_read: false
                    });
                }
            }

            if (groupId) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update({
                        training_group_id: groupId,
                        coach_id: formData.coach_id
                    })
                    .in('id', selectedStudents);

                if (updateError) {
                    console.error('Error updating students:', updateError);
                    toast.error('Group saved but failed to update some students');
                }

                if (initialData?.id) {
                    const previouslySelected = students?.filter((s: any) => s.training_group_id === initialData.id).map((s: any) => s.id) || [];
                    const toRemove = previouslySelected.filter(id => !selectedStudents.includes(id));

                    if (toRemove.length > 0) {
                        await supabase
                            .from('students')
                            .update({ training_group_id: null })
                            .in('id', toRemove);
                    }
                }
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error saving group:', error);
            toast.error('Failed to save group');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#1a1f37] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            {initialData ? t('common.editGroup') : t('common.createGroup')}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar grow">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">{t('common.groupName')}</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold placeholder:text-white/10"
                                        placeholder=""
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">{t('common.coach')}</label>
                                    <div className="relative">
                                        <select
                                            required
                                            value={formData.coach_id}
                                            onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                                            className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold appearance-none cursor-pointer"
                                        >
                                            <option value=""></option>
                                            {coaches?.filter((c: any) => c.role !== 'reception' && c.role !== 'cleaner').map((coach: any) => (
                                                <option key={coach.id} value={coach.id}>
                                                    {coach.full_name}
                                                </option>
                                            ))}
                                        </select>
                                        <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">{t('common.trainingDays')}</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DAYS.map(day => (
                                            <button
                                                key={day}
                                                type="button"
                                                onClick={() => toggleDay(day)}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider border transition-all ${formData.days.includes(day)
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20'
                                                    : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                                                    }`}
                                            >
                                                {t(`students.days.${day.substring(0, 3)}`)}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">{t('students.startTime')}</label>
                                        <div className="relative">
                                            <input
                                                type="time"
                                                required
                                                value={formData.startTime}
                                                onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                                className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold"
                                            />
                                            <Clock className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">{t('coaches.duration')}</label>
                                        <div className="relative">
                                            <select
                                                value={formData.duration}
                                                onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                                className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold appearance-none cursor-pointer"
                                            >
                                                <option value="60">{t('common.hour1')}</option>
                                                <option value="90">{t('common.hour1_5')}</option>
                                                <option value="120">{t('common.hour2')}</option>
                                                <option value="150">{t('common.hour2_5')}</option>
                                                <option value="180">{t('common.hour3')}</option>
                                                <option value="240">{t('common.hour4')}</option>
                                            </select>
                                            <Timer className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-l border-white/5 pl-6 flex flex-col min-h-[400px]">
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1 mb-2">
                                    {t('dashboard.addStudent')} <span className="text-primary ml-1">({selectedStudents.length})</span>
                                </label>

                                <div className="relative mb-4 group/search">
                                    <input
                                        type="text"
                                        value={studentSearch}
                                        onChange={e => setStudentSearch(e.target.value)}
                                        placeholder=""
                                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 text-sm font-bold placeholder:text-white/20 transition-all"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 group-focus-within/search:text-primary transition-colors" />
                                </div>

                                <div className="flex-1 overflow-y-auto custom-scrollbar bg-[#0d1321]/50 rounded-2xl border border-white/5 p-2 space-y-1">
                                    {filteredStudents.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-white/20 p-4 text-center">
                                            <User className="w-8 h-8 mb-2 opacity-50" />
                                            <p className="text-xs font-bold uppercase tracking-wider">{t('common.noResults')}</p>
                                        </div>
                                    ) : (
                                        filteredStudents.map((student: any) => {
                                            const isSelected = selectedStudents.includes(student.id);
                                            return (
                                                <div
                                                    key={student.id}
                                                    onClick={() => toggleStudent(student.id)}
                                                    className={`p-3 rounded-xl cursor-pointer flex items-center justify-between transition-all group ${isSelected
                                                        ? 'bg-primary/20 border border-primary/30'
                                                        : 'hover:bg-white/5 border border-transparent'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-colors ${isSelected ? 'bg-primary text-white' : 'bg-white/10 text-white/40 group-hover:bg-white/20 group-hover:text-white'}`}>
                                                            {student.full_name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <p className={`text-sm font-bold transition-colors ${isSelected ? 'text-white' : 'text-white/60 group-hover:text-white'}`}>
                                                                {student.full_name}
                                                            </p>
                                                            {student.training_groups?.name && (
                                                                <p className="text-[10px] text-white/30 uppercase tracking-wider">
                                                                    {t('common.currentGroup')}: {student.training_groups.name}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg shadow-primary/30">
                                                            <Check className="w-3 h-3 text-white" />
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wide text-xs transition-colors"
                        >
                            {t('common.cancel')}
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wide text-xs transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? t('common.saving') : t('common.saveGroup')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
