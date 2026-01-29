import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, Calendar, Trash2 } from 'lucide-react';

interface Coach {
    id: string;
    full_name: string;
}

interface Session {
    id?: string;
    title: string;
    coach_id: string;
    day_of_week: string;
    start_time: string;
    end_time: string;
    capacity: number;
}

interface AddSessionFormProps {
    onClose: () => void;
    onSuccess: () => void;
    initialData?: Session | null;
}

export default function AddSessionForm({ onClose, onSuccess, initialData }: AddSessionFormProps) {
    const [loading, setLoading] = useState(false);
    const [coaches, setCoaches] = useState<Coach[]>([]);

    const [formData, setFormData] = useState({
        title: '',
        coach_id: '',
        day_of_week: 'Sunday',
        start_time: '16:00',
        end_time: '17:00',
        capacity: 20
    });

    const daysOfWeek = ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

    useEffect(() => {
        const fetchCoaches = async () => {
            const { data } = await supabase.from('coaches').select('id, full_name');
            if (data) setCoaches(data);
        };
        fetchCoaches();

        if (initialData) {
            setFormData({
                title: initialData.title,
                coach_id: initialData.coach_id,
                day_of_week: initialData.day_of_week,
                start_time: initialData.start_time,
                end_time: initialData.end_time,
                capacity: initialData.capacity
            });
        }
    }, [initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (initialData?.id) {
                // Update
                const { error } = await supabase
                    .from('training_sessions')
                    .update({
                        title: formData.title,
                        coach_id: formData.coach_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        capacity: formData.capacity
                    })
                    .eq('id', initialData.id);
                if (error) throw error;
            } else {
                // Insert
                const { error } = await supabase.from('training_sessions').insert([
                    {
                        title: formData.title,
                        coach_id: formData.coach_id,
                        day_of_week: formData.day_of_week,
                        start_time: formData.start_time,
                        end_time: formData.end_time,
                        capacity: formData.capacity
                    }
                ]);
                if (error) throw error;
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error saving session:', error);
            alert('Error saving session: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this class?')) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('training_sessions').delete().eq('id', initialData?.id);
            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error: any) {
            alert('Error deleting: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-secondary px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Calendar className="w-5 h-5" />
                        {initialData ? 'Edit Class' : 'Add New Class'}
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Class Title</label>
                        <input
                            required
                            placeholder="e.g. Gymnastics Level 1"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Coach</label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.coach_id}
                                onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                            >
                                <option value="">Select Coach</option>
                                {coaches.map(c => (
                                    <option key={c.id} value={c.id}>{c.full_name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Day</label>
                            <select
                                required
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.day_of_week}
                                onChange={e => setFormData({ ...formData, day_of_week: e.target.value })}
                            >
                                {daysOfWeek.map(day => (
                                    <option key={day} value={day}>{day}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Start Time</label>
                            <input
                                required
                                type="time"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.start_time}
                                onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">End Time</label>
                            <input
                                required
                                type="time"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.end_time}
                                onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Capacity</label>
                        <input
                            required
                            type="number"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.capacity}
                            onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        />
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        {initialData ? (
                            <button
                                type="button"
                                onClick={handleDelete}
                                className="px-4 py-2 text-red-500 font-medium hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Trash2 className="w-5 h-5" />
                                Delete
                            </button>
                        ) : (
                            <div></div> // Spacer
                        )}
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-6 py-2 bg-primary text-white font-medium rounded-lg shadow-lg shadow-primary/30 hover:bg-primary/90 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                            >
                                {loading ? 'Processing...' : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        Save Class
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
