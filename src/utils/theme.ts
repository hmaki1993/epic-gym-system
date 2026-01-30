
export const applyThemeStyles = (themeId: string) => {
    try {
        const root = document.documentElement;

        if (themeId === 'midnight') {
            // Deep Dark Blue - Professional & Elegant
            root.style.setProperty('--color-primary', '#818cf8');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#1e293b');
            root.style.setProperty('--color-background', '#0f172a');
            root.style.setProperty('--color-surface', '#1e293b');
            root.style.setProperty('color', '#f1f5f9');
        } else if (themeId === 'obsidian') {
            // Pure Black - OLED Friendly
            root.style.setProperty('--color-primary', '#a78bfa');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#18181b');
            root.style.setProperty('--color-background', '#000000');
            root.style.setProperty('--color-surface', '#18181b');
            root.style.setProperty('color', '#fafafa');
        } else if (themeId === 'emerald') {
            // Dark Green - Modern & Fresh
            root.style.setProperty('--color-primary', '#34d399');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#1e3a2f');
            root.style.setProperty('--color-background', '#0a1f1a');
            root.style.setProperty('--color-surface', '#1e3a2f');
            root.style.setProperty('color', '#d1fae5');
        } else if (themeId === 'crimson') {
            // Dark Red - Bold & Powerful
            root.style.setProperty('--color-primary', '#fb7185');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#3f1d28');
            root.style.setProperty('--color-background', '#1a0a0f');
            root.style.setProperty('--color-surface', '#3f1d28');
            root.style.setProperty('color', '#fecdd3');
        } else if (themeId === 'amber') {
            // Dark Orange - Warm & Inviting
            root.style.setProperty('--color-primary', '#fbbf24');
            root.style.setProperty('--color-primary-foreground', '#000000');
            root.style.setProperty('--color-secondary', '#3f2f1d');
            root.style.setProperty('--color-background', '#1a140a');
            root.style.setProperty('--color-surface', '#3f2f1d');
            root.style.setProperty('color', '#fef3c7');
        } else if (themeId === 'ocean') {
            // Dark Cyan - Cool & Calm
            root.style.setProperty('--color-primary', '#22d3ee');
            root.style.setProperty('--color-primary-foreground', '#000000');
            root.style.setProperty('--color-secondary', '#1e3a3f');
            root.style.setProperty('--color-background', '#0a1a1f');
            root.style.setProperty('--color-surface', '#1e3a3f');
            root.style.setProperty('color', '#cffafe');
        } else if (themeId === 'royal') {
            // Dark Purple - Luxurious & Premium
            root.style.setProperty('--color-primary', '#c084fc');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#2e1f3f');
            root.style.setProperty('--color-background', '#14091a');
            root.style.setProperty('--color-surface', '#2e1f3f');
            root.style.setProperty('color', '#f3e8ff');
        } else {
            // Default Midnight
            root.style.setProperty('--color-primary', '#818cf8');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#1e293b');
            root.style.setProperty('--color-background', '#0f172a');
            root.style.setProperty('--color-surface', '#1e293b');
            root.style.setProperty('color', '#f1f5f9');
        }
    } catch (e) {
        console.error('Error applying theme:', e);
    }
};

export const initializeTheme = () => {
    try {
        const savedTheme = localStorage.getItem('theme') || 'midnight';
        applyThemeStyles(savedTheme);
    } catch (error) {
        console.error('Failed to load theme:', error);
        applyThemeStyles('midnight');
    }
};
