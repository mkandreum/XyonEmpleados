import React, { useState } from 'react';
import { getAbsoluteUrl } from '../utils/urlUtils';

const PALETTE = ['bg-lime', 'bg-lilac', 'bg-sun', 'bg-coral', 'bg-blue-300'];

const hash = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
};

/** Photo avatar that falls back to coloured initials (app Avatar) when there is no image or it fails. */
export const Avatar: React.FC<{ name?: string; url?: string | null; size?: number; className?: string }> = ({ name = '', url, size = 40, className = '' }) => {
    const [failed, setFailed] = useState(false);
    const src = url ? getAbsoluteUrl(url) : '';
    const initials = name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join('') || '?';

    if (src && !failed) {
        return (
            <img src={src} alt="" onError={() => setFailed(true)}
                className={`shrink-0 rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
        );
    }
    return (
        <span aria-hidden="true"
            className={`shrink-0 rounded-full grid place-items-center text-ink font-display font-black ${PALETTE[hash(name) % PALETTE.length]} ${className}`}
            style={{ width: size, height: size, fontSize: size / 2.6 }}>
            {initials}
        </span>
    );
};
