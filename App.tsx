import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { UnifiedLayout } from './components/UnifiedLayout'; // New Unified Layout
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { PayrollPage } from './pages/Payroll';
import { VacationsPage } from './pages/Vacations';
import { AbsencesPage } from './pages/Absences';
import { CalendarPage } from './pages/Calendar';
import { NewsPage } from './pages/News';
import { ProfilePage } from './pages/Profile';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';

// Lazy load admin pages
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsers = lazy(() => import('./pages/admin/Users').then(m => ({ default: m.AdminUsers })));
const AdminVacations = lazy(() => import('./pages/admin/Vacations').then(m => ({ default: m.AdminVacations })));
const AdminSettings = lazy(() => import('./pages/admin/Settings').then(m => ({ default: m.AdminSettings })));
const AdminNews = lazy(() => import('./pages/admin/News').then(m => ({ default: m.AdminNews })));
const AdminEvents = lazy(() => import('./pages/admin/Events').then(m => ({ default: m.AdminEvents })));
const AdminPayrolls = lazy(() => import('./pages/admin/Payrolls').then(m => ({ default: m.AdminPayrolls })));
const AdminBenefits = lazy(() => import('./pages/admin/Benefits').then(m => ({ default: m.AdminBenefits })));
const AdminFichajes = lazy(() => import('./pages/admin/Fichajes').then(m => ({ default: m.AdminFichajes })));

// Lazy load manager pages
const TeamRequests = lazy(() => import('./pages/manager/TeamRequests').then(m => ({ default: m.TeamRequests })));
const TeamCalendar = lazy(() => import('./pages/manager/TeamCalendar').then(m => ({ default: m.TeamCalendar })));
const ManagerFichajes = lazy(() => import('./pages/manager/Fichajes').then(m => ({ default: m.ManagerFichajes })));


const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <UnifiedLayout>{children}</UnifiedLayout>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
    return (
        <UnifiedLayout>
            <Suspense fallback={<div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>}>
                {children}
            </Suspense>
        </UnifiedLayout>
    );
};

const AppRoutes = () => {
    const { isAuthenticated, user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={
                isAuthenticated ? (
                    user?.role === 'ADMIN' ? <Navigate to="/admin" /> : <Navigate to="/" />
                ) : <LoginPage />
            } />
            <Route path="/register" element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* Admin Routes */}
            <Route path="/admin" element={
                <AdminRoute>
                    <AdminDashboard />
                </AdminRoute>
            } />
            <Route path="/admin/users" element={
                <AdminRoute>
                    <AdminUsers />
                </AdminRoute>
            } />
            <Route path="/admin/vacations" element={
                <AdminRoute>
                    <AdminVacations />
                </AdminRoute>
            } />
            <Route path="/admin/settings" element={
                <AdminRoute>
                    <AdminSettings />
                </AdminRoute>
            } />
            <Route path="/admin/news" element={
                <AdminRoute>
                    <AdminNews />
                </AdminRoute>
            } />
            <Route path="/admin/events" element={
                <AdminRoute>
                    <AdminEvents />
                </AdminRoute>
            } />
            <Route path="/admin/payrolls" element={
                <AdminRoute>
                    <AdminPayrolls />
                </AdminRoute>
            } />
            <Route path="/admin/benefits" element={
                <AdminRoute>
                    <AdminBenefits />
                </AdminRoute>
            } />
            <Route path="/admin/fichajes" element={
                <AdminRoute>
                    <AdminFichajes />
                </AdminRoute>
            } />


            <Route path="/" element={
                <ProtectedRoute>
                    {user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Dashboard />}
                </ProtectedRoute>
            } />
            <Route path="/payroll" element={
                <ProtectedRoute>
                    <PayrollPage />
                </ProtectedRoute>
            } />
            <Route path="/vacations" element={
                <ProtectedRoute>
                    <VacationsPage />
                </ProtectedRoute>
            } />
            <Route path="/calendar" element={
                <ProtectedRoute>
                    <CalendarPage />
                </ProtectedRoute>
            } />
            <Route path="/absences" element={
                <ProtectedRoute>
                    <AbsencesPage />
                </ProtectedRoute>
            } />
            <Route path="/news" element={
                <ProtectedRoute>
                    <NewsPage />
                </ProtectedRoute>
            } />
            <Route path="/profile" element={
                <ProtectedRoute>
                    <ProfilePage />
                </ProtectedRoute>
            } />
            <Route path="/manager/team" element={
                <ProtectedRoute>
                    <TeamRequests />
                </ProtectedRoute>
            } />
            <Route path="/manager/calendar" element={
                <ProtectedRoute>
                    <TeamCalendar />
                </ProtectedRoute>
            } />
            <Route path="/manager/fichajes" element={
                <ProtectedRoute>
                    <ManagerFichajes />
                </ProtectedRoute>
            } />
            <Route path="/manager/adjustments" element={
                <ProtectedRoute>

                </ProtectedRoute>
            } />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

import { ThemeProvider } from './context/ThemeContext';
import { Toaster } from 'react-hot-toast';
import { forceLogout, isTokenExpired } from './services/api';

/**
 * Background watchdog that periodically checks if the session is still valid.
 * It will force a hard logout and reload if the token is expired or older than 24h,
 * ensuring users are kicked out without needing to interact with the page.
 */
function SessionWatchdog() {
    const { isAuthenticated } = useAuth();

    React.useEffect(() => {
        if (!isAuthenticated) return;

        const checkSession = async () => {
            const token = localStorage.getItem('token');
            if (!token) return;

            if (isTokenExpired(token)) {
                console.warn('Watchdog: Token expired, forcing nuclear logout...');
                await forceLogout();
            }
        };

        // Check every 30 seconds
        const interval = setInterval(checkSession, 30000);

        // Also check immediately when the component mounts
        checkSession();

        return () => clearInterval(interval);
    }, [isAuthenticated]);

    return null;
}

function App() {
    return (
        <AuthProvider>
            <SessionWatchdog />
            <ThemeProvider>
                <Router>
                    <AppRoutes />
                    <Toaster
                        position="top-right"
                        toastOptions={{
                            duration: 3000,
                            style: {
                                background: '#363636',
                                color: '#fff',
                            },
                            success: {
                                duration: 3000,
                                iconTheme: {
                                    primary: '#10b981',
                                    secondary: '#fff',
                                },
                            },
                            error: {
                                duration: 4000,
                                iconTheme: {
                                    primary: '#ef4444',
                                    secondary: '#fff',
                                },
                            },
                        }}
                    />
                </Router>
            </ThemeProvider>
        </AuthProvider>
    );
}

export default App;