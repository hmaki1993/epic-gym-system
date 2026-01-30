
export const applyThemeStyles = (themeId: string) => {
    try {
        const root = document.documentElement;

        if (themeId === 'dark') {
            root.style.setProperty('--color-primary', '#6366f1');
            root.style.setProperty('--color-primary-foreground', '#ffffff');
            root.style.setProperty('--color-secondary', '#1e293b');
            root.style.setProperty('--color-background', '#0f172a');
            root.style.setProperty('--color-surface', '#1e293b');
            root.style.setProperty('color', '#f8fafc');
        } else if (themeId === 'forest') {
            root.style.setProperty('--color-primary', '#10b981');
            root.style.setProperty('--color-secondary', '#064e3b');
            root.style.setProperty('--color-background', '#ecfdf5');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('color', '#1f2937');
        } else if (themeId === 'royal') {
            root.style.setProperty('--color-primary', '#d97706');
            root.style.setProperty('--color-secondary', '#581c87');
            root.style.setProperty('--color-background', '#faf5ff');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('color', '#1f2937');
        } else if (themeId === 'berry') {
            root.style.setProperty('--color-primary', '#db2777');
            root.style.setProperty('--color-secondary', '#881337');
            root.style.setProperty('--color-background', '#fdf2f8');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('color', '#1f2937');
        } else if (themeId === 'nature') {
            root.style.setProperty('--color-primary', '#65a30d');
            root.style.setProperty('--color-secondary', '#1a2e05');
            root.style.setProperty('--color-background', '#f7fee7');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('color', '#1f2937');
        } else if (themeId === 'ember') {
            root.style.setProperty('--color-primary', '#ea580c');
            root.style.setProperty('--color-secondary', '#431407');
            root.style.setProperty('--color-background', '#fff7ed');
            root.style.setProperty('--color-surface', '#ffffff');
            root.style.setProperty('color', '#1f2937');
        } else {
            // Default (Reset)
            root.style.removeProperty('--color-primary');
            root.style.removeProperty('--color-secondary');
            root.style.removeProperty('--color-background');
            root.style.removeProperty('--color-surface');
            root.style.removeProperty('color');
        }
    } catch (e) {
        console.error('Error applying theme:', e);
    }
};

export const initializeTheme = () => {
    try {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        applyThemeStyles(savedTheme);
    } catch (error) {
        console.error('Failed to load theme:', error);
        applyThemeStyles('dark');
    }
};
