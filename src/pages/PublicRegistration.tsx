import { useState, useEffect } from 'react';
import { User, Calendar, Phone, CheckCircle, TrendingUp, Sparkles, ChevronRight, Mail, MapPin, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { format, parseISO, addMonths } from 'date-fns';

export default function PublicRegistration() {
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [coaches, setCoaches] = useState<{ id: string, full_name: string, role: string }[]>([]);
    const [plans, setPlans] = useState<{ id: string, name: string, price: number, duration_months: number }[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        full_name: '',
        birth_date: '',
        gender: 'male',
        contact_number: '',       // Student Phone
        parent_contact: '',       // Parent Phone Whatsapp
        email: '',
        address: '',
        coach_id: '',
        subscription_type: '',
        training_days: [] as string[],
        training_schedule: [] as { day: string, start: string, end: string }[],
    });

    useEffect(() => {
        const fetchData = async () => {
            const [coachesRes, plansRes] = await Promise.all([
                supabase.from('coaches').select('id, full_name, role').order('full_name'),
                supabase.from('subscription_plans').select('*').eq('is_active', true)
            ]);
            if (coachesRes.data) setCoaches(coachesRes.data);
            if (plansRes.data) setPlans(plansRes.data);
        };
        fetchData();
    }, []);

    // Helper: Toggle Days
    const toggleDay = (day: string) => {
        setFormData(prev => {
            const isAlreadyActive = prev.training_days.includes(day);
            if (isAlreadyActive) {
                return {
                    ...prev,
                    training_days: prev.training_days.filter(d => d !== day),
                    training_schedule: prev.training_schedule.filter(s => s.day !== day)
                };
            } else {
                return {
                    ...prev,
                    training_days: [...prev.training_days, day],
                    training_schedule: [...prev.training_schedule, { day, start: '16:00', end: '18:00' }]
                };
            }
        });
    };

    // Helper: Update Time
    const updateTime = (day: string, type: 'start' | 'end', value: string) => {
        setFormData(prev => ({
            ...prev,
            training_schedule: prev.training_schedule.map(s =>
                s.day === day ? { ...s, [type]: value } : s
            )
        }));
    };

    const daysOfWeek = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.full_name || !formData.birth_date || !formData.parent_contact || !formData.subscription_type) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);

        try {
            // 1. Calculate Schema Fields
            const birth = new Date(formData.birth_date);
            const now = new Date();
            let age = now.getFullYear() - birth.getFullYear();
            const m = now.getMonth() - birth.getMonth();
            if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;

            const selectedPlan = plans.find(p => p.id === formData.subscription_type);
            const joinDateStr = new Date().toISOString(); // Now
            const expiryDate = selectedPlan
                ? format(addMonths(new Date(), selectedPlan.duration_months), 'yyyy-MM-dd')
                : null;

            // 2. Determine Group (Auto-Grouping Logic)
            let trainingGroupId = null;
            if (formData.coach_id && formData.training_schedule.length > 0) {
                const scheduleKey = formData.training_schedule
                    .map(s => `${s.day}:${s.start}:${s.end}`)
                    .sort()
                    .join('|');

                // Generate Group Name: "Sat/Mon 4PM"
                const dayMap: { [key: string]: string } = { sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri' };
                const shortDays = formData.training_days.map(d => dayMap[d] || d.toUpperCase()).join('/');
                const timeLabel = formData.training_schedule[0]?.start
                    ? format(parseISO(`2000-01-01T${formData.training_schedule[0].start}`), 'h a')
                    : '';
                const groupName = `${shortDays} ${timeLabel}`;

                // Find or Create Group
                const { data: existingGroup } = await supabase
                    .from('training_groups')
                    .select('id')
                    .eq('coach_id', formData.coach_id)
                    .eq('schedule_key', scheduleKey)
                    .maybeSingle();

                if (existingGroup) {
                    trainingGroupId = existingGroup.id;
                } else {
                    const { data: newGroup, error: groupError } = await supabase
                        .from('training_groups')
                        .insert({
                            coach_id: formData.coach_id,
                            name: groupName,
                            schedule_key: scheduleKey
                        })
                        .select()
                        .single();
                    if (groupError) throw groupError;
                    trainingGroupId = newGroup.id;
                }
            }

            // 3. Insert Student
            const { data: student, error: studentError } = await supabase
                .from('students')
                .insert({
                    full_name: formData.full_name,
                    birth_date: formData.birth_date,
                    age: age,
                    parent_contact: formData.parent_contact,
                    contact_number: formData.contact_number, // Student phone
                    email: formData.email,
                    address: formData.address,
                    coach_id: formData.coach_id || null,
                    training_group_id: trainingGroupId,
                    subscription_plan_id: formData.subscription_type,
                    subscription_expiry: expiryDate,
                    training_days: formData.training_days,
                    training_schedule: formData.training_schedule,
                    is_active: true,
                    gender: formData.gender,
                    join_date: joinDateStr
                })
                .select('id')
                .single();

            if (studentError) throw studentError;
            const studentId = student.id;

            // 4. Record Payment
            if (selectedPlan && selectedPlan.price > 0) {
                await supabase.from('payments').insert({
                    student_id: studentId,
                    amount: selectedPlan.price,
                    payment_date: joinDateStr,
                    payment_method: 'cash',
                    notes: `New Registration - ${selectedPlan.name}`
                });
            }

            // 5. Insert Training Schedule Rows & Sessions
            if (formData.training_schedule.length > 0) {
                const trainingInserts = formData.training_schedule.map(s => ({
                    student_id: studentId,
                    day_of_week: s.day,
                    start_time: s.start,
                    end_time: s.end
                }));
                await supabase.from('student_training_schedule').insert(trainingInserts);

                // Auto-create sessions if coach assigned
                if (formData.coach_id) {
                    const fullDayMap: { [key: string]: string } = {
                        'sat': 'Saturday', 'sun': 'Sunday', 'mon': 'Monday', 'tue': 'Tuesday', 'wed': 'Wednesday', 'thu': 'Thursday', 'fri': 'Friday'
                    };
                    for (const schedule of formData.training_schedule) {
                        const fullDayName = fullDayMap[schedule.day];
                        const { data: existingSessions } = await supabase
                            .from('training_sessions')
                            .select('id')
                            .eq('coach_id', formData.coach_id)
                            .eq('day_of_week', fullDayName)
                            .eq('start_time', schedule.start)
                            .eq('end_time', schedule.end)
                            .limit(1);

                        if (!existingSessions || existingSessions.length === 0) {
                            await supabase.from('training_sessions').insert([{
                                coach_id: formData.coach_id,
                                day_of_week: fullDayName,
                                start_time: schedule.start,
                                end_time: schedule.end,
                                title: 'Group Training',
                                capacity: 20
                            }]);
                        }
                    }
                }
            }

            // Success Animation
            setSuccess(true);
            toast.success('Registration Successful!');

            // Reset form
            setTimeout(() => {
                setSuccess(false);
                setFormData({
                    full_name: '',
                    birth_date: '',
                    gender: 'male',
                    contact_number: '',
                    parent_contact: '',
                    email: '',
                    address: '',
                    coach_id: '',
                    subscription_type: '',
                    training_days: [],
                    training_schedule: [],
                });
                window.scrollTo(0, 0);
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
            <div className="relative z-10 mb-8 text-center">
                <div className="relative inline-block group mb-6">
                    <div className="absolute -inset-4 bg-gradient-to-r from-primary to-accent rounded-full blur opacity-40 group-hover:opacity-60 transition duration-1000"></div>
                    <img src="/logo.png" alt="Epic Gym" className="relative h-28 w-auto object-contain drop-shadow-2xl" />
                </div>
                <h2 className="text-4xl font-black text-white uppercase tracking-tight premium-gradient-text">
                    Join The Legacy
                </h2>
            </div>

            {/* Form Card */}
            <div className="w-full max-w-4xl relative z-10 mb-12">
                <div className="glass-card p-1 rounded-[3rem] bg-gradient-to-br from-white/10 to-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
                    <div className="bg-[#0f172a]/90 backdrop-blur-md rounded-[2.9rem] p-8 md:p-12">
                        <form onSubmit={handleSubmit} className="space-y-10">

                            {/* Section: Personal Info */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <User className="w-4 h-4" /> Personal Details
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Gymnast Name</label>
                                        <input type="text" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} className="input-premium" required placeholder="Full Name" />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Date of Birth</label>
                                        <input type="date" value={formData.birth_date} onChange={e => setFormData({ ...formData, birth_date: e.target.value })} className="input-premium calendar-picker-indicator-white" required />
                                    </div>
                                    <div className="group md:col-span-2">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Gender</label>
                                        <div className="flex bg-white/5 rounded-2xl p-1.5 border border-white/10">
                                            {['male', 'female'].map(g => (
                                                <button key={g} type="button" onClick={() => setFormData({ ...formData, gender: g })}
                                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${formData.gender === g ? (g === 'male' ? 'bg-blue-600' : 'bg-pink-600') + ' text-white shadow-lg' : 'text-white/40 hover:text-white'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Contact Info */}
                            <div className="space-y-6 border-t border-white/5 pt-8">
                                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Phone className="w-4 h-4" /> Contact Information
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Phone Number</label>
                                        <input type="tel" value={formData.contact_number} onChange={e => setFormData({ ...formData, contact_number: e.target.value })} className="input-premium" placeholder="01xxxxxxxxx" required />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Parent WhatsApp</label>
                                        <input type="tel" value={formData.parent_contact} onChange={e => setFormData({ ...formData, parent_contact: e.target.value })} className="input-premium" placeholder="01xxxxxxxxx" required />
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Email Address</label>
                                        <div className="relative">
                                            <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                            <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-premium pl-14" placeholder="email@example.com" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Home Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-white/20" />
                                            <input type="text" value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="input-premium pl-14" placeholder="City, Street..." />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section: Training & Subscription */}
                            <div className="space-y-6 border-t border-white/5 pt-8">
                                <h3 className="text-sm font-black text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4" /> Training Plan
                                </h3>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest ml-4 block">Select Training Days</label>
                                    <div className="flex flex-wrap gap-2">
                                        {daysOfWeek.map(day => (
                                            <button key={day} type="button" onClick={() => toggleDay(day)}
                                                className={`flex-1 min-w-[3.5rem] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.training_days.includes(day)
                                                    ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20 scale-105'
                                                    : 'bg-white/5 border-white/10 text-white/30 hover:bg-white/10 hover:border-white/20'}`}>
                                                {day}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Time Selectors */}
                                    {formData.training_schedule.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 animate-in fade-in slide-in-from-top-4">
                                            {formData.training_schedule.map(schedule => (
                                                <div key={schedule.day} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4">
                                                    <span className="text-xs font-black uppercase text-primary w-12">{schedule.day}</span>
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <div className="relative">
                                                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                                                            <input type="time" value={schedule.start} onChange={e => updateTime(schedule.day, 'start', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-7 pr-2 text-xs text-white outline-none focus:border-primary/50" />
                                                        </div>
                                                        <div className="relative">
                                                            <Clock className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                                                            <input type="time" value={schedule.end} onChange={e => updateTime(schedule.day, 'end', e.target.value)} className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-7 pr-2 text-xs text-white outline-none focus:border-primary/50" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Subscription Type</label>
                                        <div className="relative">
                                            <select value={formData.subscription_type} onChange={e => setFormData({ ...formData, subscription_type: e.target.value })} className="input-premium appearance-none" required>
                                                <option value="" className="bg-slate-900">Select Plan</option>
                                                {plans.map(plan => (
                                                    <option key={plan.id} value={plan.id} className="bg-slate-900">{plan.name} - {plan.price} EGP</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none rotate-90" />
                                        </div>
                                    </div>
                                    <div className="group">
                                        <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest mb-2 ml-4 block">Select Coach (Optional)</label>
                                        <div className="relative">
                                            <select value={formData.coach_id} onChange={e => setFormData({ ...formData, coach_id: e.target.value })} className="input-premium appearance-none">
                                                <option value="" className="bg-slate-900">No Specific Coach</option>
                                                {coaches.map(coach => (
                                                    <option key={coach.id} value={coach.id} className="bg-slate-900">{coach.full_name} ({coach.role})</option>
                                                ))}
                                            </select>
                                            <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30 pointer-events-none rotate-90" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full group relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white py-6 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98] mt-8 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                                <span className="relative z-10 flex items-center justify-center gap-3">
                                    {loading ? 'Processing Registration...' : 'Join Now'}
                                    {!loading && <ChevronRight className="w-6 h-6" />}
                                </span>
                            </button>

                        </form>
                    </div>
                </div>
            </div>

            <style>{`
                .input-premium {
                    width: 100%;
                    padding: 1.5rem 2rem;
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 1.5rem;
                    color: white;
                    font-size: 1.1rem; /* xl */
                    font-weight: 700;
                    outline: none;
                    transition: all 0.3s;
                }
                .input-premium:focus {
                    background: rgba(255, 255, 255, 0.1);
                    border-color: rgba(var(--primary-rgb), 0.5);
                    box-shadow: 0 0 0 4px rgba(var(--primary-rgb), 0.1);
                }
                .input-premium::placeholder {
                    color: rgba(255, 255, 255, 0.2);
                }
            `}</style>
        </div>
    );
}
