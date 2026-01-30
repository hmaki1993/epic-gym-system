import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { X, Save, DollarSign } from 'lucide-react';

interface Student {
    id: number;
    full_name: string;
}

interface AddPaymentFormProps {
    onClose: () => void;
    onSuccess: () => void;
}

export default function AddPaymentForm({ onClose, onSuccess }: AddPaymentFormProps) {
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<Student[]>([]);

    const [formData, setFormData] = useState({
        student_id: '',
        amount: '',
        payment_method: 'cash',
        notes: '',
        date: new Date().toISOString().slice(0, 10)
    });

    useEffect(() => {
        const fetchStudents = async () => {
            const { data } = await supabase.from('students').select('id, full_name');
            if (data) setStudents(data);
        };
        fetchStudents();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.from('payments').insert([
                {
                    student_id: parseInt(formData.student_id),
                    amount: parseFloat(formData.amount),
                    payment_method: formData.payment_method,
                    payment_date: formData.date,
                    notes: formData.notes
                }
            ]);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error adding payment:', error);
            alert('Error adding payment: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                <div className="bg-secondary px-6 py-4 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5" />
                        Record Payment
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Student</label>
                        <select
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                            value={formData.student_id}
                            onChange={e => setFormData({ ...formData, student_id: e.target.value })}
                        >
                            <option value="">Select Student</option>
                            {students.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Amount (EGP)</label>
                            <input
                                required
                                type="number"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Date</label>
                            <input
                                required
                                type="date"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Payment Method</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {['cash', 'bank_transfer', 'card'].map(method => (
                                <button
                                    key={method}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, payment_method: method })}
                                    className={`py-2 px-2 text-sm rounded-lg border capitalized ${formData.payment_method === method
                                        ? 'bg-primary text-white border-primary'
                                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                                        }`}
                                >
                                    {method.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-sm font-medium text-gray-700">Notes</label>
                        <textarea
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all h-20 resize-none"
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                        ></textarea>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
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
                                    Save Payment
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
