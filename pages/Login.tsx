import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Info } from 'lucide-react';
import { useSettings } from '../hooks/useSettings';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const { settings } = useSettings();

  // Load remembered email on mount
  useEffect(() => {
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      // Save email if remember me is checked
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }
      await login(email, password);
      await login(email, password);
    } catch (error) {
      setIsError(true);
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsLoading(false);
    }
  };

  const companyName = settings.companyName || 'XyonEmpleados';
  const loginLogoUrl = settings.loginLogoUrl || settings.logoUrl; // Fallback to logoUrl if loginLogoUrl not set

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 transition-colors duration-300">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {loginLogoUrl && !logoError ? (
          <img
            src={loginLogoUrl}
            alt={companyName}
            className="w-auto h-32 mx-auto mb-6"
            onError={() => setLogoError(true)}
          />
        ) : null}
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Portal del Empleado</h2>
        <p className="mt-2 text-sm text-slate-600">
          Inicia sesión para acceder a tu espacio personal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-slate-100 transition-colors">

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Correo Electrónico
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setIsError(false);
                  }}
                  className={`block w-full pl-10 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white text-slate-900 ${isError ? 'border-red-500 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'} transition-colors`}
                  placeholder="usuario@xyonempleados.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Contraseña
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setIsError(false);
                  }}
                  className={`block w-full pl-10 sm:text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border bg-white text-slate-900 ${isError ? 'border-red-500 text-red-900 placeholder-red-300 focus:ring-red-500 focus:border-red-500' : 'border-slate-300'} ${isShaking ? 'animate-shake' : ''} transition-colors`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded bg-white"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <Link to="/forgot-password" className="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-all ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Accediendo...
                  </span>
                ) : 'Iniciar Sesión'}
              </button>
            </div>
          </form>
        </div>

        <div className="mt-6 text-center text-sm">
          <span className="text-slate-600">¿No tienes cuenta? </span>
          <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
            Regístrate aquí
          </Link>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          &copy; 2026 XyonPlatforms. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};