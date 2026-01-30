import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Mail, Phone, MapPin, Medal, DollarSign, Clock, Edit, Trash2, X } from 'lucide-react';
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div className="text-center sm:text-left">
                    <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">{t('coaches.title')}</h1>
                    <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">{t('coaches.subtitle')}</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCoach(null);
                        setShowAddModal(true);
                    }}
                    className="group flex items-center justify-center gap-3 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary text-white px-8 py-4 rounded-[1.5rem] shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto overflow-hidden relative"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    <Plus className="w-5 h-5 relative z-10" />
                    <span className="font-extrabold uppercase tracking-widest text-sm relative z-10">{t('dashboard.addCoach')}</span>
                </button>
            </div>

            {/* Coach List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-white/40 col-span-full text-center py-20 font-bold italic">{t('common.loading')}</p>
                ) : coaches.map(coach => {
                    return (
                        <div key={coach.id} className="glass-card rounded-[2.5rem] p-8 border border-white/10 shadow-premium group hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
                            {/* Decorative Background Glow */}
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors"></div>

                            {/* Edit/Delete Actions */}
                            <div className="absolute top-6 right-6 flex gap-2 z-10">
                                <button
                                    onClick={() => {
                                        setSelectedCoachForAttendance(coach);
                                        setShowAttendanceModal(true);
                                        fetchAttendance(coach.id);
                                    }}
                                    className="p-3 bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                    title="View Attendance"
                                >
                                    <Clock className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => {
                                        setEditingCoach(coach);
                                        setShowAddModal(true);
                                    }}
                                    className="p-3 bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-all"
                                >
                                    <Edit className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => confirmDelete(coach.id)}
                                    className="p-3 bg-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="flex items-start justify-between mb-6">
                                {coach.avatar_url ? (
                                    <div className="relative">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-25 group-hover:opacity-50 transition-all"></div>
                                        <img
                                            src={coach.avatar_url}
                                            alt={coach.full_name}
                                            className="relative w-16 h-16 rounded-3xl object-cover border-2 border-white/10"
                                            style={{ objectPosition: `${coach.image_pos_x ?? 50}% ${coach.image_pos_y ?? 50}%` }}
                                        />
                                    </div>
                                ) : (
                                    <div className="w-16 h-16 bg-primary/10 rounded-3xl flex items-center justify-center text-primary shadow-inner">
                                        <Medal className="w-8 h-8" />
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between">
                                <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{coach.full_name}</h3>
                                {(coach as any).attendance_status && (
                                    <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.15em] border ${(coach as any).attendance_status === 'working' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.1)]' :
                                        (coach as any).attendance_status === 'done' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_15px_rgba(59,130,246,0.1)]' :
                                            'bg-white/5 text-white/40 border-white/10'
                                        }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-2 ${(coach as any).attendance_status === 'working' ? 'bg-emerald-400 animate-pulse' : (coach as any).attendance_status === 'done' ? 'bg-blue-400' : 'bg-white/20'}`}></span>
                                        {(coach as any).attendance_status === 'working' ? t('coaches.workingNow') :
                                            (coach as any).attendance_status === 'done' ? t('coaches.done') :
                                                t('coaches.away')}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center text-white/60 mt-2 font-bold uppercase tracking-wider text-xs">
                                <Medal className="w-4 h-4 mr-2 text-primary" />
                                <span>{coach.specialty}</span>
                            </div>

                            {/* Today's Times */}
                            {(coach as any).check_in_time && (
                                <div className="mt-2 text-[11px] flex items-center gap-2 text-gray-900 font-bold font-mono opacity-80">
                                    <Clock className="w-3 h-3" />
                                    <span>
                                        {new Date((coach as any).check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        {(coach as any).check_out_time && ` - ${new Date((coach as any).check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                    </span>
                                </div>
                            )}

                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">PT Rate:</span>
                                    <span className="text-sm font-black text-primary">{coach.pt_rate} <span className="text-[10px] opacity-40">EGP/hr</span></span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30">Sessions:</span>
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black">
                                        {(coach as any).pt_sessions_today || 0} 💪
                                    </span>
                                </div>
                                {(coach as any).pt_student_name && (
                                    <div className="flex items-center justify-between pt-2">
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Active Player:</span>
                                        <span className="text-xs font-bold text-white italic truncate ml-4">
                                            {(coach as any).pt_student_name}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Attendance History Section Title */}
            <div className="pt-12 pb-6">
                <h2 className="text-2xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                    <span className="w-2 h-8 bg-primary rounded-full"></span>
                    Payroll Management
                </h2>
            </div>
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="glass-card rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden">
                        <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <div>
                                <h2 className="text-3xl font-black text-white uppercase tracking-tight">{selectedCoachForAttendance.full_name}</h2>
                                <p className="text-primary text-xs font-black uppercase tracking-[0.2em] mt-1">Attendance History</p>
                            </div>
                            <button onClick={() => setShowAttendanceModal(false)} className="p-4 hover:bg-white/10 rounded-2xl transition-all text-white/40 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            {loadingAttendance ? (
                                <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest animate-pulse">{t('common.loading')}</div>
                            ) : attendanceLogs.length === 0 ? (
                                <div className="text-center py-20 text-white/20 font-black uppercase tracking-widest italic">
                                    {t('common.noResults')}
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 text-white/30 font-black text-[10px] uppercase tracking-[0.2em]">
                                        <tr>
                                            <th className="px-6 py-4 rounded-l-2xl">{t('common.date')}</th>
                                            <th className="px-6 py-4">{t('coaches.checkIn')}</th>
                                            <th className="px-6 py-4">{t('coaches.checkOut')}</th>
                                            <th className="px-6 py-4 rounded-r-2xl text-right">{t('coaches.duration')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {attendanceLogs.map((log: any) => {
                                            const start = new Date(log.check_in_time);
                                            const end = log.check_out_time ? new Date(log.check_out_time) : null;
                                            const duration = end ? ((end.getTime() - start.getTime()) / 1000 / 3600).toFixed(2) + ' HR' : '-';

                                            return (
                                                <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                                                    <td className="px-6 py-6 font-bold text-white/70">{log.date}</td>
                                                    <td className="px-6 py-6 font-black font-mono text-sm text-white/50">{start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                    <td className="px-6 py-6 font-black font-mono text-sm text-white/50">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                    <td className={`px-6 py-6 font-black text-right text-sm ${end ? 'text-emerald-400' : 'text-orange-400'}`}>
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

