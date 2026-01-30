import { useState } from 'react';
import { Plus, TrendingUp, Calendar } from 'lucide-react';
import AddPaymentForm from '../components/AddPaymentForm';
import { format } from 'date-fns';
import { usePayments } from '../hooks/useData';

interface Payment {
    id: string;
    amount: number;
    payment_date: string;
    payment_method: string;
    notes: string;
    students: {
        full_name: string;
    }
}

export default function Finance() {
    const { data: paymentsData, isLoading: loading, refetch } = usePayments();
    const payments = (paymentsData as Payment[]) || []; // Cast to Payment[] to usage type
    const totalRevenue = payments.reduce((sum: number, p: Payment) => sum + Number(p.amount), 0);

    const [showAddModal, setShowAddModal] = useState(false);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="text-center sm:text-left">
                    <h1 className="text-2xl sm:text-3xl font-bold text-secondary">Finance Overview</h1>
                    <p className="text-gray-500 mt-1 text-sm sm:text-base">Track revenue and handle payments</p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">Record Payment</span>
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-secondary to-slate-800 rounded-2xl p-6 text-white shadow-lg">
                    <p className="text-white/60 font-medium mb-2 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Total Revenue
                    </p>
                    <h3 className="text-4xl font-bold">{totalRevenue.toLocaleString()} <span className="text-lg text-white/50 font-normal">EGP</span></h3>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <p className="text-gray-500 font-medium mb-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> This Month
                    </p>
                    <h3 className="text-2xl font-bold text-secondary">
                        {/* Simplified for now, just same as total or calculation placeholder */}
                        {totalRevenue.toLocaleString()}
                    </h3>
                </div>
            </div>

            {/* Recent Transactions List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-gray-900 text-lg">Recent Transactions</h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50/50 text-gray-600 font-medium text-sm">
                            <tr>
                                <th className="px-6 py-4">Student</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Method</th>
                                <th className="px-6 py-4">Notes</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading transactions...</td></tr>
                            ) : payments.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-12 text-center text-gray-400">No transactions recorded yet.</td></tr>
                            ) : (
                                payments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-semibold text-gray-900">
                                            {payment.students?.full_name || 'Unknown Student'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                            {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 capitalize">
                                                {payment.payment_method.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm italic">
                                            {payment.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-green-700">
                                            +{Number(payment.amount).toLocaleString()} EGP
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showAddModal && (
                <AddPaymentForm
                    onClose={() => setShowAddModal(false)}
                    onSuccess={refetch}
                />
            )}
        </div>
    );
}
