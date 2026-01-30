import { useState, useEffect } from 'react';
import { Save, Building2, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { applyThemeStyles } from '../utils/theme';

export default function Settings() {
    const { t } = useTranslation();
    const [gymProfile, setGymProfile] = useState(() => {
        const saved = localStorage.getItem('gymProfile');
        return saved ? JSON.parse(saved) : {
            name: 'Epic Gym Academy',
            phone: '+20 123 456 7890',
            address: 'Cairo, Egypt',
        };
    });

    const [loading, setLoading] = useState(false);

    const themes = [
        { id: 'default', name: 'Epic Default', primary: '#FF7F50', secondary: '#4A5D85' },
        { id: 'dark', name: 'Midnight Pro', primary: '#6366f1', secondary: '#1e293b' },
        { id: 'forest', name: 'Forest Elite', primary: '#10b981', secondary: '#064e3b' },
        { id: 'royal', name: 'Royal Gold', primary: '#d97706', secondary: '#581c87' },
        { id: 'berry', name: 'Berry Blast', primary: '#db2777', secondary: '#881337' },
        { id: 'nature', name: 'Nature Calm', primary: '#65a30d', secondary: '#1a2e05' },
        { id: 'ember', name: 'Ember Glow', primary: '#ea580c', secondary: '#431407' },
    ];



    const [currentTheme, setCurrentTheme] = useState(() => localStorage.getItem('theme') || 'dark');

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
        backgroundColor: 'rgba(255, 255, 255, 0.05)', // Slight white tint for dark mode, subtle for light
        color: 'inherit',
        borderColor: 'rgba(128, 128, 128, 0.3)'
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold" style={{ color: 'var(--color-primary)' }}>{t('settings.title')}</h1>
                <p className="opacity-70 mt-1">{t('settings.subtitle')}</p>
            </div>

            {/* Theme Customization */}
            <div
                className="rounded-2xl p-6 shadow-sm border border-gray-100/10 transition-colors duration-300"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}>
                    <Palette className="w-5 h-5" />
                    {t('settings.theme')}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {themes.map(theme => (
                        <button
                            key={theme.id}
                            onClick={() => applyTheme(theme.id)}
                            className={`group relative p-4 rounded-xl border-2 transition-all hover:scale-105 ${currentTheme === theme.id
                                ? 'border-primary ring-2 ring-primary/20'
                                : 'border-transparent bg-black/5 hover:bg-black/10'
                                }`}
                        >
                            <div className="h-20 rounded-lg mb-3 shadow-sm flex flex-col overflow-hidden">
                                <div className="h-full flex-1" style={{ backgroundColor: theme.secondary }}></div>
                                <div className="h-1/3" style={{ backgroundColor: theme.primary }}></div>
                            </div>
                            <span className={`block text-center font-medium ${currentTheme === theme.id ? 'text-primary' : 'opacity-70'}`}>
                                {t(`settings.themes.${theme.id}`, theme.name)}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Gym Profile */}
            <div
                className="rounded-2xl p-6 shadow-sm border border-gray-100/10 transition-colors duration-300"
                style={{ backgroundColor: 'var(--color-surface)' }}
            >
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--color-secondary)' }}>
                    <Building2 className="w-5 h-5" />
                    {t('settings.gymProfile')}
                </h2>

                <form onSubmit={handleSaveProfile} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('settings.gymName')}</label>
                            <input
                                type="text"
                                value={gymProfile.name}
                                onChange={e => setGymProfile({ ...gymProfile, name: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                style={inputStyle}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('common.phone')}</label>
                            <input
                                type="text"
                                value={gymProfile.phone}
                                onChange={e => setGymProfile({ ...gymProfile, phone: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                style={inputStyle}
                            />
                        </div>
                        <div className="col-span-full space-y-1">
                            <label className="text-sm font-medium opacity-80">{t('settings.address')}</label>
                            <input
                                type="text"
                                value={gymProfile.address}
                                onChange={e => setGymProfile({ ...gymProfile, address: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="bg-primary hover:bg-primary/90 text-white px-8 py-2.5 rounded-xl shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 font-medium"
                        >
                            {loading ? t('common.loading') : (
                                <>
                                    <Save className="w-4 h-4" />
                                    {t('common.save')}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
