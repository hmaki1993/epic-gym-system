import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export interface GymSettings {
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    font_family: string;
    font_scale: number;
    border_radius: string;
    glass_opacity: number;
    surface_color: string;
    search_icon_color?: string;
    search_bg_color?: string;
    search_border_color?: string;
    search_text_color?: string;
    hover_color?: string;
    hover_border_color?: string;
    input_bg_color?: string;
    clock_position?: 'dashboard' | 'header' | 'none';
    clock_integration?: boolean;
    weather_integration?: boolean;
    language?: string;
}

export const applySettingsToRoot = (settings: GymSettings) => {
    console.log('Applying theme settings to root:', settings);
    const root = document.documentElement;

    // Helper to calculate luminance
    const getLuminance = (hex: string) => {
        try {
            if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
                console.warn('Invalid hex color provided to getLuminance:', hex);
                return 0; // Default to dark luminance
            }
            const c = hex.substring(1);
            const rgb = parseInt(c, 16);
            if (isNaN(rgb)) {
                console.warn('Could not parse hex color:', hex);
                return 0;
            }
            const r = (rgb >> 16) & 0xff;
            const g = (rgb >> 8) & 0xff;
            const b = (rgb >> 0) & 0xff;

            const uR = r / 255;
            const uG = g / 255;
            const uB = b / 255;

            // sRGB luminance
            const lum = 0.2126 * (uR <= 0.03928 ? uR / 12.92 : Math.pow((uR + 0.055) / 1.055, 2.4)) +
                0.7152 * (uG <= 0.03928 ? uG / 12.92 : Math.pow((uG + 0.055) / 1.055, 2.4)) +
                0.0722 * (uB <= 0.03928 ? uB / 12.92 : Math.pow((uB + 0.055) / 1.055, 2.4));

            return lum;
        } catch (e) {
            console.error('Error calculating luminance:', e);
            return 0;
        }
    };

    // Colors
    root.style.setProperty('--color-primary', settings.primary_color);
    root.style.setProperty('--color-secondary', settings.secondary_color);
    root.style.setProperty('--color-background', settings.secondary_color);
    root.style.setProperty('--color-accent', settings.accent_color || '#34d399');
    root.style.setProperty('--color-surface', settings.surface_color || 'rgba(18, 46, 52, 0.7)');
    root.style.setProperty('--color-hover', settings.hover_color || 'rgba(16, 185, 129, 0.8)');
    root.style.setProperty('--color-hover-border', settings.hover_border_color || 'rgba(16, 185, 129, 0.3)');
    root.style.setProperty('--color-input-bg', settings.input_bg_color || '#0f172a');

    // Dynamic Text Colors based on background luminance
    const bgLuminance = getLuminance(settings.secondary_color);
    const isLightMode = bgLuminance > 0.5;

    if (isLightMode) {
        // Light Mode Text
        root.style.setProperty('--color-text-base', '#0f172a'); // Dark Slate
        root.style.setProperty('--color-text-muted', '#64748b'); // Slate 500
        root.style.setProperty('color-scheme', 'light');
    } else {
        // Dark Mode Text
        root.style.setProperty('--color-text-base', '#f1f5f9'); // Slate 100
        root.style.setProperty('--color-text-muted', 'rgba(255, 255, 255, 0.6)');
        root.style.setProperty('color-scheme', 'dark');
    }

    // Search Specifics
    root.style.setProperty('--color-search-icon', settings.search_icon_color || 'rgba(255, 255, 255, 0.4)');
    root.style.setProperty('--color-search-bg', settings.search_bg_color || 'rgba(255, 255, 255, 0.05)');
    root.style.setProperty('--color-search-border', settings.search_border_color || 'rgba(255, 255, 255, 0.1)');
    root.style.setProperty('--color-search-text', settings.search_text_color || '#ffffff');
    root.style.setProperty('--color-search-placeholder', settings.search_text_color ? `${settings.search_text_color}40` : 'rgba(255, 255, 255, 0.2)');

    // Fonts
    if (settings.font_family !== 'Cairo') {
        root.style.setProperty('font-family', `"${settings.font_family}", sans-serif`);
    } else {
        root.style.removeProperty('font-family');
    }

    // Scale
    root.style.setProperty('font-size', `${settings.font_scale * 100}%`);

    // Styles
    root.style.setProperty('--radius', settings.border_radius || '1.5rem');
    root.style.setProperty('--glass-opacity', settings.glass_opacity?.toString() || '0.6');
};

