import { useState, useEffect } from 'react';
import { Save, Building2, Palette, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import { applyThemeStyles } from '../utils/theme';

export default function Settings() {
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

    const themes = [
        { id: 'midnight', name: 'Midnight Blue', primary: '#818cf8', secondary: '#1e293b', bg: '#0f172a' },
        { id: 'obsidian', name: 'Pure Black', primary: '#a78bfa', secondary: '#18181b', bg: '#000000' },
        { id: 'emerald', name: 'Dark Emerald', primary: '#34d399', secondary: '#1e3a2f', bg: '#0a1f1a' },
        { id: 'crimson', name: 'Dark Crimson', primary: '#fb7185', secondary: '#3f1d28', bg: '#1a0a0f' },
        { id: 'amber', name: 'Dark Amber', primary: '#fbbf24', secondary: '#3f2f1d', bg: '#1a140a' },
        { id: 'ocean', name: 'Deep Ocean', primary: '#22d3ee', secondary: '#1e3a3f', bg: '#0a1a1f' },
        { id: 'royal', name: 'Royal Purple', primary: '#c084fc', secondary: '#2e1f3f', bg: '#14091a' },
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
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800));

        // Save to LocalStorage
        localStorage.setItem('gymProfile', JSON.stringify(gymProfile));

        // Dispatch a custom event so DashboardLayout knows to update immediately
        window.dispatchEvent(new Event('gymProfileUpdated'));

        toast.success(t('common.saveSuccess'), {
            style: {
                border: '1px solid var(--color-primary)',
            }
        });
        setLoading(false);
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Language Settings */}
                    <div className="glass-card p-10 rounded-[3rem] border border-white/10 shadow-premium flex flex-col">
                        <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-4 mb-8">
                            <div className="p-3 bg-accent/20 rounded-2xl text-accent">
                                <Globe className="w-6 h-6" />
                            </div>
                            {t('settings.language')}
                        </h2>

                        <div className="flex gap-6 mt-auto">
                            <button
                                onClick={() => {
                                    i18n.changeLanguage('ar');
                                    document.dir = 'rtl';
                                }}
                                className={`flex-1 p-6 rounded-[2rem] border-2 transition-all duration-500 hover:scale-105 active:scale-95 flex flex-col items-center gap-2 ${i18n.language === 'ar'
                                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <span className={`text-2xl font-black ${i18n.language === 'ar' ? 'text-white' : 'text-white/40'}`}>العربية</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Arabic</span>
                            </button>
                            <button
                                onClick={() => {
                                    i18n.changeLanguage('en');
                                    document.dir = 'ltr';
                                }}
                                className={`flex-1 p-6 rounded-[2rem] border-2 transition-all duration-500 hover:scale-105 active:scale-95 flex flex-col items-center gap-2 ${i18n.language === 'en'
                                    ? 'border-primary bg-primary/10 shadow-lg shadow-primary/20'
                                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                                    }`}
                            >
                                <span className={`text-2xl font-black ${i18n.language === 'en' ? 'text-white' : 'text-white/40'}`}>English</span>
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20">English</span>
                            </button>
                        </div>
                    </div>

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
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <Save className="w-5 h-5 relative z-10" />
                                                <span className="relative z-10">{t('common.save')}</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
