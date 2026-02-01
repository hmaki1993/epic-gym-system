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
}

interface GroupDetailsModalProps {
    group: Group;
    onClose: () => void;
}

export default function GroupDetailsModal({ group, onClose }: GroupDetailsModalProps) {
    const { t, i18n } = useTranslation();

    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        try {
            return differenceInYears(new Date(), parseISO(dob));
        } catch {
            return 'N/A';
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Ultra Premium Backdrop */}
            <div
                className="absolute inset-0 bg-[#020617]/60 backdrop-blur-3xl animate-in fade-in duration-700"
                onClick={onClose}
            >
                {/* Dynamic Aura Effects */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vh] pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] opacity-50 animate-pulse"></div>
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/5 rounded-full blur-[100px] opacity-30"></div>
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] opacity-30"></div>
                </div>
            </div>

            <div className="w-full max-w-2xl bg-white/[0.02] backdrop-blur-md rounded-[3.5rem] border border-white/10 shadow-[0_32px_128px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-500 relative">
                {/* Inner Glows */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                {/* Header */}
                <div className="relative z-10 p-10 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.8rem] bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-xl shadow-primary/20 group-hover:rotate-3 transition-transform">
                            <Users className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white uppercase tracking-tight premium-gradient-text leading-tight">{group.name}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-primary/30">
                                    {group.students.length} {t('common.students', 'Gymnasts')}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                <span className="text-white/40 text-[10px] font-black uppercase tracking-[0.2em]">
                                    Active Group
                                </span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white/40 hover:text-white transition-all hover:scale-110 active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="relative z-10 p-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {group.students.length === 0 ? (
                        <div className="text-center py-24 flex flex-col items-center gap-8">
                            <div className="w-24 h-24 rounded-[2.5rem] bg-white/5 border border-white/5 flex items-center justify-center text-white/10 shadow-inner">
                                <Users className="w-12 h-12" />
                            </div>
                            <div>
                                <p className="text-xl font-black text-white/30 uppercase tracking-[0.3em]">
                                    Empty Group
                                </p>
                                <p className="text-sm text-white/20 font-bold mt-3 max-w-[280px] mx-auto leading-relaxed">
                                    Assign students to this group from the students management panel.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-6">
                            {group.students.map((student, idx) => (
                                <div
                                    key={student.id}
                                    className="relative group/item p-7 rounded-[2.5rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.08] hover:border-primary/40 transition-all duration-500 hover:scale-[1.02] shadow-2xl overflow-hidden"
                                    style={{ animationDelay: `${idx * 50}ms` }}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent opacity-0 group-hover/item:opacity-100 transition-opacity pointer-events-none"></div>

                                    <div className="relative z-10 flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-6">
                                            <div className="w-16 h-16 rounded-[1.2rem] bg-gradient-to-br from-slate-800 to-slate-950 border border-white/10 flex items-center justify-center text-white font-black text-2xl shadow-2xl group-hover/item:scale-110 transition-transform">
                                                {student.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black text-white group-hover/item:text-primary transition-colors tracking-tight">
                                                    {student.full_name}
                                                </h3>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-white/30 bg-white/5 px-3 py-1 rounded-lg">
                                                        <Calendar className="w-3.5 h-3.5 text-primary/50" />
                                                        {student.birth_date}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-10">
                                            <div className="text-right">
                                                <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] mb-1.5">Age</p>
                                                <div className="flex items-baseline gap-1.5">
                                                    <span className="text-3xl font-black text-white tracking-tighter shrink-0">
                                                        {calculateAge(student.birth_date)}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-primary uppercase tracking-widest bg-primary/10 px-2 py-0.5 rounded-md">yrs</span>
                                                </div>
                                            </div>
                                            <div className="p-4 rounded-2xl bg-white/5 text-white/10 group-hover/item:text-primary group-hover/item:bg-primary/20 transition-all border border-white/5 group-hover/item:border-primary/20 shadow-lg">
                                                <ArrowRight className="w-6 h-6 -rotate-45 group-hover/item:rotate-0 transition-transform duration-500" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative z-10 p-10 border-t border-white/5 bg-white/[0.03] flex items-center justify-between">
                    <div className="hidden sm:flex items-center gap-3 text-white/10 group-hover:text-white/20 transition-colors">
                        <Sparkles className="w-5 h-5 text-primary/30" />
                        <span className="text-[10px] font-black uppercase tracking-[0.4em]">Epic Management Student Roster</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto px-12 py-5 rounded-[2rem] bg-white/10 hover:bg-white/20 active:bg-white/30 border border-white/10 hover:border-white/20 text-white font-black uppercase tracking-[0.3em] text-xs transition-all duration-300 shadow-2xl hover:scale-105"
                    >
                        {t('common.close', 'Close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
