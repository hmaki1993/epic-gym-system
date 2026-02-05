import { useEffect, useState, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Filter, Mail, Phone, MapPin, Medal, DollarSign, Clock, Edit, Trash2, X, Search } from 'lucide-react';
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

interface CoachCardProps {
    coach: Coach;
    role: string | null;
    t: any;
    currency: any;
    onEdit: () => void;
    onDelete: () => void;
    onAttendance: () => void;
    onManualAttendance?: () => void;
    isPremium?: boolean;
    isCompact?: boolean;
}

const CoachCard = memo(({ coach, role, t, currency, onEdit, onDelete, onAttendance, onManualAttendance, isPremium, isCompact }: CoachCardProps) => {
    const isWorking = (coach as any).attendance_status === 'working';
    const isDone = (coach as any).attendance_status === 'done';
    const coachRole = coach.role?.toLowerCase().trim();

    return (
        <div className={`glass-card rounded-[2rem] md:rounded-[2.5rem] border transition-all duration-700 relative overflow-hidden group 
            ${isPremium
                ? 'p-6 md:p-8 border-primary/20 bg-primary/5 hover:border-primary/50 shadow-[0_20px_50px_rgba(var(--primary-rgb),0.1)]'
                : isCompact
                    ? 'p-4 md:p-6 border-white/5 bg-white/[0.01] hover:border-white/10'
                    : 'p-5 md:p-7 border-white/10 bg-white/[0.02] hover:border-white/30 shadow-premium'
            } hover:scale-[1.02] hover:-translate-y-1`}>

            {/* Background Effects & Shimmer */}
            <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[100px] transition-colors duration-700 
                ${isPremium ? 'bg-primary/20 group-hover:bg-primary/30' : 'bg-white/5 group-hover:bg-white/10'}`}></div>

            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 pointer-events-none transition-opacity duration-1000">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></div>
            </div>


            <div className={`flex flex-col items-center text-center w-full transition-all duration-500 ${isCompact ? 'space-y-4' : 'space-y-6'}`}>
                {/* Avatar Section */}
                <div className="relative shrink-0">
                    <div className={`absolute -inset-3 bg-gradient-to-tr rounded-[2.8rem] blur-[15px] opacity-10 group-hover:opacity-40 transition-all duration-700 
                        ${isPremium ? 'from-primary via-accent to-primary' : 'from-white/20 via-white/5 to-white/20'}`}></div>
                    {coach.avatar_url ? (
                        <div className="relative">
                            <img
                                src={coach.avatar_url}
                                alt={coach.full_name}
                                className={`relative rounded-[1.8rem] md:rounded-[2.2rem] object-cover border-2 border-white/10 shadow-2xl transition-all duration-700 group-hover:scale-110 group-hover:border-primary/30
                                    ${isCompact ? 'w-20 h-20 md:w-24 md:h-24' : isPremium ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32'}`}
                                style={{ objectPosition: `${coach.image_pos_x ?? 50}% ${coach.image_pos_y ?? 50}%` }}
                            />
                            {isWorking && (
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-emerald-500 border-4 border-black rounded-full animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.5)]"></div>
                            )}
                        </div>
                    ) : (
                        <div className={`relative flex items-center justify-center bg-white/5 rounded-[1.8rem] md:rounded-[2.2rem] border-2 border-white/10 text-white/20 shadow-inner group-hover:text-primary group-hover:border-primary/30 transition-all 
                            ${isCompact ? 'w-20 h-20 md:w-24 md:h-24' : isPremium ? 'w-32 h-32 md:w-40 md:h-40' : 'w-24 h-24 md:w-32 md:h-32'}`}>
                            <Medal className={isCompact ? 'w-10 h-10 md:w-12 md:h-12' : 'w-12 h-12 md:w-16 md:h-16'} />
                        </div>
                    )}
                </div>

                {/* Info Section */}
                <div className={`w-full ${isCompact ? 'space-y-1' : 'space-y-4'}`}>
                    <div className="space-y-1">
                        <div className="flex flex-col items-center gap-1">
                            <h3 className={`font-black text-white leading-tight group-hover:text-primary transition-colors 
                                ${isPremium ? 'text-2xl md:text-4xl' : isCompact ? 'text-lg md:text-xl' : 'text-xl md:text-2xl'}`}>
                                {coach.full_name}
                            </h3>
                            {isPremium && (
                                <span className="px-3 py-1 rounded-full bg-primary/20 text-primary text-[8px] font-black uppercase tracking-[0.4em] border border-primary/30 mt-1">
                                    EXECUTIVE STAFF
                                </span>
                            )}
                        </div>
                        {coach.role && (
                            <p className="font-black uppercase tracking-[0.3em]" style={{
                                color: isCompact ? 'rgba(255, 255, 255, 0.3)' : 'var(--color-brand-label)',
                                opacity: isCompact ? 1 : 0.6
                            }}>
                                {t(`roles.${coach.role}`)}
                            </p>
                        )}
                    </div>

                    {!isCompact && (
                        <div className="space-y-6 pt-2">
                            {/* Attendance Status Badge */}
                            <div className={`inline-flex items-center px-4 md:px-6 py-1.5 md:py-2 rounded-full text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] border transition-all duration-500 
                                ${isWorking ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.1)]' :
                                    isDone ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                        'bg-white/5 text-white/20 border-white/10'}`}>
                                <span className={`w-1.5 md:w-2 h-1.5 md:h-2 rounded-full mr-2 md:mr-3 ${isWorking ? 'bg-emerald-400 animate-pulse' : isDone ? 'bg-blue-400' : 'bg-white/20'}`}></span>
                                {isWorking ? t('coaches.live') : isDone ? t('coaches.completed') : t('coaches.away')}
                            </div>

                            {/* Specialty Badge */}
                            {!['reception', 'receptionist', 'cleaner'].includes(coachRole || '') && coach.specialty && (
                                <div className="flex items-center justify-center gap-3 text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] bg-white/5 w-fit mx-auto px-5 py-2 rounded-2xl border border-white/5">
                                    <Medal className="w-4 h-4" style={{ color: 'var(--color-brand-label)', opacity: 0.6 }} />
                                    <span>{coach.specialty}</span>
                                </div>
                            )}

                            {/* Stats & Shift */}
                            <div className="grid grid-cols-2 gap-3 md:gap-4 pt-2">
                                {(coach as any).daily_total_seconds > 0 && (
                                    <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5 group-hover:bg-white/10 transition-colors text-center md:text-left">
                                        <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{t('coaches.worked')}</p>
                                        <p className="text-xs md:text-sm font-black text-white font-mono tracking-tight">
                                            {Math.floor((coach as any).daily_total_seconds / 3600)}h {Math.floor(((coach as any).daily_total_seconds % 3600) / 60)}m
                                        </p>
                                    </div>
                                )}
                                {(coach as any).check_in_time && (
                                    <div className="bg-white/5 p-3 md:p-4 rounded-2xl md:rounded-3xl border border-white/5 group-hover:bg-white/10 transition-colors text-center md:text-left">
                                        <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">{t('coaches.shiftTime', 'Shift')}</p>
                                        <p className="text-xs md:text-sm font-black text-white font-mono tracking-tight">
                                            {new Date((coach as any).check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* PT Rate & Today's Sessions - only for admins and coaches */}
                            {!['reception', 'cleaner'].includes(coachRole || '') && (
                                <div className={`mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/5 flex items-center justify-between`}>
                                    {role === 'admin' && (
                                        <div className="text-left space-y-0.5 md:space-y-1">
                                            <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">{t('coaches.ptRate')}</p>
                                            <p className="text-lg md:text-xl font-black text-primary">{coach.pt_rate} <span className="text-[8px] md:text-[10px] opacity-40 uppercase tracking-tighter">{currency.code}</span></p>
                                        </div>
                                    )}
                                    <div className="text-right space-y-0.5 md:space-y-1">
                                        <p className="text-[8px] md:text-[9px] font-black text-white/20 uppercase tracking-widest">{t('coaches.sessions')}</p>
                                        <div className="flex items-center gap-2 md:gap-3 justify-end">
                                            <span className="text-2xl md:text-3xl font-black text-emerald-400 leading-none">{(coach as any).pt_sessions_today || 0}</span>
                                            <span className="text-xs md:text-sm opacity-30">💪</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Unified Action Bar - Horizontal at Bottom */}
            <div className="flex items-center justify-center gap-3 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-white/5 relative z-30">
                {(['admin', 'reception', 'receptionist'].includes(role || '')) && (
                    <button onClick={onAttendance} title={t('coaches.viewAttendance')} className="p-3 bg-white/5 text-white/40 hover:text-primary hover:bg-primary/20 rounded-xl transition-all border border-white/10 shadow-lg active:scale-95 md:scale-110 md:hover:scale-125">
                        <Clock className="w-5 h-5" />
                    </button>
                )}
                {coachRole === 'cleaner' && onManualAttendance && (
                    <button onClick={onManualAttendance} className="p-3 bg-white/5 text-white/40 hover:text-emerald-400 hover:bg-emerald-500/20 rounded-xl transition-all border border-white/10 shadow-lg active:scale-95 md:scale-110 md:hover:scale-125">
                        <Plus className="w-5 h-5" />
                    </button>
                )}
                {role === 'admin' && (
                    <>
                        <button onClick={onEdit} className="p-3 bg-white/5 text-white/40 hover:text-blue-400 hover:bg-blue-500/20 rounded-xl transition-all border border-white/10 shadow-lg active:scale-95 md:scale-110 md:hover:scale-125">
                            <Edit className="w-5 h-5" />
                        </button>
                        <button onClick={onDelete} className="p-3 bg-white/5 text-white/40 hover:text-rose-400 hover:bg-rose-500/20 rounded-xl transition-all border border-white/10 shadow-lg active:scale-95 md:scale-110 md:hover:scale-125">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </>
                )}
            </div>

            {/* Premium Corner Accent */}
            {isPremium && (
                <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 overflow-hidden pointer-events-none">
                    <div className="absolute top-[15px] md:top-[20px] right-[-35px] md:right-[-45px] w-[120px] md:w-[150px] h-8 md:h-10 bg-primary/20 border-y border-primary/30 rotate-45 flex items-center justify-center backdrop-blur-md">
                        <span className="text-[8px] md:text-[10px] font-black text-primary uppercase tracking-[0.4em] md:tracking-[0.5em] pl-4">LEADER</span>
                    </div>
                </div>
            )}
        </div>
    );
});

export default function Coaches() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const { data: coachesData, isLoading: loading, refetch } = useCoaches();
    const [searchQuery, setSearchQuery] = useState('');

    // Filter coaches based on current user role and search query
    const coaches = (coachesData || []).filter(coach => {
        // Role-based filtering
        if (role === 'head_coach') {
            const cRole = coach.role || (coach as any).profiles?.role;
            const normalizedRole = cRole?.toLowerCase().trim();
            if (normalizedRole === 'reception' || normalizedRole === 'receptionist' || normalizedRole === 'cleaner') {
                return false;
            }
        }

        // Search filtering
        if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase();
            return coach.full_name?.toLowerCase().includes(searchLower) ||
                coach.role?.toLowerCase().includes(searchLower);
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
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-12 border-b border-white/5 pb-12">
                <div className="max-w-2xl text-center lg:text-left">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary mb-6 animate-in slide-in-from-left duration-500">
                        <Medal className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--color-brand-label)' }}>{t('coaches.title')}</span>
                    </div>
                    <h1 className="text-5xl sm:text-7xl font-black text-white tracking-tighter uppercase leading-[0.9] mb-4">
                        {t('coaches.title')} <span className="premium-gradient-text">{t('common.team', 'Elite Team')}</span>
                    </h1>
                    <p className="text-white/40 text-sm sm:text-lg font-bold tracking-wide uppercase max-w-xl">
                        {t('coaches.subtitle')}
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                    {/* Search Bar */}
                    <div className="relative group w-full sm:w-80">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                            <Search className="w-4 h-4 text-white/20 group-focus-within:text-primary transition-colors" />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-bold tracking-wide"
                        />
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
            </div>

            {/* Premium Staff Sections */}
            <div className="space-y-20">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-40 gap-6">
                        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                        <p className="text-[10px] font-black uppercase tracking-[0.5em] text-white/20">{t('common.loading')}</p>
                    </div>
                ) : (
                    <>
                        {/* 1. Head Coaches / Leadership Section */}
                        {coaches.some(c => ['head_coach', 'admin'].includes(c.role?.toLowerCase() || '')) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                                    <h2 className="text-sm font-black text-primary uppercase tracking-[0.5em]">{t('roles.head_coach')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {coaches
                                        .filter(c => ['head_coach', 'admin'].includes(c.role?.toLowerCase() || ''))
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                isPremium={true}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* 2. Regular Coaches Section */}
                        {coaches.some(c => c.role?.toLowerCase() === 'coach') && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                    <h2 className="text-sm font-black text-white/40 uppercase tracking-[0.5em]">{t('roles.coach')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    {coaches
                                        .filter(c => c.role?.toLowerCase() === 'coach')
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}

                        {/* 3. Support Staff Section (Receptionist, Cleaner) */}
                        {coaches.some(c => ['receptionist', 'reception', 'cleaner'].includes(c.role?.toLowerCase() || '')) && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 px-2">
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                    <h2 className="text-sm font-black text-white/20 uppercase tracking-[0.5em]">{t('coaches.supportStaff', 'Support Staff')}</h2>
                                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 opacity-80 hover:opacity-100 transition-opacity duration-500">
                                    {coaches
                                        .filter(c => ['receptionist', 'reception', 'cleaner'].includes(c.role?.toLowerCase() || ''))
                                        .map(coach => (
                                            <CoachCard
                                                key={coach.id}
                                                coach={coach}
                                                isCompact={true}
                                                role={role}
                                                t={t}
                                                currency={currency}
                                                onEdit={() => { setEditingCoach(coach); setShowAddModal(true); }}
                                                onDelete={() => confirmDelete(coach.id)}
                                                onAttendance={() => { setSelectedCoachForAttendance(coach); setShowAttendanceModal(true); fetchAttendance(coach.id); }}
                                                onManualAttendance={() => { setSelectedCoachForManual(coach); setShowManualAttendance(true); }}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
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

