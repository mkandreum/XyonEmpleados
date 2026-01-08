import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { AdminLayout } from './components/AdminLayout';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { PayrollPage } from './pages/Payroll';
import { VacationsPage } from './pages/Vacations';
import { NewsPage } from './pages/News';
import { ProfilePage } from './pages/Profile';
import { AdminDashboard } from './pages/admin/Dashboard';
import { AdminUsers } from './pages/admin/Users';
import { AdminVacations } from './pages/admin/Vacations';
import { AdminSettings } from './pages/admin/Settings';
import { AdminNews } from './pages/admin/News';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated } = useAuth();
    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }
    return <Layout>{children}</Layout>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isAuthenticated } = useAuth();
    if (!isAuthenticated) return <Navigate to="/login" replace />;
    if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
    return <AdminLayout>{children}</AdminLayout>;
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

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <AuthProvider>
            <Router>
                <AppRoutes />
            </Router>
        </AuthProvider>
    );
}

export default App;