import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MoreHorizontal } from 'lucide-react';
import { haptic } from '../utils/haptics';
import { useNavItems } from '../hooks/useNavItems';

const ITEM = 56; // px, matches the app's 58dp capsule slots
const MAX_VISIBLE = 4;

/**
 * Mobile/tablet navigation (< lg): floating dark capsule, icon-only, with a lime
 * highlight that springs between tabs — same as the native app's BottomBar.
 * On desktop the left Sidebar takes over.
 */
export const FloatingNavbar: React.FC = () => {
    const location = useLocation();
    const { items, pendingDots, markSectionAsRead } = useNavItems();
    const [showMore, setShowMore] = useState(false);

    const needsMore = items.length > MAX_VISIBLE + 1;
    const visibleItems = needsMore ? items.slice(0, MAX_VISIBLE) : items;
    const hiddenItems = needsMore ? items.slice(MAX_VISIBLE) : [];
    const activeIndex = visibleItems.findIndex(item => item.path === location.pathname);
    const hiddenActive = hiddenItems.some(item => item.path === location.pathname);
    const sliderIndex = activeIndex !== -1 ? activeIndex : hiddenActive ? visibleItems.length : -1;

    const handleNavClick = async (path: string) => {
        haptic('light');
        setShowMore(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        await markSectionAsRead(path);
    };

    return (
        <>
        {/* Click-away layer; kept outside the translated <nav> so `fixed` covers the viewport */}
        {showMore && <div className="lg:hidden fixed inset-0 z-nav" onClick={() => setShowMore(false)} aria-hidden="true" />}
        <nav aria-label="Navegación principal" className="lg:hidden fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 z-nav">
            <div className="relative flex items-center p-[7px] rounded-full bg-ink dark:bg-[#1E1E2A] dark:border-thick dark:border-slate-700 shadow-float">
                {sliderIndex !== -1 && (
                    <span
                        aria-hidden="true"
                        className="absolute top-[7px] left-[7px] rounded-full bg-lime transition-transform duration-500 ease-spring"
                        style={{ width: ITEM, height: ITEM, transform: `translateX(${sliderIndex * ITEM}px)` }}
                    />
                )}

                {visibleItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            title={item.label}
                            onClick={() => { void handleNavClick(item.path); }}
                            className={`relative z-10 flex items-center justify-center rounded-full transition-colors duration-300 ${isActive ? 'text-ink' : 'text-white/60 hover:text-white'}`}
                            style={{ width: ITEM, height: ITEM }}
                        >
                            <Icon size={22} strokeWidth={isActive ? 2.6 : 2} className={`transition-transform duration-500 ease-spring ${isActive ? 'scale-[1.15]' : ''}`} aria-hidden="true" />
                            {pendingDots.has(item.path) && (
                                <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-coral rounded-full ring-2 ring-ink" aria-hidden="true" />
                            )}
                        </Link>
                    );
                })}

                {needsMore && (
                    <div className="relative z-10">
                        <button
                            onClick={() => setShowMore(!showMore)}
                            aria-label="Más secciones"
                            aria-expanded={showMore}
                            className={`flex items-center justify-center rounded-full transition-colors duration-300 ${hiddenActive ? 'text-ink' : 'text-white/60 hover:text-white'}`}
                            style={{ width: ITEM, height: ITEM }}
                        >
                            <MoreHorizontal size={22} aria-hidden="true" />
                        </button>

                        {showMore && (
                            <div className="card absolute bottom-full right-0 mb-4 flex flex-col gap-1 p-2 min-w-[190px] shadow-float animate-pop origin-bottom-right">
                                {hiddenItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    const Icon = item.icon;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            aria-current={isActive ? 'page' : undefined}
                                            onClick={() => { void handleNavClick(item.path); }}
                                            className={`flex items-center gap-3 px-4 py-3 rounded-full font-bold text-sm transition-colors ${isActive
                                                ? 'bg-lime text-ink'
                                                : 'text-ink dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                                        >
                                            <span className="relative">
                                                <Icon size={18} aria-hidden="true" />
                                                {pendingDots.has(item.path) && (
                                                    <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-coral rounded-full ring-2 ring-white dark:ring-slate-900" aria-hidden="true" />
                                                )}
                                            </span>
                                            {item.label}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </nav>
        </>
    );
};
