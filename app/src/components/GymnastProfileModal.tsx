import { X, User, Calendar, Star, ShieldCheck, Clock, Mail, MapPin, Phone } from 'lucide-react';
import { format, differenceInYears, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface GymnastProfileModalProps {
    student: any;
    onClose: () => void;
}

export default function GymnastProfileModal({ student, onClose }: GymnastProfileModalProps) {
    const { t } = useTranslation();

    const calculateAge = (dob: string) => {
        if (!dob) return 'N/A';
        try {
            const birthDate = parseISO(dob);
            const age = differenceInYears(new Date(), birthDate);

            // Safety guard for invalid or extreme dates (preventing ?? mystery)
            if (age > 100 || age < 0) return '??';
            return age;
        } catch {
            return 'N/A';
        }
    };

    const isSuspiciousDate = (dob: string) => {
        if (!dob) return false;
        try {
            const year = parseISO(dob).getFullYear();
            return year < 1920 || year > new Date().getFullYear();
        } catch {
            return true;
        }
    };

    if (!student) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-hidden">
            {/* Ultra-Neutral Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-1000"
                onClick={onClose}
            />

            <div className="w-full max-w-[380px] bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.9)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-700 relative">
                {/* Dynamic Glass Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] via-transparent to-transparent pointer-events-none"></div>

                {/* Header Section */}
                <div className="relative z-10 px-8 pt-10 pb-6 border-b border-white/5">
                    <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-4">
                            <h2 className="text-2xl font-black text-white tracking-widest uppercase mb-1 drop-shadow-lg truncate">
                                {student.full_name}
                            </h2>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5 opacity-50">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">ID: {String(student.id).slice(0, 8)}</span>
                                </div>
                                <div className="w-1 h-1 rounded-full bg-white/20"></div>
                                <span className={`text-[10px] font-black uppercase tracking-widest ${student.is_active ? 'text-emerald-500/60' : 'text-rose-500/60'}`}>
                                    {student.is_active ? t('common.active') : t('common.inactive')}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-rose-500 text-white/60 hover:text-white transition-all border border-white/10 active:scale-90"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Body - Clean Details List (No Scrolling) */}
                <div className="relative z-10 px-8 pt-6 pb-2 space-y-6">

                    {/* Bio Brief */}
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-primary/60 font-black text-xl shadow-xl">
                                {student.full_name?.[0]}
                            </div>
                            <div className="flex flex-col">
                                <p className="text-[11px] font-black text-white/80 uppercase tracking-tight">{student.gender || 'Male'}</p>
                                <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">{student.training_type || 'Artistic'}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className={`text-3xl font-black tracking-tighter leading-none ${calculateAge(student.birth_date) === '??' ? 'text-rose-500 animate-pulse' : 'text-white/80'}`}>
                                {calculateAge(student.birth_date)}
                                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest ml-1">{t('common.yrs')}</span>
                            </p>
                            <p className={`text-[8px] font-black uppercase tracking-widest mt-1 ${isSuspiciousDate(student.birth_date) ? 'text-amber-500/80 animate-pulse' : 'text-white/10'}`}>
                                {isSuspiciousDate(student.birth_date) && '⚠️ '}{t('common.born')} {student.birth_date || 'N/A'}
                            </p>
                        </div>
                    </div>

                    {/* Registry Items */}
                    <div className="space-y-4">
                        <div className="p-5 rounded-[2rem] bg-white/[0.02] border border-white/5 space-y-4">
                            {/* Primary Contact */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center opacity-40 shrink-0">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t('common.father')}</span>
                                        <span className="text-[13px] font-black text-white/90 uppercase truncate">{student.father_name || 'N/A'}</span>
                                    </div>
                                </div>
                                <span className="text-[15px] font-mono font-black text-primary tracking-wider shrink-0 ml-4 drop-shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]">
                                    {student.contact_number || '---'}
                                </span>
                            </div>

                            {/* Secondary Contact */}
                            <div className="flex items-center justify-between border-t border-white/[0.05] pt-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center opacity-60 shrink-0 border border-white/5">
                                        <User className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em]">{t('common.mother')}</span>
                                        <span className="text-[13px] font-black text-white/90 uppercase truncate">{student.mother_name || 'N/A'}</span>
                                    </div>
                                </div>
                                <span className="text-[15px] font-mono font-black text-primary tracking-wider shrink-0 ml-4 drop-shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]">
                                    {student.parent_contact || '---'}
                                </span>
                            </div>

                            {/* Address & Email */}
                            <div className="border-t border-white/[0.05] pt-4 space-y-3">
                                <div className="flex items-center gap-3">
                                    <Mail className="w-4 h-4 text-white/30" />
                                    <span className="text-[13px] font-bold text-white/60 truncate tracking-tight">{student.email || 'No email provided'}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-4 h-4 text-white/30" />
                                    <span className="text-[13px] font-bold text-white/60 truncate tracking-tight">{student.address || 'No address provided'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Coach & Sub Info */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="p-5 rounded-[1.75rem] bg-white/[0.02] border border-white/10 transition-all">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                    <ShieldCheck className="w-4 h-4 text-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Coach</span>
                                </div>
                                <p className="text-[13px] font-black text-white/80 uppercase truncate">
                                    {student.coaches?.full_name?.split(' ')[0] || 'NONE'}
                                </p>
                            </div>
                            <div className="p-5 rounded-[1.75rem] bg-white/[0.02] border border-white/10 transition-all">
                                <div className="flex items-center gap-2 mb-1.5 opacity-60">
                                    <Clock className="w-4 h-4 text-white" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-white">Expiry</span>
                                </div>
                                <p className="text-[13px] font-black text-white/80 tracking-widest">
                                    {student.subscription_expiry ? format(new Date(student.subscription_expiry), 'dd/MM/yy') : 'N/A'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Synced Action Footer */}
                <div className="relative z-10 px-8 py-8">
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-3xl bg-white text-black hover:bg-white/90 transition-all duration-500 shadow-[0_20px_40px_rgba(255,255,255,0.1)] active:scale-95 flex items-center justify-center overflow-hidden"
                    >
                        <span className="font-black uppercase tracking-[0.5em] text-[10px]">
                            {t('common.dismiss')}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
