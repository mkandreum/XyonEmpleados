import React from 'react';
import { AnimatedNumber } from './Shapes';

export type StatTone = 'lime' | 'lilac' | 'sun' | 'coral' | 'blue' | 'plain';

const TONE: Record<StatTone, { box: string; chip: string; label: string }> = {
    lime: { box: 'bg-lime text-ink border-ink', chip: 'bg-ink/10', label: 'text-ink/75' },
    lilac: { box: 'bg-lilac text-ink border-ink', chip: 'bg-ink/10', label: 'text-ink/75' },
    sun: { box: 'bg-sun text-ink border-ink', chip: 'bg-ink/10', label: 'text-ink/75' },
    coral: { box: 'bg-coral text-ink border-ink', chip: 'bg-ink/10', label: 'text-ink/75' },
    blue: { box: 'bg-blue-600 text-white border-ink dark:border-blue-600', chip: 'bg-white/15', label: 'text-white/80' },
    plain: { box: 'bg-white text-ink border-ink dark:bg-slate-900 dark:text-white dark:border-slate-700', chip: '', label: 'text-slate-500 dark:text-slate-400' },
};

interface StatCardProps {
    icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
    /** Flat saturated fill, like the app's StatPill. Defaults to a plain card. */
    tone?: StatTone;
    /** Icon chip classes for the plain tone (kept for existing call sites). */
    iconClass?: string;
    label: string;
    value: React.ReactNode;
    caption?: string;
    /** Animation stagger class, e.g. `delay-150`. */
    delay?: string;
}

/** Stat tile: icon chip, big counting number and label. */
export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, tone = 'plain', iconClass, label, value, caption, delay = '' }) => {
    const t = TONE[tone];
    const chip = tone === 'plain' ? (iconClass || 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300') : t.chip;
    const isCountable = typeof value === 'number' || typeof value === 'string';

    return (
        <div className={`rounded-card border-thick p-5 animate-slide-up ${t.box} ${delay}`}>
            <div className={`w-10 h-10 rounded-full grid place-items-center ${chip}`} aria-hidden="true">
                <Icon size={20} strokeWidth={2.4} />
            </div>
            <p className="mt-5 font-display font-black text-[2.125rem] leading-none tracking-tighter">
                {isCountable ? <AnimatedNumber value={value as string | number} /> : value}
            </p>
            <p className={`mt-1.5 text-sm font-bold ${t.label}`}>{label}</p>
            {caption && <p className={`text-xs ${t.label}`}>{caption}</p>}
        </div>
    );
};
