import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User, Info } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  // Pre-fill credentials for demo purposes
  const [email, setEmail] = useState('alejandro.ruiz@velilla.com');
  const [password, setPassword] = useState('demo1234');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await login(email, password);
      // Login success handled by AuthContext/redirect usually, or component unmounts
    } catch (error) {
      alert("Error al iniciar sesión. Verifica tus credenciales.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">Velilla<span className="text-blue-600">Emp</span></h1>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-slate-900">Portal del Empleado</h2>
        <p className="mt-2 text-sm text-slate-600">
          Inicia sesión para acceder a tu espacio personal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-xl sm:px-10 border border-slate-100">

          {/* Demo Alert */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
            <Info className="text-blue-600 shrink-0" size={20} />
            <div>
              <h3 className="text-sm font-semibold text-blue-900">Modo Demostración</h3>
              <p className="text-xs text-blue-700 mt-1">
                Las credenciales de prueba han sido pre-cargadas para tu comodidad. Solo pulsa "Iniciar Sesión".
              </p>
            </div>
          </div>

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
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
                  placeholder="usuario@velilla.com"
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
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 sm:text-sm border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2.5 border"
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
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-slate-900">
                  Recordarme
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                  ¿Olvidaste tu contraseña?
                </a>
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
        <p className="mt-6 text-center text-xs text-slate-500">
          &copy; 2024 Velilla Corporate. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
};