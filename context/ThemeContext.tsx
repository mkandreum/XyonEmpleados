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
        if (user) {
            const storedTheme = localStorage.getItem(`theme_${user.id}`);
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

            // If explicit setting exists, use it. Otherwise default to system preference or false.
            if (storedTheme) {
                setIsDark(storedTheme === 'dark');
            } else {
                setIsDark(prefersDark);
            }
        } else {
            // Default for non-logged in (e.g. login page)
            setIsDark(false);
        }
    }, [user]);

    // Apply theme to HTML element
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDark]);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        if (user) {
            localStorage.setItem(`theme_${user.id}`, newTheme ? 'dark' : 'light');
        }
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
