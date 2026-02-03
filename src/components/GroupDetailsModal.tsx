import React from 'react';
import { X, User, Calendar, Star, Users, ArrowRight, Sparkles } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Student {
    id: string;
    full_name: string;
    birth_date: string;
}

interface Group {
    id: string;
    name: string;
    schedule_key: string;
    students: Student[];
    coaches?: {
        full_name: string;
    };
}

interface GroupDetailsModalProps {
    group: Group;
    onClose: () => void;
    onEdit?: () => void;
}

export default function GroupDetailsModal({ group, onClose, onEdit }: GroupDetailsModalProps) {
    const { t, i18n } = useTranslation();

    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        try {
            const age = differenceInYears(new Date(), parseISO(dob));
            return age >= 0 ? age : 'N/A';
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Ultra Premium Backdrop */}
            <div
                className="absolute inset-0 bg-[#020617]/80 backdrop-blur-2xl animate-in fade-in duration-700"
                onClick={onClose}
            >
                {/* Dynamic Aura Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-accent/20 rounded-full blur-[120px] mix-blend-screen opacity-50 animate-pulse delay-700"></div>
                </div>
            </div>

            <div className="w-full max-w-lg bg-[#0d1117]/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
                {/* Visual Accent - Top Light Beam */}
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent"></div>

                {/* Modal Header Section */}
                <div className="relative z-10 px-8 py-8 bg-gradient-to-b from-white/[0.05] to-transparent">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-tr from-primary to-accent rounded-2xl blur opacity-40 group-hover:opacity-100 transition duration-500"></div>
                                <div className="relative w-16 h-16 rounded-2xl bg-[#161b22] flex items-center justify-center text-white border border-white/10 shadow-2xl">
                                    {group.coaches?.full_name ? (
                                        <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-white/40">
                                            {group.coaches.full_name.charAt(0).toUpperCase()}
                                        </span>
                                    ) : (
                                        <Users className="w-8 h-8 text-primary" />
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-none">
                                    {group.name}
                                </h2>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">
                                        <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                            {group.students.length} {t('common.members')}
                                        </span>
                                    </div>
                                    {group.coaches?.full_name && (
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/40">
                                            {t('common.coachPrefix')} {group.coaches.full_name.split(' ')[0]}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-2.5 rounded-xl bg-white/5 hover:bg-primary/20 text-white/40 hover:text-primary transition-all border border-white/10 hover:border-primary/40 active:scale-90"
                                >
                                    <Sparkles className="w-4 h-4" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-500 transition-all border border-white/10 hover:border-rose-500/40 active:scale-90"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body - Student List */}
                <div className="relative z-10 px-6 pb-8 max-h-[45vh] overflow-y-auto custom-scrollbar">
                    {group.students.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center gap-6">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10">
                                <Users className="w-8 h-8" />
                            </div>
                            <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.3em]">{t('common.rosterEmpty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between px-2 mb-2">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.4em]">{t('common.studentList')}</span>
                                <span className="w-full mx-4 h-px bg-white/5"></span>
                            </div>
                            {group.students.map((student, idx) => (
                                <div
                                    key={student.id}
                                    className="group/item relative p-1.5 rounded-[1.8rem] bg-gradient-to-r from-white/[0.03] to-transparent border border-white/5 hover:border-white/10 transition-all duration-500"
                                    style={{ animationDelay: `${idx * 80}ms` }}
                                >
                                    <div className="relative flex items-center justify-between p-3 bg-[#161b22]/40 backdrop-blur-md rounded-[1.5rem] border border-white/5 group-hover/item:border-primary/20 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1c2128] to-[#0d1117] border border-white/10 flex items-center justify-center text-white/60 font-black text-lg shadow-xl group-hover/item:scale-105 transition-transform">
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black text-white group-hover/item:text-primary transition-colors tracking-tight">
                                                    {student.full_name}
                                                </h3>
                                                <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest mt-0.5">
                                                    {t('common.born')} {student.birth_date}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-6 pr-2">
                                            <div className="flex flex-col items-end">
                                                <div className="flex items-baseline gap-1">
                                                    <span className="text-xl font-black text-white tracking-tighter leading-none">
                                                        {calculateAge(student.birth_date)}
                                                    </span>
                                                    <span className="text-[7px] font-black text-primary/60 uppercase tracking-widest">{t('common.yrs')}</span>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-[1rem] bg-white/5 flex items-center justify-center text-white/10 group-hover/item:text-primary group-hover/item:bg-primary/20 border border-white/5 group-hover/item:border-primary/20 transition-all">
                                                <ArrowRight className="w-4 h-4 group-hover/item:translate-x-0.5 transition-transform" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <div className="relative z-10 px-8 py-6 bg-gradient-to-t from-black/40 to-transparent flex items-center justify-between border-t border-white/5">
                    <div className="hidden sm:flex items-center gap-2 opacity-20">
                        <Sparkles className="w-3 h-3 text-primary" />
                        <span className="text-[7px] font-black text-white uppercase tracking-[0.5em]">Roster Panel</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-10 py-3 rounded-2xl bg-white group hover:bg-primary transition-all duration-300 shadow-2xl active:scale-95"
                    >
                        <span className="text-black group-hover:text-white font-black uppercase tracking-[0.2em] text-[10px] transition-colors">
                            {t('common.dismiss')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
