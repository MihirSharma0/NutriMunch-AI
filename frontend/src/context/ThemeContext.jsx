import React, { createContext, useContext, useState, useEffect } from 'react';

export const ThemeContext = createContext({
    theme: 'dark',
    toggleTheme: () => {},
    setTheme: () => {},
    isDark: true
});

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(() => {
        try {
            const saved = localStorage.getItem('nutrimunch_theme');
            if (saved === 'light' || saved === 'dark') {
                return saved;
            }
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
                return 'light';
            }
        } catch {
            // ignore localStorage / matchMedia errors
        }
        return 'dark';
    });

    useEffect(() => {
        try {
            localStorage.setItem('nutrimunch_theme', theme);
        } catch (e) {
            console.error('Failed to save theme in localStorage', e);
        }

        const root = document.documentElement;
        if (theme === 'light') {
            root.classList.remove('dark');
            root.classList.add('light');
            root.setAttribute('data-theme', 'light');
            root.style.colorScheme = 'light';
        } else {
            root.classList.remove('light');
            root.classList.add('dark');
            root.setAttribute('data-theme', 'dark');
            root.style.colorScheme = 'dark';
        }
    }, [theme]);

    const toggleTheme = () => {
        setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    const setTheme = (newTheme) => {
        if (newTheme === 'light' || newTheme === 'dark') {
            setThemeState(newTheme);
        }
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, isDark: theme === 'dark' }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => useContext(ThemeContext);

