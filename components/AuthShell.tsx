import React, { useState } from 'react';
import { BlueField } from './Shapes';
import { useSettings } from '../hooks/useSettings';

interface AuthShellProps {
    /** Huge headline on the blue field; use \n for line breaks. */
    headline: string;
    tagline?: string;
    /** Title inside the panel. */
    title: string;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
}

/**
 * Auth screens layout (app AuthScreens): full-bleed animated blue field with abstract shapes
 * and a rounded paper panel. Side-by-side on desktop, stacked (panel rising from the bottom) on mobile.
 */
export const AuthShell: React.FC<AuthShellProps> = ({ headline, tagline, title, subtitle, children, footer }) => {
    const { settings } = useSettings();
    const [logoError, setLogoError] = useState(false);
    const companyName = settings.companyName || 'XyonEmpleados';
    const logo = (settings.loginLogoUrl || settings.logoUrl) as string | undefined;

    return (
        <BlueField className="min-h-screen">
            <div className="min-h-screen flex flex-col lg:flex-row">
                {/* Brand side */}
                <div className="flex-1 flex flex-col justify-between px-6 pt-8 pb-10 sm:px-10 lg:px-16 lg:py-14 text-white">
                    <div className="flex items-center gap-3 animate-slide-up">
                        {logo && !logoError ? (
                            <span className="inline-flex items-center rounded-full bg-white px-4 py-2">
                                <img src={logo} alt={companyName} className="h-8 w-auto max-w-[10rem] object-contain" onError={() => setLogoError(true)} />
                            </span>
                        ) : (
                            <>
                                <span className="w-11 h-11 rounded-full bg-lime text-ink grid place-items-center font-display font-black text-xl">
                                    {companyName.charAt(0).toUpperCase()}
                                </span>
                                <span className="font-display font-black text-xl tracking-tighter">{companyName}</span>
                            </>
                        )}
                    </div>

                    <div className="mt-16 lg:mt-0 max-w-xl">
                        <h1 className="font-display font-black text-[3.25rem] sm:text-[4.5rem] lg:text-[5.5rem] leading-[0.9] tracking-[-0.05em] whitespace-pre-line animate-slide-up delay-100">
                            {headline}
                        </h1>
                        {tagline && (
                            <p className="mt-5 text-lg sm:text-xl text-white/85 font-medium max-w-md animate-slide-up delay-200">{tagline}</p>
                        )}
                    </div>

                    <p className="hidden lg:block text-sm text-white/70 animate-slide-up delay-300">
                        &copy; {new Date().getFullYear()} XyonPlatforms
                    </p>
                </div>

                {/* Panel */}
                <div className="lg:w-[34rem] lg:p-6 flex">
                    <div className="w-full bg-slate-50 dark:bg-slate-950 rounded-t-[2.5rem] lg:rounded-[2.5rem] px-6 pt-9 pb-10 sm:px-10 lg:px-12 flex flex-col justify-center animate-slide-up delay-150">
                        <div className="w-full max-w-md mx-auto">
                            <h2 className="font-display font-black text-headline tracking-tighter text-ink dark:text-white">{title}</h2>
                            {subtitle && <p className="mt-2 text-slate-500 dark:text-slate-400">{subtitle}</p>}
                            <div className="mt-8">{children}</div>
                            {footer && <div className="mt-8 text-center text-sm">{footer}</div>}
                        </div>
                    </div>
                </div>
            </div>
        </BlueField>
    );
};

/** Text input with leading icon, styled like the app's XyonTextField. */
export const AuthField: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: React.ReactNode; error?: boolean }> = ({ label, icon, error, className = '', id, ...props }) => (
    <div>
        <label htmlFor={id} className="label">{label}</label>
        <div className="relative">
            {icon && (
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500 dark:text-slate-400" aria-hidden="true">
                    {icon}
                </span>
            )}
            <input
                id={id}
                {...props}
                aria-invalid={error || undefined}
                className={`field !min-h-[3.25rem] !rounded-[1.375rem] text-base ${icon ? 'pl-11' : ''} ${error ? '!border-coral' : ''} ${className}`}
            />
        </div>
    </div>
);

/** Big pill submit button with the round arrow bubble (app XyonButton, Ink style). */
export const PillButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; loadingText?: string }> = ({ children, loading, loadingText, disabled, className = '', ...props }) => (
    <button
        {...props}
        disabled={disabled || loading}
        className={`group press w-full flex items-center min-h-[3.625rem] pl-7 pr-2 py-2 rounded-full bg-ink text-paper dark:bg-paper dark:text-ink font-extrabold text-[1.0625rem] tracking-tight disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
        <span className="flex-1 text-left truncate">{loading ? (loadingText ?? children) : children}</span>
        <span className="w-[2.625rem] h-[2.625rem] rounded-full bg-lime text-ink grid place-items-center transition-transform duration-300 ease-spring group-hover:translate-x-0.5 group-hover:-rotate-12">
            {loading ? (
                <span className="w-5 h-5 border-[2.5px] border-ink border-t-transparent rounded-full animate-spin" aria-hidden="true" />
            ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            )}
        </span>
    </button>
);
