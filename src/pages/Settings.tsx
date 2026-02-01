import { useState, useEffect } from 'react';
import { Save, Building2, Palette, Globe, User, Lock, Key, CreditCard, Plus, Trash2, AlertTriangle, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionPlans, useAddPlan, useDeletePlan } from '../hooks/useData';
import { supabase } from '../lib/supabase';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { applyThemeStyles } from '../utils/theme';
import { useCurrency, CURRENCIES, CurrencyCode } from '../context/CurrencyContext';

export default function Settings() {
    const { currency, setCurrency } = useCurrency();
    interface GymProfile {
        name: string;
        phone: string;
        address: string;
    }

    const { t, i18n } = useTranslation();
    const { role } = useOutletContext<{ role: string }>() || { role: null };
    const [gymProfile, setGymProfile] = useState<GymProfile>(() => {
        try {
            const saved = localStorage.getItem('gymProfile');
            return saved ? JSON.parse(saved) : {
                name: 'Epic Gym Academy',
                phone: '+20 123 456 7890',
                address: 'Cairo, Egypt',
            };
        } catch (e) {
            console.error('Failed to parse gym profile:', e);
            return {
                name: 'Epic Gym Academy',
                phone: '+20 123 456 7890',
                address: 'Cairo, Egypt',
            };
        }
    });

    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);

    const [userData, setUserData] = useState({
        full_name: '',
        email: ''
    });
    const [initialEmail, setInitialEmail] = useState('');

    const [passwordData, setPasswordData] = useState({
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name')
                    .eq('id', user.id)
                    .single();

                setUserData({
                    full_name: profile?.full_name || '',
                    email: user.email || ''
                });
                setInitialEmail(user.email || '');
            }
        };
        fetchProfile();
    }, []);

    const themes = [
        { id: 'midnight', name: 'Midnight Blue', primary: '#818cf8', secondary: '#1e293b', bg: '#0f172a' },
        { id: 'obsidian', name: 'Pure Black', primary: '#a78bfa', secondary: '#18181b', bg: '#000000' },
        { id: 'emerald', name: 'Dark Emerald', primary: '#34d399', secondary: '#1e3a2f', bg: '#0a1f1a' },
        { id: 'crimson', name: 'Dark Crimson', primary: '#fb7185', secondary: '#3f1d28', bg: '#1a0a0f' },
        { id: 'amber', name: 'Dark Amber', primary: '#fbbf24', secondary: '#3f2f1d', bg: '#1a140a' },
        { id: 'ocean', name: 'Deep Ocean', primary: '#22d3ee', secondary: '#1e3a3f', bg: '#0a1a1f' },
        { id: 'royal', name: 'Royal Purple', primary: '#c084fc', secondary: '#2e1f3f', bg: '#14091a' },
        { id: 'minddazzle', name: 'Minddazzle Elite', primary: '#622347', secondary: '#122E34', bg: '#0E1D21' },
    ];



    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'midnight');

    useEffect(() => {
        // Apply theme on mount (in case it wasn't applied by a previous visit in this session)
        applyThemeStyles(currentTheme);
    }, [currentTheme]);

    const applyTheme = (themeId: string) => {
        setCurrentTheme(themeId);
        localStorage.setItem('theme', themeId);
        applyThemeStyles(themeId);
    };

    const handleSaveProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Save to LocalStorage
        localStorage.setItem('gymProfile', JSON.stringify(gymProfile));
        // Dispatch a custom event so DashboardLayout knows to update immediately
        window.dispatchEvent(new Event('gymProfileUpdated'));
        toast.success(t('common.saveSuccess'));
        setLoading(false);
    };

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true);
        try {
            // Fetch fresh user data directly from Auth server
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) throw new Error('Session expired or security token invalid. Please log in again.');

            // 1. Update Profile (Name) in Database
            const { error: profileError } = await supabase
                .from('profiles')
                .update({ full_name: userData.full_name })
                .eq('id', user.id);

            if (profileError) throw profileError;

            // 2. Handle Email Update (Only if different from Auth server's current record)
            const inputEmail = userData.email.trim().toLowerCase();
            const currentAuthEmail = user.email?.trim().toLowerCase();

            if (inputEmail && currentAuthEmail && inputEmail !== currentAuthEmail) {
                try {
                    const { error: authError } = await supabase.auth.updateUser({
                        email: inputEmail
                    });

                    if (authError) throw authError;
                    toast.success('Email update started! Follow the link sent to your new email.');
                } catch (authError: any) {
                    console.error('Email Update Error:', authError);
                    toast.error(`Could not update email: ${authError.message}`, { duration: 5000 });
                }
            } else {
                toast.success(t('common.saveSuccess'));
            }

            // Dispatch custom event for real-time header update
            window.dispatchEvent(new Event('userProfileUpdated'));

        } catch (error: any) {
            console.error('Error updating profile:', error);

            // Handle specific JWT corruption error with auto-recovery
            if (error.message?.includes('sub claim') || error.message?.includes('JWT')) {
                toast.error('Session Error: Your login session is corrupted. Redirecting to login to fix it...', {
                    duration: 5000,
                    icon: '🔒'
                });
                setTimeout(() => {
                    supabase.auth.signOut().then(() => {
                        localStorage.clear();
                        window.location.href = '/login';
                    });
                }, 3000);
            } else {
                toast.error(error.message || 'Error updating profile');
            }
        } finally {
            setProfileLoading(false);
        }
    };

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: passwordData.newPassword
            });

            if (error) throw error;
            toast.success('Password updated successfully');
            setPasswordData({ newPassword: '', confirmPassword: '' });
        } catch (error: any) {
            console.error('Error updating password:', error);
            toast.error(error.message || 'Error updating password');
        } finally {
            setPasswordLoading(false);
        }
    };

    // Helper to get input styles that work in both light and dark modes
    const inputStyle = {
        backgroundColor: '#FFFFFF',
        color: '#1F2937',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="border-b border-white/5 pb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold premium-gradient-text tracking-tight uppercase">{t('settings.title')}</h1>
                <p className="text-white/60 mt-2 text-sm sm:text-base font-bold tracking-wide uppercase opacity-100">{t('settings.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Theme Customization */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden">
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-primary/5 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                            <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                                <Palette className="w-6 h-6" />
                            </div>
                            {t('settings.theme')}
                        </h2>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {themes.map(theme => (
                                <button
                                    key={theme.id}
                                    onClick={() => applyTheme(theme.id)}
                                    className={`group relative p-6 rounded-[2rem] border-2 transition-all duration-500 hover:scale-[1.05] active:scale-95 ${currentTheme === theme.id
                                        ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                        : 'border-white/5 bg-white/5 hover:bg-white/10 hover:border-white/20'
                                        }`}
                                >
                                    <div className="h-32 rounded-2xl mb-4 shadow-2xl overflow-hidden border border-white/10 group-hover:rotate-2 transition-transform duration-500">
                                        <div className="h-full flex flex-col">
                                            <div className="h-1/3" style={{ backgroundColor: theme.bg }}></div>
                                            <div className="h-1/3" style={{ backgroundColor: theme.secondary }}></div>
                                            <div className="h-1/3" style={{ backgroundColor: theme.primary }}></div>
                                        </div>
                                    </div>
                                    <span className={`block text-center font-black text-[10px] uppercase tracking-[0.2em] transition-colors ${currentTheme === theme.id ? 'text-white' : 'text-white/40 group-hover:text-white'}`}>
                                        {theme.name}
                                    </span>
                                    {currentTheme === theme.id && (
                                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg animate-in zoom-in duration-300">
                                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Currency Settings */}
                <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium relative overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-500">
                                <Globe className="w-6 h-6" />
                            </div>
                            Currency
                        </h2>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
                                <button
                                    key={code}
                                    onClick={() => setCurrency(code)}
                                    className={`relative p-6 rounded-3xl border transition-all duration-300 hover:scale-105 ${currency.code === code
                                        ? 'bg-emerald-500/20 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                                        }`}
                                >
                                    <div className="text-2xl mb-2 text-white">{CURRENCIES[code].symbol}</div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-white/50">{CURRENCIES[code].name}</div>
                                    {currency.code === code && (
                                        <div className="absolute top-4 right-4 w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Gym Profile - Only for Admin/Head Coach */}
                    {role && ['admin', 'head_coach'].includes(role) && (
                        <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium lg:col-span-1">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                                <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                                    <Building2 className="w-6 h-6" />
                                </div>
                                {t('settings.gymProfile')}
                            </h2>

                            <form onSubmit={handleSaveProfile} className="space-y-6">
                                <div className="space-y-6">
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2 group-focus-within:text-primary transition-colors">{t('settings.gymName')}</label>
                                        <input
                                            type="text"
                                            value={gymProfile.name}
                                            onChange={e => setGymProfile({ ...gymProfile, name: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 transition-all focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2 group-focus-within:text-primary transition-colors">{t('common.phone')}</label>
                                        <input
                                            type="text"
                                            value={gymProfile.phone}
                                            onChange={e => setGymProfile({ ...gymProfile, phone: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 transition-all focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2 group">
                                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2 group-focus-within:text-primary transition-colors">{t('settings.address')}</label>
                                        <input
                                            type="text"
                                            value={gymProfile.address}
                                            onChange={e => setGymProfile({ ...gymProfile, address: e.target.value })}
                                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white placeholder-white/20 transition-all focus:ring-4 focus:ring-primary/10 outline-none font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="bg-primary hover:bg-primary/90 text-white px-10 py-4 rounded-2xl shadow-lg shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 font-black uppercase tracking-widest text-xs min-w-[180px] group/btn overflow-hidden relative"
                                    >
                                        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                                        {loading ? (
                                            <span className="animate-pulse">Saving...</span>
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 relative z-10" />
                                                <span className="relative z-10">{t('common.save')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Subscription Plans Management - Admin Only */}
                    {role === 'admin' && (
                        <SubscriptionPlansManager />
                    )}
                </div>

                {/* Personal Account Settings - Visible to All */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* My Profile */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                            <div className="p-3 bg-secondary/20 rounded-2xl text-primary">
                                <User className="w-6 h-6" />
                            </div>
                            My Profile
                        </h2>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Display Name</label>
                                <input
                                    type="text"
                                    value={userData.full_name}
                                    onChange={e => setUserData({ ...userData, full_name: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white transition-all outline-none font-bold"
                                    placeholder="Your Name"
                                />
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2 group-focus-within:text-primary transition-colors">Email Address</label>
                                <input
                                    type="email"
                                    value={userData.email}
                                    onChange={e => setUserData({ ...userData, email: e.target.value })}
                                    className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-primary/50 text-white transition-all outline-none font-bold"
                                    placeholder="your@email.com"
                                />
                                {initialEmail && (
                                    <p className="text-[9px] text-white/20 ml-2 uppercase font-bold">Current on server: {initialEmail}</p>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={profileLoading}
                                className="w-full bg-white/5 hover:bg-white/10 text-white px-10 py-4 rounded-2xl border border-white/10 transition-all font-black uppercase tracking-widest text-[10px] hover:border-primary/30"
                            >
                                {profileLoading ? 'Saving...' : 'Update Profile'}
                            </button>

                            <div className="pt-4 border-t border-white/5">
                                <p className="text-[10px] text-white/30 text-center mb-4 uppercase font-bold tracking-tighter">Having trouble saving? Your session might be stale.</p>
                                <button
                                    type="button"
                                    onClick={() => supabase.auth.signOut().then(() => window.location.href = '/login')}
                                    className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 px-10 py-3 rounded-2xl border border-red-500/20 transition-all font-black uppercase tracking-widest text-[9px]"
                                >
                                    Fix Session (Log Out)
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Change Password */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                            <div className="p-3 bg-rose-500/20 rounded-2xl text-rose-400">
                                <Lock className="w-6 h-6" />
                            </div>
                            Change Password
                        </h2>

                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">New Password</label>
                                <div className="relative">
                                    <Key className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.newPassword}
                                        onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-rose-500/50 text-white transition-all outline-none font-bold"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2 group">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Confirm New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                                    <input
                                        type="password"
                                        required
                                        value={passwordData.confirmPassword}
                                        onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full pl-14 pr-6 py-4 rounded-2xl border border-white/10 bg-white/5 focus:bg-white/10 focus:border-rose-500/50 text-white transition-all outline-none font-bold"
                                        placeholder="••••••••"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={passwordLoading}
                                className="w-full bg-rose-500 hover:bg-rose-600 text-white px-10 py-4 rounded-2xl shadow-lg shadow-rose-500/20 transition-all font-black uppercase tracking-widest text-[10px]"
                            >
                                {passwordLoading ? 'Updating...' : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div >
    );
}

function SubscriptionPlansManager() {
    const { t } = useTranslation();
    const { currency } = useCurrency();
    const queryClient = useQueryClient();
    const { data: plans, isLoading } = useSubscriptionPlans();
    const addPlanMutation = useAddPlan();
    const deletePlanMutation = useDeletePlan();
    const [newPlan, setNewPlan] = useState({ name: '', duration_months: 1, price: 0 });
    const [isAdding, setIsAdding] = useState(false);
    const [planToDelete, setPlanToDelete] = useState<string | null>(null);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPlan.name) return;
        try {
            await addPlanMutation.mutateAsync(newPlan);
            toast.success('Plan added successfully');
            setNewPlan({ name: '', duration_months: 1, price: 0 });
            setIsAdding(false);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to add plan:', error);
            toast.error(`Error: ${error.message || 'Failed to add plan'}`);
        }
    };

    const handleDelete = async () => {
        if (!planToDelete) return;
        try {
            await deletePlanMutation.mutateAsync(planToDelete);
            toast.success('Plan deleted');
            setPlanToDelete(null);
            queryClient.invalidateQueries({ queryKey: ['subscription_plans'] });
        } catch (error: any) {
            console.error('Failed to delete plan:', error);
            toast.error(`Error: ${error.message || 'Failed to delete plan'}`);
            setPlanToDelete(null);
        }
    };

    return (
        <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium lg:col-span-1">
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4">
                    <div className="p-3 bg-primary/20 rounded-2xl text-primary">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    Subscription Plans
                </h2>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="p-3 bg-primary/10 text-primary hover:bg-primary/20 rounded-2xl transition-all"
                >
                    <Plus className={`w-6 h-6 transition-transform ${isAdding ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {isAdding && (
                <form onSubmit={handleAdd} className="mb-10 p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-6 animate-in zoom-in duration-300">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Plan Name</label>
                        <input
                            type="text"
                            placeholder="e.g. Season Pass"
                            value={newPlan.name}
                            onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
                            className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Months</label>
                            <input
                                type="number"
                                min="1"
                                value={newPlan.duration_months}
                                onChange={e => setNewPlan({ ...newPlan, duration_months: parseInt(e.target.value) })}
                                className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-2">Price (Optional)</label>
                            <input
                                type="number"
                                value={newPlan.price}
                                onChange={e => setNewPlan({ ...newPlan, price: parseFloat(e.target.value) })}
                                className="w-full px-6 py-4 rounded-2xl border border-white/10 bg-white/5 text-white outline-none focus:border-primary/50 transition-all font-bold"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-primary text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-primary/20"
                    >
                        Save New Plan
                    </button>
                </form>
            )}

            <div className="space-y-4">
                {isLoading ? (
                    <div className="py-10 text-center text-white/20 animate-pulse uppercase font-black text-[10px] tracking-widest">Loading Plans...</div>
                ) : plans?.length === 0 ? (
                    <div className="py-10 text-center text-white/20 uppercase font-black text-[10px] tracking-widest">No custom plans yet</div>
                ) : (
                    plans?.map(plan => (
                        <div key={plan.id} className="flex items-center justify-between p-6 bg-white/5 rounded-[2rem] border border-white/5 group hover:border-primary/30 transition-all animate-in slide-in-from-left duration-500">
                            <div>
                                <div className="text-white font-black uppercase tracking-wide">{plan.name}</div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-white/20 mt-1">
                                    {plan.duration_months} {plan.duration_months === 1 ? 'Month' : 'Months'} • {plan.price > 0 ? `${plan.price} ${currency.code}` : 'Free Tier'}
                                </div>
                            </div>
                            <button
                                onClick={() => setPlanToDelete(plan.id)}
                                className="p-3 text-white/20 hover:text-rose-400 hover:bg-rose-400/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                )}
            </div>
            <p className="mt-8 text-[10px] font-bold text-white/20 uppercase leading-relaxed px-2">
                Note: Changing plans will not affect existing gymnasts. New enrollments will see the updated options.
            </p>

            {/* Custom Premium Modal */}
            {planToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card max-w-md w-full p-10 rounded-[2.5rem] border border-white/10 shadow-2xl relative animate-in zoom-in duration-300">
                        <div className="flex flex-col items-center text-center">
                            <div className="p-5 bg-rose-500/20 rounded-full text-rose-500 mb-6 animate-pulse">
                                <AlertTriangle className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-4">Are you sure?</h3>
                            <p className="text-white/40 font-bold uppercase text-[10px] tracking-widest leading-relaxed mb-10">
                                You are about to delete this plan. Gymnasts currently enrolled in this plan will not be affected, but new gymnasts won't be able to select it.
                            </p>
                            <div className="flex gap-4 w-full">
                                <button
                                    onClick={() => setPlanToDelete(null)}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-white/5 text-white/60 font-black uppercase tracking-widest text-[10px] hover:bg-white/10 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="flex-1 px-6 py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-rose-500/20 hover:bg-rose-600 transition-all hover:scale-105 active:scale-95"
                                >
                                    Yes, Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
