import React from 'react';
import { X, User, Calendar, Star, Users, ArrowRight, Sparkles, Pencil } from 'lucide-react';
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
                className="absolute inset-0 bg-[#020617]/90 backdrop-blur-2xl animate-in fade-in duration-700"
                onClick={onClose}
            >
                {/* Dynamic Aura Effects (Neutral) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] pointer-events-none overflow-hidden">
                    <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-[120px] mix-blend-screen opacity-30 animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-white/[0.01] rounded-full blur-[120px] mix-blend-screen opacity-30 animate-pulse delay-700"></div>
                </div>
            </div>

            <div className="w-full max-w-sm sm:max-w-md bg-[#0d1117]/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
                {/* Visual Accent - Static Glass Texture */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Modal Glow Aura (Neutral) */}
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/[0.02] rounded-full blur-[100px]"></div>
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/[0.01] rounded-full blur-[80px]"></div>

                {/* Modal Header Section */}
                <div className="relative z-10 px-6 py-8 bg-gradient-to-b from-white/[0.03] to-transparent">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-5">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-white/10 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                <div className="relative w-16 h-16 rounded-2xl bg-[#161b22] border border-white/10 flex items-center justify-center text-white font-black text-2xl shadow-2xl transition-all duration-500 group-hover:scale-105 group-hover:border-white/20">
                                    {group.name.charAt(0).toUpperCase()}
                                </div>
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tighter uppercase leading-none mb-2">
                                    {group.name}
                                </h2>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center gap-1.5 shadow-inner">
                                        <Users className="w-3 h-3 text-white/20" />
                                        <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">
                                            {group.students?.length || 0} {t('common.members')}
                                        </span>
                                    </div>
                                    {group.coaches?.full_name && (
                                        <div className="px-2.5 py-1 bg-white/[0.03] border border-white/5 rounded-lg flex items-center gap-1.5 shadow-inner">
                                            <User className="w-3 h-3 text-white/20" />
                                            <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">
                                                {group.coaches.full_name}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {onEdit && (
                                <button
                                    onClick={onEdit}
                                    className="p-3 rounded-xl bg-white/5 hover:bg-white text-white/40 hover:text-black transition-all border border-white/10 hover:border-white active:scale-90 shadow-xl"
                                >
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-3 rounded-xl bg-white/5 hover:bg-rose-500/10 text-white/20 hover:text-rose-500 transition-all border border-white/10 hover:border-rose-500/20 active:scale-90 shadow-xl"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Body - Student List */}
                <div className="relative z-10 px-6 pb-6 max-h-[40vh] overflow-y-auto custom-scrollbar">
                    {group.students.length === 0 ? (
                        <div className="text-center py-12 flex flex-col items-center gap-4 opacity-40">
                            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/10 shadow-inner">
                                <Users className="w-8 h-8" />
                            </div>
                            <p className="text-[9px] text-white/40 font-black uppercase tracking-[0.4em]">{t('common.rosterEmpty')}</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between px-2 mb-3">
                                <span className="text-[9px] font-black text-white/10 uppercase tracking-[0.6em] whitespace-nowrap">{t('common.studentList')}</span>
                                <div className="w-full ml-6 h-px bg-white/5 shadow-inner"></div>
                            </div>
                            {group.students.map((student, idx) => (
                                <div
                                    key={student.id}
                                    className="group/item relative p-3 rounded-[1.5rem] bg-white/[0.015] border border-white/5 hover:border-white/20 hover:bg-white/[0.03] transition-all duration-500 flex items-center justify-between overflow-hidden shadow-sm"
                                    style={{ animationDelay: `${idx * 80}ms` }}
                                >
                                    {/* Hover Shine Effect */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent -translate-x-full group-hover/item:translate-x-full transition-transform duration-1000"></div>

                                    <div className="flex items-center gap-3 relative z-10">
                                        <div className="w-10 h-10 rounded-xl bg-[#161b22] border border-white/10 flex items-center justify-center text-white/20 font-black text-lg shadow-xl group-hover/item:scale-105 group-hover/item:text-white group-hover/item:border-white/20 transition-all duration-500">
                                            {student.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="text-xs font-black text-white/60 group-hover/item:text-white transition-colors tracking-tight">
                                                {student.full_name}
                                            </h3>
                                            <p className="text-[8px] font-bold text-white/10 uppercase tracking-[0.2em] mt-0.5 group-hover/item:text-white/30 transition-colors">
                                                {t('common.born')} {student.birth_date}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 relative z-10 pr-1">
                                        <span className="text-xl font-black text-white/80 group-hover/item:text-white tracking-tighter leading-none transition-colors">
                                            {calculateAge(student.birth_date)}
                                        </span>
                                        <span className="text-[8px] font-black text-white/10 uppercase tracking-widest group-hover/item:text-white/20 transition-colors">{t('common.yrs')}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Action Footer */}
                <div className="relative z-10 px-6 py-6 bg-black/40 flex flex-col sm:flex-row items-center justify-between border-t border-white/5 gap-4">
                    <div className="hidden sm:flex items-center gap-3 opacity-10">
                        <div className="w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_10px_white]"></div>
                        <span className="text-[8px] font-black text-white uppercase tracking-[0.8em]">System Active</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-10 py-3 rounded-xl bg-white/5 hover:bg-white text-white/40 hover:text-black transition-all duration-300 shadow-xl border border-white/5 hover:border-white active:scale-95 flex items-center justify-center"
                    >
                        <span className="font-black uppercase tracking-[0.3em] text-[10px]">
                            {t('common.dismiss')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
