import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, Save, Clock, Calendar, User, Timer } from 'lucide-react';
import { useCoaches } from '../hooks/useData';
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
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        coach_id: '',
        days: [] as string[],
        startTime: '16:00', // Default 4 PM
        duration: 60 // Minutes
    });

    useEffect(() => {
        if (initialData) {
            // Parse schedule_key if available to populate days/time
            // Format: day:start:end|day:start:end
            let days = [] as string[];
            let startTime = '16:00';
            let duration = 60;

            if (initialData.schedule_key) {
                const parts = initialData.schedule_key.split('|');
                if (parts.length > 0) {
                    const firstPart = parts[0].split(':');
                    const day = firstPart[0];
                    const start = firstPart[1]; // e.g., 16:00
                    const end = firstPart[2];   // e.g., 18:00

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
        }
    }, [initialData]);

    const toggleDay = (day: string) => {
        setFormData(prev => ({
            ...prev,
            days: prev.days.includes(day)
                ? prev.days.filter(d => d !== day)
                : [...prev.days, day]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            // 1. Generate Schedule Key
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

            // 2. Prepare Payload
            const payload = {
                name: formData.name,
                coach_id: formData.coach_id,
                schedule_key: scheduleKey,
                updated_at: new Date().toISOString()
            };

            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('training_groups')
                    .update(payload)
                    .eq('id', initialData.id);
                if (error) throw error;
                toast.success('Group updated successfully');
            } else {
                // Create
                const { error } = await supabase
                    .from('training_groups')
                    .insert([payload]);
                if (error) throw error;
                toast.success('Group created successfully');
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
            <div className="w-full max-w-lg bg-[#1a1f37] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight">
                            {initialData ? 'Edit Group' : 'Create Group'}
                        </h2>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 space-y-6">
                        {/* Name */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Group Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold"
                                placeholder="e.g. Level 1"
                            />
                        </div>

                        {/* Coach */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Coach</label>
                            <div className="relative">
                                <select
                                    required
                                    value={formData.coach_id}
                                    onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                                    className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold appearance-none cursor-pointer"
                                >
                                    <option value="">Select Coach</option>
                                    {coaches?.map((coach: any) => (
                                        <option key={coach.id} value={coach.id}>
                                            {coach.full_name}
                                        </option>
                                    ))}
                                </select>
                                <User className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                            </div>
                        </div>

                        {/* Days */}
                        <div className="space-y-2">
                            <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Training Days</label>
                            <div className="flex flex-wrap gap-2">
                                {DAYS.map(day => (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => toggleDay(day)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${formData.days.includes(day)
                                            ? 'bg-primary text-white border-primary'
                                            : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {t(`days.${day}`).substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time & Duration */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Start Time</label>
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
                                <label className="text-xs font-black text-white/40 uppercase tracking-widest pl-1">Duration</label>
                                <div className="relative">
                                    <select
                                        value={formData.duration}
                                        onChange={e => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                                        className="w-full bg-[#0d1321] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-primary/50 font-bold appearance-none cursor-pointer"
                                    >
                                        <option value="60">1 Hour</option>
                                        <option value="90">1.5 Hours</option>
                                        <option value="120">2 Hours</option>
                                        <option value="150">2.5 Hours</option>
                                        <option value="180">3 Hours</option>
                                        <option value="240">4 Hours</option>
                                    </select>
                                    <Timer className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 pointer-events-none" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wide text-xs transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold uppercase tracking-wide text-xs transition-colors flex items-center gap-2 shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            <Save className="w-4 h-4" />
                            {loading ? 'Saving...' : 'Save Group'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
