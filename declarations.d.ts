// Custom declarations for local contexts or assets can go here if needed.
// Shadowing declarations of node_modules packages have been removed to use official typings.

declare module '*/AuthContext' {
    export const useAuth: () => {
        user: any;
        login: (credentials: any) => Promise<void>;
        logout: () => void;
        isAuthenticated: boolean;
    };
}

declare module '*/ThemeContext' {
    export const useTheme: () => {
        theme: 'light' | 'dark';
        isDark: boolean;
        toggleTheme: () => void;
    };
}

