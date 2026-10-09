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
        <div role="tablist" aria-label={label} className="flex gap-2 overflow-x-auto pb-2 border-b border-slate-200 dark:border-slate-800">
            {tabs.map(({ id, label: text, icon: Icon }) => {
                const selected = id === active;
                return (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={selected}
                        onClick={() => onChange(id)}
                        className={`px-4 py-2 rounded-control text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${selected
                            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                    >
                        {Icon && <Icon size={18} />}
                        {text}
                    </button>
                );
            })}
        </div>
    );
}
