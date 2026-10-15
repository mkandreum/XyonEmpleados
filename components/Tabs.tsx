import React from 'react';

export interface TabItem<T extends string> {
    id: T;
    label: string;
    icon?: React.ComponentType<{ size?: number }>;
}

interface TabsProps<T extends string> {
    tabs: TabItem<T>[];
    active: T;
    onChange: (id: T) => void;
    label?: string;
}

/** Accessible horizontal tab bar (scrolls on narrow screens). */
export function Tabs<T extends string>({ tabs, active, onChange, label = 'Secciones' }: TabsProps<T>) {
    return (
        <div role="tablist" aria-label={label} className="flex gap-1 overflow-x-auto p-1 rounded-full bg-white dark:bg-slate-900 border-thick border-ink dark:border-slate-700 w-fit max-w-full">
            {tabs.map(({ id, label: text, icon: Icon }) => {
                const selected = id === active;
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(id)}
                        className={`press px-4 h-10 rounded-full text-sm font-extrabold whitespace-nowrap transition-colors flex items-center gap-2 ${selected
                            ? 'bg-lime text-ink'
                            : 'text-slate-600 dark:text-slate-300 hover:text-ink dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                    >
                        {Icon && <Icon size={18} />}
                        {text}
                    </button>
                );
            })}
        </div>
    );
}
