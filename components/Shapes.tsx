import React, { useEffect, useRef, useState } from 'react';

/*
 * Abstract vector shapes — web port of the native app's Components.kt
 * (blobPath / drawSparkle / drawStar / drawSquiggle, BlueField, AuroraBackground, BlobIcon).
 * All motion stops when the user prefers reduced motion or the tab is hidden.
 */

export const COLORS = {
    blue: '#2563EB',
    lime: '#C8F53C',
    lilac: '#C9B6FF',
    coral: '#FF6B4A',
    sun: '#FFD84A',
    paper: '#F4F2EA',
    ink: '#0C0C12',
};

const TAU = Math.PI * 2;

const prefersReducedMotion = () =>
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Wobbly closed blob. `lobes` is an integer so the outline always closes. */
export function blobPath(cx: number, cy: number, r: number, phase: number, lobes = 5, amp = 0.12, lobes2 = 3, amp2 = 0.06, steps = 72): string {
    let d = '';
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * TAU;
        const rr = r * (1 + amp * Math.cos(lobes * a + phase) + amp2 * Math.sin(lobes2 * a - phase * 1.3));
        d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
    }
    return d + 'Z';
}

/** Four-point concave sparkle. */
export function sparklePath(cx: number, cy: number, r: number): string {
    const k = r * 0.16;
    return `M${cx + r} ${cy}Q${cx + k} ${cy + k} ${cx} ${cy + r}Q${cx - k} ${cy + k} ${cx - r} ${cy}Q${cx - k} ${cy - k} ${cx} ${cy - r}Q${cx + k} ${cy - k} ${cx + r} ${cy}Z`;
}

/** Chunky star. */
export function starPath(cx: number, cy: number, r: number, points = 5, inner = 0.52): string {
    const n = points * 2;
    let d = '';
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU - Math.PI / 2;
        const rr = i % 2 === 0 ? r : r * inner;
        d += `${i === 0 ? 'M' : 'L'}${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`;
    }
    return d + 'Z';
}

/** Horizontal wave stroke. */
export function squigglePath(x: number, y: number, width: number, amp: number, phase = 0, steps = 40): string {
    let d = '';
    for (let i = 0; i <= steps; i++) {
        const px = x + (width * i) / steps;
        const py = y + amp * Math.sin((i / steps) * 4 * Math.PI + phase);
        d += `${i === 0 ? 'M' : 'L'}${px.toFixed(2)} ${py.toFixed(2)}`;
    }
    return d;
}

/**
 * Looping 0..2π phase driven by requestAnimationFrame (app rememberDrift).
 * Returns a constant when reduced motion is requested.
 */
export function useDrift(durationMs = 26000): number {
    const [t, setT] = useState(0);
    const start = useRef<number | null>(null);

    useEffect(() => {
        if (prefersReducedMotion()) return;
        let raf = 0;
        let last = 0;
        const loop = (now: number) => {
            if (start.current === null) start.current = now;
            // ~30fps is plenty for slow ambient drift and halves the work
            if (now - last > 33) {
                last = now;
                setT((((now - start.current) % durationMs) / durationMs) * TAU);
            }
            raf = requestAnimationFrame(loop);
        };
        const onVisibility = () => {
            cancelAnimationFrame(raf);
            if (!document.hidden) raf = requestAnimationFrame(loop);
        };
        raf = requestAnimationFrame(loop);
        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            cancelAnimationFrame(raf);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [durationMs]);

    return t;
}

const deg = (rad: number) => (rad * 180) / Math.PI;

/* ───────────────────────── Static accents ───────────────────────── */

export const Sparkle: React.FC<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }> = ({ size = 24, color = COLORS.lime, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
        <path d={sparklePath(50, 50, 50)} fill={color} />
    </svg>
);

export const Star: React.FC<{ size?: number; color?: string; className?: string; style?: React.CSSProperties }> = ({ size = 24, color = COLORS.sun, className, style }) => (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} style={style} aria-hidden="true">
        <path d={starPath(50, 50, 50)} fill={color} />
    </svg>
);

/* ───────────────────────── Backdrops ───────────────────────── */

/** Tracks an element's pixel size so shapes can be laid out in real coordinates (no stretching). */
function useSize<T extends HTMLElement>(): [React.RefObject<T>, { w: number; h: number }] {
    const ref = useRef<T>(null);
    const [size, setSize] = useState({ w: 1000, h: 1000 });
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === 'undefined') return;
        const ro = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            if (width > 0 && height > 0) setSize({ w: width, h: height });
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, size];
}

/**
 * Drifting shapes for the full-bleed blue field (app BlueField canvas).
 * Sizes follow the shorter side so the composition holds on phones and wide screens alike,
 * and the big blobs stay in the corners, away from the headline.
 */
