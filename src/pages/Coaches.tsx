import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Mail, Phone, MapPin, Medal, DollarSign, Clock } from 'lucide-react';
import AddCoachForm from '../components/AddCoachForm';
import ConfirmModal from '../components/ConfirmModal';
import Payroll from '../components/Payroll';
import { useTranslation } from 'react-i18next';
import { useCoaches } from '../hooks/useData';
import toast from 'react-hot-toast';

interface Coach {
    id: string;
    full_name: string;
    specialty: string;
    pt_rate: number;
    avatar_url?: string;
    image_pos_x?: number;
    image_pos_y?: number;
}

export default function Coaches() {
    const { t } = useTranslation();
    const { data: coachesData, isLoading: loading, refetch } = useCoaches();
    const coaches = coachesData || [];

    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Attendance Modal State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedCoachForAttendance, setSelectedCoachForAttendance] = useState<Coach | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [coachToDelete, setCoachToDelete] = useState<string | null>(null);

    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const fetchAttendance = async (coachId: string) => {
        setLoadingAttendance(true);
        try {
            const { data, error } = await supabase
                .from('coach_attendance')
                .select('*')
                .eq('coach_id', coachId)
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setAttendanceLogs(data || []);
        } catch (error) {
            console.error('Error fetching attendance:', error);
            toast.error(t('common.error'));
        } finally {
            setLoadingAttendance(false);
        }
    };

    const confirmDelete = (id: string) => {
        setCoachToDelete(id);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!coachToDelete) return;

        const { error } = await supabase.from('coaches').delete().eq('id', coachToDelete);
        if (error) {
            console.error('Error deleting:', error);
            toast.error(t('common.deleteError'));
        } else {
            toast.success(t('common.deleteSuccess', 'Coach deleted successfully'));
            refetch();
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-secondary">{t('coaches.title')}</h1>
                    <p className="text-gray-500 mt-1">{t('coaches.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCoach(null);
                        setShowAddModal(true);
                    }}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105"
                >
                    <Plus className="w-5 h-5" />
                    <span className="font-semibold">{t('dashboard.addCoach')}</span>
                </button>
            </div>

            {/* Coach List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500 col-span-full text-center py-10">{t('common.loading')}</p>
                ) : coaches.map(coach => {
                    return (
                        <div key={coach.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative">
                            {/* Edit/Delete Actions */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <button
                                    onClick={() => {
                                        setSelectedCoachForAttendance(coach);
                                        setShowAttendanceModal(true);
                                        fetchAttendance(coach.id);
                                    }}
                                    className="text-gray-400 hover:text-primary transition-colors p-1"
                                    title="View Attendance"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingCoach(coach);
                                        setShowAddModal(true);
                                    }}
                                    className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></svg>
                                </button>
                                <button
                                    onClick={() => confirmDelete(coach.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-4">
                                {coach.avatar_url ? (
                                    <img
                                        src={coach.avatar_url}
                                        alt={coach.full_name}
                                        className="w-12 h-12 rounded-full object-cover border-2 border-primary/20"
                                        style={{ objectPosition: `${coach.image_pos_x ?? 50}% ${coach.image_pos_y ?? 50}%` }}
                                    />
                                ) : (
                                    <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-secondary">
                                        <Medal className="w-6 h-6" />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-bold text-gray-900">{coach.full_name}</h3>
                                {(coach as any).attendance_status && (
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${(coach as any).attendance_status === 'working' ? 'bg-green-100 text-green-700' :
                                        (coach as any).attendance_status === 'done' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-500'
                                        }`}>
                                        {(coach as any).attendance_status === 'working' ? t('coaches.workingNow') :
                                            (coach as any).attendance_status === 'done' ? t('coaches.done') :
                                                t('coaches.away')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center text-gray-700">
                                <Medal className="w-4 h-4 mr-2 opacity-100 text-primary" />
                                <span className="text-sm font-medium">{coach.specialty}</span>
                            </div>

                            {/* Today's Times */}
                            {(coach as any).check_in_time && (
                                <div className="mt-2 text-[10px] flex items-center gap-2 text-gray-500 font-mono">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                        {new Date((coach as any).check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {(coach as any).check_out_time && ` - ${new Date((coach as any).check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </span>
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-50 space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 font-medium">PT Rate:</span>
                                    <span className="font-bold text-primary">{coach.pt_rate} EGP/hr</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-gray-600 font-medium">PT Sessions Today:</span>
                                    <span className="font-bold text-green-600">
                                        {(coach as any).pt_sessions_today || 0} 💪
                                    </span>
                                </div>
                                {(coach as any).pt_student_name && (
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-gray-400">Student:</span>
                                        <span className="font-medium text-gray-500 italic">
                                            {(coach as any).pt_student_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Payroll Section */}
            <Payroll
                refreshTrigger={refreshTrigger}
                onViewAttendance={(coachId: string) => {
                    const coach = coaches.find(c => c.id === coachId);
                    if (coach) {
                        setSelectedCoachForAttendance(coach);
                        setShowAttendanceModal(true);
                        fetchAttendance(coachId);
                    }
                }}
            />

            {/* Add/Edit Modal */}
            {showAddModal && (
                <AddCoachForm
                    initialData={editingCoach}
                    onClose={() => {
                        setShowAddModal(false);
                        setEditingCoach(null);
                    }}
                    onSuccess={refetch}
                />
            )}

            {/* Attendance Modal */}
            {showAttendanceModal && selectedCoachForAttendance && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <div>
                                <h2 className="text-xl font-bold">{selectedCoachForAttendance.full_name}</h2>
                                <p className="text-gray-500 text-sm">Attendance History</p>
                            </div>
                            <button onClick={() => setShowAttendanceModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6">
                            {loadingAttendance ? (
                                <div className="text-center py-8 text-gray-400">{t('common.loading')}</div>
                            ) : attendanceLogs.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">{t('common.noResults')}</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 rounded-l-lg">{t('common.date')}</th>
                                            <th className="px-4 py-3">{t('coaches.checkIn')}</th>
                                            <th className="px-4 py-3">{t('coaches.checkOut')}</th>
                                            <th className="px-4 py-3 rounded-r-lg">{t('coaches.duration')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {attendanceLogs.map((log: any) => {
                                            const start = new Date(log.check_in_time);
                                            const end = log.check_out_time ? new Date(log.check_out_time) : null;
                                            const duration = end ? ((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2) + ' hrs' : '-';

                                            return (
                                                <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-900">{log.date}</td>
                                                    <td className="px-4 py-3 font-mono text-gray-500">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-4 py-3 font-mono text-gray-500">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                    <td className={`px-4 py-3 font-bold ${end ? 'text-green-600' : 'text-orange-400'}`}>
                                                        {duration}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t('common.deleteConfirmTitle', 'Delete Coach')}
                message={t('common.deleteConfirm', 'Are you sure to delete this coach? This action cannot be undone.')}
            />
        </div>
    );
}

