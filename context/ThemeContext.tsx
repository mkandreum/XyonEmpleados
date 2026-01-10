import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export type ThemeColor = 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'slate';

interface ThemeContextType {
    isDark: boolean;
    toggleTheme: () => void;
    themeColor: ThemeColor;
    setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isDark, setIsDark] = useState(false);
    const [themeColor, setThemeColorState] = useState<ThemeColor>('blue');

    // Load theme from local storage when user changes
    useEffect(() => {
        const themeKey = user ? `theme_${user.id}` : 'theme_guest';
        const colorKey = user ? `color_${user.id}` : 'color_guest';

        const storedTheme = localStorage.getItem(themeKey);
        const storedColor = localStorage.getItem(colorKey);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

        if (storedTheme) {
            setIsDark(storedTheme === 'dark');
        } else {
            setIsDark(prefersDark);
        }

        if (storedColor) {
            setThemeColorState(storedColor as ThemeColor);
        }
    }, [user?.id]);

    // Apply theme to HTML and BODY elements
    useEffect(() => {
        const root = document.documentElement;

        // Apply Dark Mode
        if (isDark) {
            root.classList.add('dark');
            document.body.classList.add('dark');
        } else {
            root.classList.remove('dark');
            document.body.classList.remove('dark');
        }

        // Apply Color Theme
        root.setAttribute('data-theme', themeColor);

    }, [isDark, themeColor]);

    const toggleTheme = () => {
        const newTheme = !isDark;
        const key = user ? `theme_${user.id}` : 'theme_guest';
        localStorage.setItem(key, newTheme ? 'dark' : 'light');
        setIsDark(newTheme);
    };

    const setThemeColor = (color: ThemeColor) => {
        const key = user ? `color_${user.id}` : 'color_guest';
        localStorage.setItem(key, color);
        setThemeColorState(color);
    };

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme, themeColor, setThemeColor }}>
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
