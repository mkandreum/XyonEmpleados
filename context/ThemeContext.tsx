import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isDark, setIsDark] = useState(false);

    // Load theme from local storage when user changes
    useEffect(() => {
        const key = user ? `theme_${user.id}` : 'theme_guest';
        const storedTheme = localStorage.getItem(key);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        console.log(`%c [ThemeContext] Loading theme for: ${key}`, 'color: #3b82f6; font-weight: bold', { storedTheme, prefersDark });

        if (storedTheme) {
            setIsDark(storedTheme === 'dark');
        } else {
            setIsDark(prefersDark);
        }
    }, [user?.id]); // Use user.id to avoid unnecessary re-runs

    // Apply theme to HTML and BODY elements
    useEffect(() => {
        console.log(`%c [ThemeContext] Applying theme. isDark: ${isDark}`, 'color: #8b5cf6; font-weight: bold');
        const root = document.documentElement;

        if (isDark) {
            root.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            document.body.classList.remove('dark');
        }

        // Extra verification log
        console.log('[ThemeContext] DOM verification - html.dark:', root.classList.contains('dark'), 'body.dark:', document.body.classList.contains('dark'));

        // Global debug helper for the user
        (window as any).__theme_debug = {
            isDark,
            htmlClasses: root.className,
            bodyClasses: document.body.className,
            timestamp: new Date().toISOString()
        };
    }, [isDark]);

    const toggleTheme = () => {
        const newTheme = !isDark;
        console.log(`%c [ThemeContext] USER ACTION: Toggling theme to: ${newTheme ? 'dark' : 'light'}`, 'color: #ef4444; font-weight: bold');

        const key = user ? `theme_${user.id}` : 'theme_guest';
        localStorage.setItem(key, newTheme ? 'dark' : 'light');
        setIsDark(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
