import React from 'react';
import { X, User, Calendar, Star } from 'lucide-react';
import { differenceInYears, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface Student {
    id: string;
    full_name: string;
    birth_date: string;
    // Add other fields if needed
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
    const { t } = useTranslation();

    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        return differenceInYears(new Date(), parseISO(dob));
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="w-full max-w-2xl bg-[#1a1f37] rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white uppercase tracking-tight">{group.name}</h2>
                            <p className="text-white/40 text-sm font-bold uppercase tracking-widest">
                                {group.students.length} {t('common.students', 'GYMNASTS')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {group.students.length === 0 ? (
                        <div className="text-center py-12 text-white/40 italic">
                            No students in this group yet.
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {group.students.map((student) => (
                                <div key={student.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-primary/30 transition-all group/item">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-black text-sm shadow-lg">
                                            {student.full_name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white group-hover/item:text-primary transition-colors">
                                                {student.full_name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded">
                                                    Gymnast
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Age</p>
                                            <p className="text-lg font-black text-white">
                                                {calculateAge(student.birth_date)}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold uppercase tracking-wide text-xs transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
