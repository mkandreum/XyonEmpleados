import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { LoginPage } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PayrollPage } from './pages/Payroll';
import { VacationsPage } from './pages/Vacations';
import { NewsPage } from './pages/News';
import { ProfilePage } from './pages/Profile';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

const AppRoutes = () => {
    const { isAuthenticated } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
            
            <Route path="/" element={
                <ProtectedRoute>
                    <Dashboard />
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