const BlueFieldShapes: React.FC = () => {
    const t = useDrift();
    const [ref, { w, h }] = useSize<HTMLDivElement>();
    const m = Math.min(w, h);
    const wide = w > h;
    return (
        <div ref={ref} className="absolute inset-0" aria-hidden="true">
            <svg className="absolute inset-0 w-full h-full" viewBox={`0 0 ${w} ${h}`}>
                <path d={blobPath(w * (0.98 + 0.02 * Math.sin(t)), h * (0.02 + 0.02 * Math.cos(t)), m * (wide ? 0.42 : 0.36), t, 5)} fill={COLORS.lime} />
                <path d={blobPath(w * (0.0 + 0.02 * Math.cos(t)), h * (1.0 + 0.02 * Math.sin(t)), m * (wide ? 0.3 : 0.26), -t, 4, 0.1)} fill={COLORS.lilac} />
                <g transform={`rotate(${deg(t)} ${w * 0.9} ${h * 0.2})`}>
                    <path d={sparklePath(w * (0.9 + 0.01 * Math.sin(t * 2)), h * 0.2, m * 0.06)} fill="#fff" />
                </g>
                <g transform={`rotate(${deg(t) * 2} ${w * 0.86} ${h * 0.6})`}>
                    <path d={starPath(w * 0.86, h * (0.6 + 0.015 * Math.sin(t * 3)), m * 0.045)} fill={COLORS.sun} />
                </g>
                <circle cx={w * 0.5} cy={h * (0.05 + 0.01 * Math.sin(t * 2))} r={m * 0.016} fill="rgba(255,255,255,.9)" />
                <circle cx={w * (0.8 + 0.02 * Math.cos(t))} cy={h * 0.3} r={m * 0.2} fill="none" stroke="rgba(255,255,255,.3)" strokeWidth={Math.max(2, m * 0.005)} />
                <path d={squigglePath(w * 0.52, h * 0.92, m * 0.22, m * 0.016, t * 2)} fill="none" stroke={COLORS.lime} strokeWidth={Math.max(4, m * 0.011)} strokeLinecap="round" />
                <path d={sparklePath(w * 0.32, h * (0.94 + 0.01 * Math.cos(t)), m * 0.03)} fill={COLORS.lime} />
            </svg>
        </div>
    );
};

/** Full-bleed saturated blue field with big drifting vector shapes. Used by auth screens. */
export const BlueField: React.FC<{ className?: string; children?: React.ReactNode }> = ({ className = '', children }) => (
    <div className={`relative overflow-hidden bg-blue-600 ${className}`}>
        <BlueFieldShapes />
        <div className="relative z-10 h-full">{children}</div>
    </div>
);

/** App-wide canvas: a few quiet drifting shapes behind the content (app AuroraBackground). */
export const AuroraBackdrop: React.FC = () => {
    const t = useDrift(32000);
    const w = 1000, h = 1000;
    return (
        <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden" aria-hidden="true">
            <svg className="w-full h-full opacity-60 dark:opacity-[0.12]" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
                <path d={blobPath(w * (1.0 + 0.03 * Math.sin(t)), h * (0.04 + 0.02 * Math.cos(t)), w * 0.3, t, 5)} fill={COLORS.lilac} />
                <path d={blobPath(w * (-0.04 + 0.03 * Math.cos(t)), h * (0.7 + 0.03 * Math.sin(t)), w * 0.22, -t, 4)} fill={COLORS.lime} />
                <g transform={`rotate(${deg(t)} ${w * 0.9} ${h * 0.84})`}>
                    <path d={sparklePath(w * 0.9, h * (0.84 + 0.01 * Math.sin(t * 2)), w * 0.03)} fill={COLORS.blue} opacity={0.6} />
                </g>
            </svg>
        </div>
    );
};

/* ───────────────────────── Blob icon ───────────────────────── */

const isLight = (hex: string) => {
    const n = parseInt(hex.replace('#', ''), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55;
};

/** Icon sitting on a slowly wobbling flat blob (app BlobIcon). */
export const BlobIcon: React.FC<{ icon: React.ReactNode; color?: string; size?: number; className?: string }> = ({ icon, color = COLORS.lilac, size = 72, className = '' }) => {
    const t = useDrift(9000);
    return (
        <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`} style={{ width: size, height: size }}>
            <svg className="absolute inset-0" viewBox="0 0 100 100" aria-hidden="true">
                <path d={blobPath(50, 50, 42, t, 5, 0.1)} fill={color} />
            </svg>
            <span className="relative" style={{ color: isLight(color) ? COLORS.ink : '#fff' }}>{icon}</span>
        </div>
    );
};

/* ───────────────────────── Animated number ───────────────────────── */

/**
 * Counts up to the number in `value` (e.g. "12.5h" → 0 … 12.5h). Non-numeric strings render as-is.
 */
export const AnimatedNumber: React.FC<{ value: string | number; duration?: number; className?: string }> = ({ value, duration = 1100, className }) => {
    const str = String(value);
    const m = /^([^\d-]*)(-?\d+)(?:[.,](\d+))?([^\d]*)$/.exec(str);
    const target = m ? parseFloat(m[2] + (m[3] ? `.${m[3]}` : '')) : 0;
    const decimals = m?.[3]?.length ?? 0;
    const [shown, setShown] = useState(prefersReducedMotion() ? target : 0);

    useEffect(() => {
        if (!m || prefersReducedMotion()) { setShown(target); return; }
        let raf = 0;
        const t0 = performance.now();
        const step = (now: number) => {
            const p = Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            setShown(target * eased);
            if (p < 1) raf = requestAnimationFrame(step);
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [target, duration]);

    if (!m) return <span className={className}>{str}</span>;
    return (
        <span className={`tabular-nums ${className ?? ''}`}>
            {m[1]}{shown.toFixed(decimals).replace('.', decimals ? ',' : '')}{m[4]}
        </span>
    );
};