interface ThemeContextType {
    settings: GymSettings;
    updateSettings: (newSettings: Partial<GymSettings>) => Promise<void>;
    isLoading: boolean;
    resetToDefaults: () => Promise<void>;
    userProfile: { id: string; email: string; full_name: string | null; role: string | null; avatar_url: string | null } | null;
}

export const defaultSettings: GymSettings = {
    primary_color: '#10b981',
    secondary_color: '#0E1D21',
    accent_color: '#34d399',
    font_family: 'Cairo',
    font_scale: 1,
    border_radius: '1.5rem',
    glass_opacity: 0.6,
    surface_color: 'rgba(18, 46, 52, 0.7)',
    search_icon_color: 'rgba(255, 255, 255, 0.4)',
    search_bg_color: 'rgba(255, 255, 255, 0.05)',
    search_border_color: 'rgba(255, 255, 255, 0.1)',
    search_text_color: '#ffffff',
    hover_color: 'rgba(16, 185, 129, 0.8)',
    hover_border_color: 'rgba(16, 185, 129, 0.3)',
    input_bg_color: '#0f172a',
    clock_position: 'dashboard',
    clock_integration: true,
    weather_integration: true,
    language: 'en'
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<GymSettings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);
    const [userProfile, setUserProfile] = useState<ThemeContextType['userProfile']>(null);

    const { i18n } = useTranslation();

    useEffect(() => {
        applySettingsToRoot(settings);
    }, [settings]);

    useEffect(() => {
        if (settings.language && i18n.language !== settings.language) {
            i18n.changeLanguage(settings.language);
            document.dir = settings.language === 'ar' ? 'rtl' : 'ltr';
        }
    }, [settings.language, i18n]);

    useEffect(() => {
        // 1. Auth State Listener: Critical for Privacy
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 ThemeContext: Auth Event:', event);
            if (event === 'SIGNED_IN' || event === 'USER_UPDATED' || event === 'INITIAL_SESSION') {
                fetchSettings();
            } else if (event === 'SIGNED_OUT') {
                console.log('🔐 ThemeContext: User signed out, resetting to defaults...');
                setSettings(defaultSettings);
            }
        });

        // 2. Initial Fetch
        fetchSettings();

        // 3. Keep profile synced if updated elsewhere
        const handleProfileUpdate = () => {
            fetchSettings();
        };
        window.addEventListener('userProfileUpdated', handleProfileUpdate);

        return () => {
            subscription.unsubscribe();
            window.removeEventListener('userProfileUpdated', handleProfileUpdate);
        };
    }, []);

    const fetchSettings = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();

            console.log('📥 LOADING SETTINGS FOR USER:', user?.id, user?.email);

            // 1. Get Global Defaults
            const { data: globalData, error: globalError } = await supabase
                .from('gym_settings')
                .select('*')
                .maybeSingle();

            if (globalError) {
                console.error('📥 Global settings fetch error:', globalError);
            }

            let finalSettings = { ...defaultSettings };
            if (globalData) {
                console.log('📥 Loaded global defaults from gym_settings');
                // Filter out nulls from globalData
                const filteredGlobal = Object.fromEntries(
                    Object.entries(globalData).filter(([_, v]) => v !== null)
                );
                finalSettings = { ...finalSettings, ...filteredGlobal };
            }

            // 2. Overlay User Personal Settings & Fetch Profile
            if (user) {
                // Fetch user settings and profile in parallel
                const [userSettingsRes, profileRes] = await Promise.all([
                    supabase
                        .from('user_settings')
                        .select('*')
                        .eq('user_id', user.id)
                        .maybeSingle(),
                    supabase
                        .from('profiles')
                        .select('full_name, role, avatar_url')
                        .eq('id', user.id)
                        .maybeSingle()
                ]);

                if (userSettingsRes.error) console.warn('📥 User settings fetch error:', userSettingsRes.error);
                if (profileRes.error) console.warn('📥 User profile fetch error:', profileRes.error);

                if (userSettingsRes.data) {
                    console.log('📥 Found user personal settings:', userSettingsRes.data);
                    // Filter out nulls from user settings
                    const filteredUser = Object.fromEntries(
                        Object.entries(userSettingsRes.data).filter(([_, v]) => v !== null)
                    );
                    finalSettings = { ...finalSettings, ...filteredUser };
                }

                if (profileRes.data) {
                    console.log('📥 Found user profile:', profileRes.data);
                    setUserProfile({
                        id: user.id,
                        email: user.email || '',
                        ...profileRes.data
                    });
                } else {
                    // Fallback for cases where profile doesn't exist yet but user is logged in (e.g. migration)
                    const defaultRole = (user.email?.startsWith('admin@') || user.email?.startsWith('amin@')) ? 'admin' : 'reception';
                    setUserProfile({
                        id: user.id,
                        email: user.email || '',
                        full_name: null,
                        role: defaultRole,
                        avatar_url: null
                    });
                }
            } else {
                setUserProfile(null);
            }

            console.log('📥 FINAL SETTINGS LOADED:', finalSettings);
            setSettings(finalSettings);

            // 3. Setup Realtime for THIS USER specifically
            if (user) {
                console.log('🔔 Subscribing to realtime updates for user:', user.id);
                const channelId = `user_settings_${user.id}`;
                supabase.removeChannel(supabase.channel(channelId)); // Cleanup previous if exists

                supabase
                    .channel(channelId)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'user_settings',
                            filter: `user_id=eq.${user.id}`
                        },
                        (payload) => {
                            console.log('🔔 Realtime update for current user:', user.id);
                            setSettings(prev => ({ ...prev, ...(payload.new as any) }));
                        }
                    )
                    .subscribe();
            }

        } catch (error) {
            console.error('Error fetching theme settings:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const updateSettings = async (newSettings: Partial<GymSettings>) => {
        // Optimistic update
        setSettings(prev => ({ ...prev, ...newSettings }));

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('User not authenticated');

            // Sanitize payload
            const payload: any = { user_id: user.id };
            const keys: (keyof GymSettings)[] = [
                'primary_color', 'secondary_color', 'accent_color', 'font_family',
                'font_scale', 'border_radius', 'glass_opacity', 'surface_color',
                'search_icon_color', 'search_bg_color', 'search_border_color', 'search_text_color',
                'hover_color', 'hover_border_color', 'input_bg_color', 'clock_position',
                'clock_integration', 'weather_integration', 'language'
            ];

            keys.forEach(key => {
                if (key in newSettings) {
                    payload[key] = newSettings[key];
                }
            });

            console.log('💾 SAVING SETTINGS FOR USER:', user.id, user.email);
            console.log('💾 PAYLOAD:', payload);
            console.log('💾 TARGET TABLE: user_settings');

            const { error } = await supabase
                .from('user_settings')
                .upsert(payload);

            if (error) {
                console.error('💾 SAVE FAILED:', error);
                throw error;
            }

            console.log('💾 SAVE SUCCESS - Settings saved to user_settings');

            // Verify the save
            const { data: verification } = await supabase
                .from('user_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            console.log('💾 VERIFICATION - Data in DB:', verification);

            toast.success('Settings saved privately');
        } catch (error: any) {
            console.error('Error updating theme:', error);
            toast.error(`Failed to update settings: ${error.message || 'Unknown error'}`);
            fetchSettings(); // Revert to server state on failure
        }
    };

    const resetToDefaults = async () => {
        await updateSettings(defaultSettings);
    };

    return (
        <ThemeContext.Provider value={{ settings, updateSettings, isLoading, resetToDefaults, userProfile }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
