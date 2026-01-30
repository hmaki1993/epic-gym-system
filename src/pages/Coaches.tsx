import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Search, Filter, Mail, Phone, MapPin, Medal, DollarSign, UserCheck, UserMinus } from 'lucide-react';
import AddCoachForm from '../components/AddCoachForm';
import Payroll from '../components/Payroll';
import { useTranslation } from 'react-i18next';
import { useCoaches } from '../hooks/useData';

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
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [attendanceMap, setAttendanceMap] = useState<Record<string, any>>({});
    const [currentTime, setCurrentTime] = useState(new Date());

    const fetchAttendance = async () => {
        const today = new Date().toISOString().slice(0, 10);
        const { data } = await supabase
            .from('coach_attendance')
            .select('*')
            .eq('date', today);

        const map: Record<string, any> = {};
        if (data) {
            data.forEach((record: any) => {
                map[record.coach_id] = record;
            });
        }
        setAttendanceMap(map);
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAttendance();

        // Update timer every second
        const interval = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const getDuration = (checkInTime: string) => {
        const start = new Date(checkInTime).getTime();
        const now = currentTime.getTime();
        const diff = Math.max(0, now - start);

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleAttendance = async (coachId: string, type: 'check-in' | 'check-out') => {
        const today = new Date().toISOString().slice(0, 10);

        if (type === 'check-in') {
            const { error } = await supabase.from('coach_attendance').insert([{
                coach_id: coachId,
                date: today,
                check_in_time: new Date().toISOString()
            }]);

            if (error) {
                alert('Error checking in: ' + error.message);
            } else {
                setRefreshTrigger(prev => prev + 1);
            }
        } else {
            const sessions = prompt(t('coaches.enterSessions'), '0');
            if (sessions === null) return;

            const { error } = await supabase.from('coach_attendance').upsert([{
                coach_id: coachId,
                date: today,
                check_out_time: new Date().toISOString(),
                pt_sessions_count: parseInt(sessions)
            }], { onConflict: 'coach_id,date' });

            if (error) {
                alert('Error checking out: ' + error.message);
            } else {
                setRefreshTrigger(prev => prev + 1);
            }
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm(t('common.deleteConfirm'))) return;

        const { error } = await supabase.from('coaches').delete().eq('id', id);
        if (error) {
            console.error('Error deleting:', error);
            alert(t('common.deleteError'));
        } else {
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
                    const attendance = attendanceMap[coach.id];
                    const isCheckedIn = attendance && attendance.check_in_time && !attendance.check_out_time;
                    const isDone = attendance && attendance.check_out_time;

                    return (
                        <div key={coach.id} className={`bg-white rounded-2xl p-6 shadow-sm border transition-shadow relative ${isCheckedIn ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-100 hover:shadow-md'}`}>
                            {/* Edit/Delete Actions */}
                            <div className="absolute top-4 right-4 flex gap-2">
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
                                    onClick={() => handleDelete(coach.id)}
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
                                <span className={`text-xs px-2 py-1 rounded-full font-medium mr-16 ${isCheckedIn ? 'bg-green-100 text-green-700 animate-pulse' : 'bg-gray-100 text-gray-500'}`}>
                                    {isCheckedIn ? t('coaches.workingNow') : isDone ? t('coaches.done') : t('coaches.away')}
                                </span>
                            </div>

                            <h3 className="text-lg font-bold text-gray-900">{coach.full_name}</h3>
                            <div className="flex items-center text-gray-600 dark:text-gray-300">
                                <Medal className="w-4 h-4 mr-2 opacity-70" />
                                <span className="text-sm">{coach.specialty}</span>
                            </div>

                            <div className="mt-4 pt-4 border-t border-gray-50">
                                {isCheckedIn ? (
                                    <div className="flex flex-col gap-2">
                                        <div className="text-center bg-green-50 rounded-lg py-2 border border-green-100">
                                            <p className="text-xs text-green-600 font-medium">{t('coaches.duration')}</p>
                                            <p className="text-xl font-mono font-bold text-green-700">{getDuration(attendance.check_in_time)}</p>
                                        </div>
                                        <button
                                            onClick={() => handleAttendance(coach.id, 'check-out')}
                                            className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-orange-700 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
                                        >
                                            <UserMinus className="w-4 h-4" />
                                            {t('coaches.checkOut')}
                                        </button>
                                    </div>
                                ) : isDone ? (
                                    <div className="text-center py-2 text-gray-400 bg-gray-50 rounded-lg border border-gray-100">
                                        <p className="text-sm font-medium">{t('coaches.checkedOutStatus')}</p>
                                        <p className="text-xs">
                                            {new Date(attendance.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(attendance.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => handleAttendance(coach.id, 'check-in')}
                                        className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
                                    >
                                        <UserCheck className="w-4 h-4" />
                                        {t('coaches.checkIn')}
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Payroll Section */}
            <Payroll refreshTrigger={refreshTrigger} />

            {/* Modal */}
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
        </div>
    );
}
