import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, Info, AlertCircle } from 'lucide-react';
import { AuthShell, AuthField, PillButton } from '../components/AuthShell';

const REMEMBER_KEY = 'rememberedEmail';

const safeGet = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const safeSet = (k: string, v: string | null) => {
  try { v === null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* storage unavailable */ }
};

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Load remembered email on mount & check why we were sent here
  useEffect(() => {
    const rememberedEmail = safeGet(REMEMBER_KEY);
    if (rememberedEmail) {
      setEmail(rememberedEmail);
      setRememberMe(true);
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('expired') === '1') setNotice('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
    if (params.get('disabled') === '1') setNotice('Tu cuenta está desactivada. Contacta con tu administrador.');
    if (params.has('expired') || params.has('disabled')) window.history.replaceState({}, '', '/login');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg(null);
    try {
      safeSet(REMEMBER_KEY, rememberMe ? email : null);
      await login(email, password);
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const status = error?.response?.status;
      setErrorMsg(
        code === 'ACCOUNT_DISABLED' ? 'Tu cuenta está desactivada. Contacta con tu administrador.'
          : status === 429 ? 'Demasiados intentos. Espera unos minutos e inténtalo de nuevo.'
            : 'Correo o contraseña incorrectos.'
      );
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setIsLoading(false);
    }
  };

  return (
    <AuthShell
      headline={'Tu jornada,\nsin fricción.'}
      tagline="Ficha, pide vacaciones y consulta tus nóminas desde un solo sitio."
      title="Hola de nuevo"
      subtitle="Inicia sesión en tu portal del empleado"
      footer={
        <>
          <span className="text-slate-500 dark:text-slate-400">¿No tienes cuenta? </span>
          <Link to="/register" className="font-extrabold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline">
            Regístrate
          </Link>
        </>
      }
    >
      {notice && (
        <div role="status" className="mb-5 flex items-start gap-2.5 rounded-[1.375rem] bg-sun p-3.5 text-sm font-semibold text-ink">
          <Info className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <form className="space-y-5" onSubmit={handleSubmit} noValidate={false}>
        <AuthField
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          label="Correo electrónico"
          icon={<Mail size={20} />}
          value={email}
          error={!!errorMsg}
          onChange={(e) => { setEmail(e.target.value); setErrorMsg(null); }}
          placeholder="tu@empresa.com"
        />

        <AuthField
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          label="Contraseña"
          icon={<Lock size={20} />}
          value={password}
          error={!!errorMsg}
          className={isShaking ? 'animate-shake' : ''}
          onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
          placeholder="••••••••"
        />

        {errorMsg && (
          <p role="alert" className="flex items-center gap-2 rounded-full bg-coral/15 px-4 py-2.5 text-sm font-bold text-coral-ink dark:text-coral">
            <AlertCircle size={16} aria-hidden="true" />{errorMsg}
          </p>
        )}

        <div className="flex items-center justify-between gap-3">
          <label htmlFor="remember-me" className="flex items-center gap-2.5 cursor-pointer select-none text-sm font-semibold text-ink dark:text-slate-200">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="h-5 w-5 rounded-md border-thick border-ink dark:border-slate-600 accent-[#2563EB]"
            />
            Recordarme
          </label>

          <Link to="/forgot-password" className="text-sm font-bold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <PillButton type="submit" loading={isLoading} loadingText="Accediendo…">
          Iniciar sesión
        </PillButton>
      </form>
    </AuthShell>
  );
};
