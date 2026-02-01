import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { X, RefreshCw, Calendar, DollarSign, User } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useCurrency } from '../context/CurrencyContext';

interface RenewPTSubscriptionFormProps {
    subscription: any;
    onClose: () => void;
    onSuccess: () => void;
}

export default function RenewPTSubscriptionForm({ subscription, onClose, onSuccess }: RenewPTSubscriptionFormProps) {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        sessions_to_add: 0,
        renewal_price: 0,
        expiry_date: subscription.expiry_date || format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.sessions_to_add <= 0) {
            toast.error('Please add at least 1 session');
            return;
        }

        setLoading(true);
        const loadingToast = toast.loading('Renewing subscription...');

        try {
            // 1. Update PT Subscription
            const newTotalCount = subscription.sessions_total + formData.sessions_to_add;
            const newRemainingCount = subscription.sessions_remaining + formData.sessions_to_add;
            const newTotalPrice = (Number(subscription.total_price) || 0) + formData.renewal_price;

            const { error: subError } = await supabase
                .from('pt_subscriptions')
                .update({
                    sessions_total: newTotalCount,
                    sessions_remaining: newRemainingCount,
                    total_price: newTotalPrice,
                    expiry_date: formData.expiry_date,
                    status: 'active',
                    updated_at: new Date().toISOString()
                })
                .eq('id', subscription.id);

            if (subError) throw subError;

            // 2. Record Payment
            const { error: paymentError } = await supabase
                .from('payments')
                .insert({
                    student_id: subscription.student_id,
                    amount: formData.renewal_price,
                    payment_date: new Date().toISOString(),
                    payment_method: 'cash',
                    notes: `PT Renewal - ${formData.sessions_to_add} sessions for ${subscription.students?.full_name || subscription.student_name}`
                });

            if (paymentError) throw paymentError;

            // 3. Refresh data
            queryClient.invalidateQueries({ queryKey: ['pt_subscriptions'] });
            queryClient.invalidateQueries({ queryKey: ['payments'] });

            toast.success('Subscription renewed successfully!', { id: loadingToast });
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error renewing PT subscription:', error);
            toast.error(error.message || 'Failed to renew subscription', { id: loadingToast });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-[100] flex items-center justify-center p-4 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="glass-card rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border border-white/20">
                {/* Header */}
                <div className="px-8 py-6 flex items-center justify-between border-b border-white/5 bg-gradient-to-r from-accent/20 to-primary/20">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <div className="p-2 bg-accent/20 rounded-xl text-accent">
                                <RefreshCw className="w-6 h-6" />
                            </div>
                            Renew PT
                        </h2>
                        <p className="text-sm text-white/60 mt-1 font-bold">{subscription.students?.full_name || subscription.student_name}</p>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    {/* Coach Display (Read-only) */}
                    <div className="space-y-2 opacity-60">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Current Coach</label>
                        <div className="flex items-center gap-3 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl">
                            <User className="w-4 h-4 text-accent" />
                            <span className="text-sm font-bold text-white">{subscription.coaches?.full_name || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Sessions to Add */}
                    <div className="space-y-2 text-center">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 block">New Sessions to Add</label>
                        <div className="flex items-center justify-center gap-6">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, sessions_to_add: Math.max(0, prev.sessions_to_add - 1) }))}
                                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all text-2xl font-black"
                            >-</button>
                            <input
                                required
                                type="number"
                                className="w-24 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-black text-primary outline-none focus:ring-4 focus:ring-primary/20 appearance-none"
                                value={formData.sessions_to_add}
                                onChange={e => setFormData({ ...formData, sessions_to_add: parseInt(e.target.value) || 0 })}
                            />
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, sessions_to_add: prev.sessions_to_add + 1 }))}
                                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-white/5 transition-all text-2xl font-black"
                            >+</button>
                        </div>
                    </div>

                    {/* Renewal Price */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                            <DollarSign className="w-3 h-3" />
                            Price for Added Sessions
                        </label>
                        <div className="relative">
                            <input
                                required
                                type="number"
                                className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none transition-all text-white font-black"
                                value={formData.renewal_price}
                                onChange={e => setFormData({ ...formData, renewal_price: parseFloat(e.target.value) || 0 })}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-white/20 uppercase tracking-widest">{currency.code}</div>
                        </div>
                    </div>

                    {/* New Expiry Date */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                            <Calendar className="w-3 h-3" />
                            New Expiry Date
                        </label>
                        <input
                            required
                            type="date"
                            className="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-2xl focus:ring-4 focus:ring-accent/20 focus:border-accent outline-none transition-all text-white font-black"
                            value={formData.expiry_date}
                            onChange={e => setFormData({ ...formData, expiry_date: e.target.value })}
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/40 hover:text-white transition-all bg-white/5 hover:bg-white/10 rounded-2xl"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || formData.sessions_to_add <= 0}
                            className="flex-[2] px-10 py-4 bg-gradient-to-r from-accent to-accent/80 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-accent/30 hover:shadow-accent/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group/btn"
                        >
                            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                            {loading ? 'Processing...' : 'Complete Renewal'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
