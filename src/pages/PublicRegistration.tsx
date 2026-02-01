import { useState, useEffect } from 'react';
import { User, Calendar, Phone, CheckCircle, TrendingUp, Sparkles, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function PublicRegistration() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [coaches, setCoaches] = useState<{ id: string, full_name: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        birth_date: '',
        gender: 'male', // 'male' | 'female'
        parent_contact: '',
        coach_id: ''
    });

    useEffect(() => {
        fetchCoaches();
    }, []);

    const fetchCoaches = async () => {
        const { data } = await supabase
            .from('coaches')
            .select('id, full_name')
            .order('full_name');
        if (data) setCoaches(data);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.full_name || !formData.birth_date || !formData.parent_contact) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            // Calculate age
            const birth = new Date(formData.birth_date);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
                age--;
            }

            const { error } = await supabase
                .from('students')
                .insert({
                    full_name: formData.full_name,
                    birth_date: formData.birth_date,
                    age: age,
                    parent_contact: formData.parent_contact,
                    coach_id: formData.coach_id || null, // Optional coach
                    is_active: true, // Auto-activate
                    gender: formData.gender,
                    // join_date handled by created_at default
                });

            if (error) throw error;

            // Success Animation
            setSuccess(true);
            toast.success('Registration Successful!');

            // Reset form after 3 seconds
            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    full_name: '',
                    birth_date: '',
                    gender: 'male',
                    parent_contact: '',
                    coach_id: ''
                });
            }, 4000);

        } catch (error: any) {
            console.error('Registration error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[150px] animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-accent/20 rounded-full blur-[150px] animate-pulse delay-1000"></div>
                </div>

                <div className="z-10 text-center animate-in zoom-in-95 duration-700">
                    <div className="w-32 h-32 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30 animate-bounce">
                        <CheckCircle className="w-16 h-16 text-white" />
                    </div>
                    <h1 className="text-5xl font-black text-white uppercase tracking-tighter mb-4 premium-gradient-text">
                        Welcome to the Family!
                    </h1>
                    <p className="text-xl text-white/60 font-medium tracking-widest uppercase">
                        Registration Complete
                    </p>
                    <div className="mt-12 flex items-center justify-center gap-2 text-white/30 text-sm font-bold uppercase tracking-widest animate-pulse">
                        <Sparkles className="w-4 h-4" />
                        Get Ready to Shine
                        <Sparkles className="w-4 h-4" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden font-cairo">

            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] right-[20%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[180px]"></div>
                <div className="absolute bottom-[-20%] left-[10%] w-[60%] h-[60%] bg-accent/10 rounded-full blur-[180px]"></div>
            </div>

            {/* Header / Logo */}
            <div className="relative z-10 mb-12 text-center">
                <div className="relative inline-block group">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                    <img src="/logo.png" alt="Epic Gym" className="relative h-32 w-auto object-contain drop-shadow-2xl" />
                </div>
                <h2 className="mt-8 text-3xl font-black text-white uppercase tracking-tight premium-gradient-text">
                    New Member Registration
                </h2>
                <p className="text-white/40 text-sm font-bold tracking-[0.3em] uppercase mt-2">
                    Join the Legacy
                </p>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-2xl relative z-10">
                <div className="glass-card p-1 pb-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="bg-[#0f172a]/80 backdrop-blur-md rounded-[2.9rem] p-8 md:p-12">
                        <form onSubmit={handleSubmit} className="space-y-8">

                            {/* Full Name */}
                            <div className="group">
                                <label className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-3 ml-6 block">
                                    Gymnast Name
                                </label>
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">
                                        <User className="w-6 h-6" />
                                    </div>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                        className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/10"
                                        placeholder="Enter full name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Birth Date */}
                                <div className="group">
                                    <label className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-3 ml-6 block">
                                        Date of Birth
                                    </label>
                                    <div className="relative">
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">
                                            <Calendar className="w-6 h-6" />
                                        </div>
                                        <input
                                            type="date"
                                            value={formData.birth_date}
                                            onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                                            className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/10 appearance-none calendar-picker-indicator-white"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Gender - Custom Radio */}
                                <div className="group">
                                    <label className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-3 ml-6 block">
                                        Gender
                                    </label>
                                    <div className="flex bg-white/5 rounded-[2rem] p-2 border border-white/10">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gender: 'male' })}
                                            className={`flex-1 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all duration-300 ${formData.gender === 'male'
                                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            Male
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, gender: 'female' })}
                                            className={`flex-1 py-4 rounded-[1.5rem] text-sm font-black uppercase tracking-widest transition-all duration-300 ${formData.gender === 'female'
                                                ? 'bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg'
                                                : 'text-white/40 hover:text-white hover:bg-white/5'
                                                }`}
                                        >
                                            Female
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Parent Contact */}
                            <div className="group">
                                <label className="text-xs font-bold text-primary/80 uppercase tracking-widest mb-3 ml-6 block">
                                    Parent Phone
                                </label>
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">
                                        <Phone className="w-6 h-6" />
                                    </div>
                                    <input
                                        type="tel"
                                        value={formData.parent_contact}
                                        onChange={e => setFormData({ ...formData, parent_contact: e.target.value })}
                                        className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/10"
                                        placeholder="Enter phone number"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Coach Selection (Optional) */}
                            <div className="group">
                                <label className="text-xs font-bold text-white/40 uppercase tracking-widest mb-3 ml-6 block flex justify-between">
                                    <span>Select Coach</span>
                                    <span className="text-white/20 text-[10px]">OPTIONAL</span>
                                </label>
                                <div className="relative">
                                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/30 group-focus-within:text-primary transition-colors">
                                        <TrendingUp className="w-6 h-6" />
                                    </div>
                                    <select
                                        value={formData.coach_id}
                                        onChange={e => setFormData({ ...formData, coach_id: e.target.value })}
                                        className="w-full pl-16 pr-8 py-6 bg-white/5 border border-white/10 rounded-[2rem] text-white text-xl font-bold focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all focus:ring-4 focus:ring-primary/10 appearance-none cursor-pointer"
                                    >
                                        <option value="" className="bg-slate-900 text-white/50">No Specific Coach</option>
                                        {coaches.map(coach => (
                                            <option key={coach.id} value={coach.id} className="bg-slate-900 text-white">
                                                {coach.full_name}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                                        <ChevronRight className="w-5 h-5 rotate-90" />
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-6 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? 'Processing...' : 'Complete Registration'}
                                    {!loading && <ChevronRight className="w-6 h-6" />}
                                </span>
                            </button>

                        </form>
                    </div>
                </div>

                {/* Footer */}
                <p className="text-center text-white/20 text-xs font-bold uppercase tracking-[0.3em] mt-12">
                    Powered by Epic Gym Systems
                </p>
            </div>
        </div>
    );
}
