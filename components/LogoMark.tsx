import React, { useId } from 'react';

/**
 * Xyon brand mark (same artwork as the Android app icon): two crossing rounded bars and a round head
 * on a navy tile. `tile={false}` draws the mark alone.
 */
export const LogoMark: React.FC<{ size?: number; tile?: boolean; className?: string; title?: string }> = ({ size = 40, tile = true, className, title = 'Xyon' }) => {
    const id = useId().replace(/:/g, '');
    return (
        <svg width={size} height={size} viewBox={tile ? '0 0 1254 1254' : '250 240 760 760'} className={className} role="img" aria-label={title}>
            <defs>
                <linearGradient id={`bg${id}`} x1="0" y1="1254" x2="1254" y2="0" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#04123A" />
                    <stop offset=".6" stopColor="#071C4E" />
                    <stop offset="1" stopColor="#0B4A78" />
                </linearGradient>
                <linearGradient id={`bl${id}`} x1="300" y1="330" x2="960" y2="940" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#1E86FF" />
                    <stop offset=".5" stopColor="#0A3BEB" />
                    <stop offset="1" stopColor="#1E8CFF" />
                </linearGradient>
                <linearGradient id={`tl${id}`} x1="300" y1="940" x2="960" y2="330" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#14EED8" />
                    <stop offset=".5" stopColor="#10D2DC" />
                    <stop offset="1" stopColor="#2CF2DC" />
                </linearGradient>
                <linearGradient id={`hd${id}`} x1="627" y1="272" x2="627" y2="442" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stopColor="#00E8FF" />
                    <stop offset="1" stopColor="#1872FF" />
                </linearGradient>
            </defs>
            {tile && <rect width="1254" height="1254" rx="300" fill={`url(#bg${id})`} />}
            <path d="M368 398L888 872" stroke={`url(#bl${id})`} strokeWidth="164" strokeLinecap="round" />
            <path d="M372 882L892 410" stroke="rgba(0,10,46,.25)" strokeWidth="176" strokeLinecap="round" />
            <path d="M366 870L886 398" stroke={`url(#tl${id})`} strokeWidth="164" strokeLinecap="round" />
            <circle cx="627" cy="357" r="85" fill={`url(#hd${id})`} />
        </svg>
    );
};
