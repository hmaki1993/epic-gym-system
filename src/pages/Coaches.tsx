import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Filter, Mail, Phone, MapPin, Medal, DollarSign, Clock, Edit, Trash2, X } from 'lucide-react';
import AddCoachForm from '../components/AddCoachForm';
import ConfirmModal from '../components/ConfirmModal';
import ManualAttendanceModal from '../components/ManualAttendanceModal';
import Payroll from '../components/Payroll';
import { useTranslation } from 'react-i18next';
import { useCoaches } from '../hooks/useData';
import toast from 'react-hot-toast';
import { useCurrency } from '../context/CurrencyContext';
import { useOutletContext } from 'react-router-dom';

interface Coach {
    id: string;
    profile_id?: string;
    full_name: string;
    email?: string;
    specialty: string;
    pt_rate: number;
    avatar_url?: string;
    image_pos_x?: number;
    image_pos_y?: number;
    role?: string;
    profiles?: { role: string };
    admin_only_info?: boolean; // Type hint
}

export default function Coaches() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const { data: coachesData, isLoading: loading, refetch } = useCoaches();

    // Filter coaches based on current user role
    const coaches = (coachesData || []).filter(coach => {
        if (role === 'head_coach') {
            const cRole = coach.role || (coach as any).profiles?.role;
            const normalizedRole = cRole?.toLowerCase().trim();
            return normalizedRole !== 'reception' && normalizedRole !== 'receptionist' && normalizedRole !== 'cleaner';
        }
        return true;
    });

    const [editingCoach, setEditingCoach] = useState<Coach | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Attendance Modal State
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [selectedCoachForAttendance, setSelectedCoachForAttendance] = useState<Coach | null>(null);
    const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
    const [loadingAttendance, setLoadingAttendance] = useState(false);

    // Manual Attendance (Cleaner)
    const [showManualAttendance, setShowManualAttendance] = useState(false);
    const [selectedCoachForManual, setSelectedCoachForManual] = useState<Coach | null>(null);

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

        const coach = coaches.find(c => c.id === coachToDelete);

        // Robust ID resolution:
        // Prioritize profile_id as it's the direct link to auth.users
        const profileId = coach?.profile_id || (coach as any).profiles?.id || coach?.id;

        const deleteToast = toast.loading(t('common.deleting', 'Processing deletion...'));
        console.log('🛡️ Protection: Starting deletion for coach:', { coachId: coachToDelete, profileId });

        try {
            // 1. Attempt to delete Auth User via Edge Function (The Master Key)
            if (profileId) {
                console.log('🛡️ Protection: Invoking Auth cleanup for:', profileId);
                const { error: funcError } = await supabase.functions.invoke('staff-management', {
                    method: 'DELETE',
                    body: { userId: profileId }
                });

                if (funcError) {
                    console.warn('🛡️ Protection: Edge Function sync warning:', funcError);
                }
            }

            // 2. Delete from Database (coaches table)
            console.log('🛡️ Protection: Deleting coach record:', coachToDelete);
            const { error: coachDeleteError } = await supabase.from('coaches').delete().eq('id', coachToDelete);
            if (coachDeleteError) throw coachDeleteError;

            // 3. 🛡️ CRITICAL: Delete from profiles table to trigger the Security Lock
            if (profileId) {
                console.log('🛡️ Protection: Deleting profile record to lock out user:', profileId);
                const { error: profileDeleteError } = await supabase.from('profiles').delete().eq('id', profileId);

                if (profileDeleteError) {
                    console.warn('🛡️ Protection: Profile delete error:', profileDeleteError);
                } else {
                    console.log('🛡️ Protection: Profile deleted successfully.');
                }
            }

            toast.success(t('common.deleteSuccess', 'Staff member deleted and locked out successfully'), { id: deleteToast });
            refetch();
        } catch (error: any) {
            console.error('🛡️ Protection: Deletion sequence failed:', error);
            toast.error(t('common.deleteError', `Deletion failed: ${error.message || 'Unknown error'}`), { id: deleteToast });
        } finally {
            setShowDeleteModal(false);
            setCoachToDelete(null);
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
                {role?.toLowerCase().trim() === 'admin' && (
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
                )}
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
                                {(['admin', 'reception', 'receptionist'].includes(role?.toLowerCase().trim() || '')) && (
                                    <button
                                        onClick={() => {
                                            setSelectedCoachForAttendance(coach);
                                            setShowAttendanceModal(true);
                                            fetchAttendance(coach.id);
                                        }}
                                        className="p-3 bg-white/5 text-white/40 hover:text-primary hover:bg-primary/10 rounded-xl transition-all"
                                        title={t('coaches.viewAttendance')}
                                    >
                                        <Clock className="w-4 h-4" />
                                    </button>
                                )}
                                {coach.role?.toLowerCase() === 'cleaner' && (
                                    <button
                                        onClick={() => {
                                            setSelectedCoachForManual(coach);
                                            setShowManualAttendance(true);
                                        }}
                                        className="p-3 bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-xl transition-all"
                                        title={t('coaches.markAttendance')} // Ensure translation key exists or fallback
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                )}
                                {role?.toLowerCase().trim() === 'admin' && (
                                    <>
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
                                    </>
                                )}
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

                            {/* Header Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{coach.full_name}</h3>
                                    {(coach as any).attendance_status && (
                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.15em] border ${(coach as any).attendance_status === 'working' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_20px_rgba(52,211,153,0.2)]' :
                                            (coach as any).attendance_status === 'done' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                                'bg-white/5 text-white/40 border-white/10'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${(coach as any).attendance_status === 'working' ? 'bg-emerald-400 animate-pulse' : (coach as any).attendance_status === 'done' ? 'bg-blue-400' : 'bg-white/20'}`}></span>
                                            {(coach as any).attendance_status === 'working' ? t('coaches.live') :
                                                (coach as any).attendance_status === 'done' ? t('coaches.completed') :
                                                    t('coaches.away')}
                                        </span>
                                    )}
                                </div>

                                {(coach as any).daily_total_seconds > 0 && (
                                    <div className="text-[10px] font-black text-white/30 uppercase tracking-widest font-mono">
                                        {Math.floor((coach as any).daily_total_seconds / 3600)}h {Math.floor(((coach as any).daily_total_seconds % 3600) / 60)}m {t('coaches.worked')}
                                    </div>
                                )}
                            </div>
                            {/* Role and Specialty */}
                            <div className="flex items-center gap-3 mt-3">
                                {!['reception', 'receptionist', 'cleaner'].includes(coach.role?.toLowerCase()) && (
                                    <div className="flex items-center text-white/40 font-bold uppercase tracking-wider text-[10px]">
                                        <Medal className="w-3.5 h-3.5 mr-1.5 text-primary/60" />
                                        <span>{coach.specialty}</span>
                                    </div>
                                )}
                                {coach.role && (
                                    <div className="bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 group-hover:bg-white/10 transition-colors whitespace-nowrap">
                                        <span className="text-white font-black uppercase tracking-[0.2em] text-[9px]">{t(`roles.${coach.role}`)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Shift Time Display */}
                            {(coach as any).check_in_time && (
                                <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5 group-hover:border-primary/20 transition-all">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-primary/20 rounded-lg text-primary">
                                            <Clock className="w-3.5 h-3.5" />
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-[8px] font-black text-white/20 uppercase tracking-widest">{t('coaches.shiftTime')}</p>
                                            <p className="text-xs font-black text-white/70 font-mono tracking-tight">
                                                {new Date((coach as any).check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {(coach as any).check_out_time && ` - ${new Date((coach as any).check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )
                            }

                            {/* PT Stats Section */}
                            {
                                !['reception', 'cleaner'].includes(coach.role) && (
                                    <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                                        {role?.toLowerCase().trim() === 'admin' && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{t('coaches.ptRate')}:</span>
                                                <span className="text-sm font-black text-primary">{coach.pt_rate} <span className="text-[9px] opacity-40">{currency.code}/{t('common.hour')}</span></span>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between">
                                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">{t('coaches.sessions')}:</span>
                                            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-black">
                                                {(coach as any).pt_sessions_today || 0} 💪
                                            </span>
                                        </div>
                                        {(coach as any).pt_student_name && (
                                            <div className="flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white/20">{t('coaches.activePlayer')}:</span>
                                                <span className="text-xs font-bold text-white italic truncate ml-4">
                                                    {(coach as any).pt_student_name}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                )
                            }
                        </div>
                    );
                })}
            </div>


            {
                role?.toLowerCase().trim() === 'admin' && (
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
                )
            }

            {/* Add/Edit Modal */}
            {
                showAddModal && (
                    <AddCoachForm
                        initialData={editingCoach ? {
                            ...editingCoach,
                            role: editingCoach.profiles?.role || 'coach'
                        } : null}
                        onClose={() => {
                            setShowAddModal(false);
                            setEditingCoach(null);
                        }}
                        onSuccess={refetch}
                    />
                )
            }

            {/* Attendance Modal */}
            {
                showAttendanceModal && selectedCoachForAttendance && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl animate-in fade-in duration-300">
                        <div className="glass-card rounded-[3rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-white/20 overflow-hidden">
                            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/5">
                                <div>
                                    <h2 className="text-3xl font-black text-white uppercase tracking-tight">{selectedCoachForAttendance.full_name}</h2>
                                    <p className="text-primary text-xs font-black uppercase tracking-[0.2em] mt-1">{t('coaches.attendanceHistory')}</p>
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
                                                {selectedCoachForAttendance.role !== 'cleaner' && <th className="px-6 py-4">{t('coaches.checkOut')}</th>}
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
                                                        <td className="px-6 py-6 font-black font-mono text-sm text-white/50">
                                                            {log.status === 'absent' ? <span className="text-rose-400">ABSENT</span> : start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        {selectedCoachForAttendance.role !== 'cleaner' && (
                                                            <td className="px-6 py-6 font-black font-mono text-sm text-white/50">{end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                                        )}
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
                )
            }

            {/* Confirm Delete Modal */}
            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title={t('common.deleteConfirmTitle', 'Delete Coach')}
                message={t('common.deleteConfirm', 'Are you sure to delete this coach? This action cannot be undone.')}
            />

            {showManualAttendance && selectedCoachForManual && (
                <ManualAttendanceModal
                    coach={selectedCoachForManual}
                    onClose={() => setShowManualAttendance(false)}
                    onSuccess={() => {
                        refetch();
                        toast.success(t('common.saved'));
                    }}
                />
            )}
        </div >
    );
}

