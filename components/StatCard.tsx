import React from 'react';

interface StatCardProps {
    icon: React.ComponentType<{ size?: number }>;
    /** Background + text color classes for the icon chip. */
    iconClass: string;
    label: string;
    value: React.ReactNode;
    caption?: string;
    /** Animation stagger class, e.g. `delay-150`. */
    delay?: string;
}

/** Icon + label + big value card used for dashboard-like summaries. */
export const StatCard: React.FC<StatCardProps> = ({ icon: Icon, iconClass, label, value, caption, delay = '' }) => (
    <div className={`card p-6 animate-slide-up ${delay}`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-control ${iconClass}`} aria-hidden="true">
                <Icon size={24} />
            </div>
            <div className="min-w-0">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
                {caption && <p className="text-xs text-slate-500 dark:text-slate-400">{caption}</p>}
            </div>
        </div>
    </div>
);
