import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { User } from '../types';
import { authService } from '../services/api';
import { ensurePushSubscription, clearPushSubscription } from '../services/pushClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUser = authService.getCurrentUser();

    if (storedUser && token) {
      // Validate token is not expired before trusting stored user
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (payload.exp && (payload.exp * 1000) > Date.now()) {
            setUser(storedUser);
          } else {
            // Token expired - clear stored data
            console.warn('Stored token is expired, clearing session');
            authService.logout();
          }
        } else {
          authService.logout();
        }
      } catch {
        // Invalid token format - clear
        authService.logout();
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await authService.login(email, password);
      // Ensure date strings are handled if needed, for now exact match
      setUser(data.user);
    } catch (error) {
      console.error("Login failed", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    authService.logout();
    clearPushSubscription();
    setUser(null);
  };

  useEffect(() => {
    if (!user) return;

    ensurePushSubscription().catch((err) => {
      console.warn('Push subscription failed or skipped:', err);
    });
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};