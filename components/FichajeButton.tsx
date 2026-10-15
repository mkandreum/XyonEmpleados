import React, { useEffect, useRef, useState } from 'react';
import { LogIn, LogOut, Loader2, Clock, ChevronDown, AlertCircle, Pencil } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Fichaje, TurnoInfo } from '../types';
import { AdjustFichajeModal } from './AdjustFichajeModal';
import { useFichaje } from '../hooks/useFichaje';
import { COLORS, sparklePath, useDrift } from './Shapes';

const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

const pad = (n: number) => String(n).padStart(2, '0');

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Damped spring towards `target` (0..1), like Compose's LowBouncy / VeryLow spring. */
function useSpring(target: number, stiffness = 60, damping = 9): number {
    const [value, setValue] = useState(target);
    const state = useRef({ x: target, v: 0 });

    useEffect(() => {
        if (reducedMotion()) { state.current = { x: target, v: 0 }; setValue(target); return; }
        let raf = 0;
        let last = performance.now();
        const step = (now: number) => {
            const dt = Math.min(0.05, (now - last) / 1000);
            last = now;
            const s = state.current;
            const a = -stiffness * (s.x - target) - damping * s.v;
            s.v += a * dt;
            s.x += s.v * dt;
            setValue(s.x);
            if (Math.abs(s.x - target) > 0.001 || Math.abs(s.v) > 0.001) raf = requestAnimationFrame(step);
            else { s.x = target; s.v = 0; setValue(target); }
        };
        raf = requestAnimationFrame(step);
        return () => cancelAnimationFrame(raf);
    }, [target, stiffness, damping]);

    return value;
}

/** Morphing blob path: calm 5-lobe outline when out, spikier 8-lobe outline when clocked in. */
const morphPath = (r: number, morph: number, spin: number) => {
    let d = '';
    const steps = 90;
    for (let i = 0; i <= steps; i++) {
        const a = (i / steps) * Math.PI * 2;
        const rr = r * (1 + (1 - morph) * 0.07 * Math.cos(5 * a + spin) + morph * 0.11 * Math.cos(8 * a - spin * 2) + 0.03 * Math.sin(3 * a + spin * 3));
        d += `${i === 0 ? 'M' : 'L'}${(100 + rr * Math.cos(a)).toFixed(2)} ${(100 + rr * Math.sin(a)).toFixed(2)}`;
    }
    return d + 'Z';
};

const mix = (a: string, b: string, t: number) => {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const ch = (s: number) => Math.round(((pa >> s) & 255) + (((pb >> s) & 255) - ((pa >> s) & 255)) * t);
    return `rgb(${ch(16)}, ${ch(8)}, ${ch(0)})`;
};

const TurnoBadge: React.FC<{ turno: TurnoInfo }> = ({ turno }) => (
    <div className="flex items-start gap-2 px-4 py-2.5 rounded-[1.25rem] bg-white/15 text-white text-sm">
        <AlertCircle size={16} className="shrink-0 mt-0.5" aria-hidden="true" />
        <div>
            <p className="font-bold">{turno.label}</p>
            {turno.expectedEntry && turno.expectedExit && (
                <p className="text-white/80 text-xs">Tu horario hoy: {turno.expectedEntry} – {turno.expectedExit}</p>
            )}
        </div>
    </div>
);

const TodayFichajesPanel: React.FC<{ fichajes: Fichaje[]; onAdjust: (f: Fichaje) => void }> = ({ fichajes, onAdjust }) => {
    const entradas = fichajes.filter(f => f.tipo === 'ENTRADA').length;
    const salidas = fichajes.filter(f => f.tipo === 'SALIDA').length;

    return (
        <div className="rounded-[1.5rem] bg-white text-ink dark:bg-slate-900 dark:text-white overflow-hidden">
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                {fichajes.map((fichaje, index) => {
                    const isEntrada = fichaje.tipo === 'ENTRADA';
                    return (
                        <li key={fichaje.id || index} className="flex items-center gap-3 px-4 py-3 group">
                            <span className={`w-3 h-3 rounded-full shrink-0 ${isEntrada ? 'bg-lime ring-2 ring-ink' : 'bg-coral ring-2 ring-ink'}`} aria-hidden="true" />
                            <span className="flex-1 min-w-0 text-sm font-bold">{isEntrada ? 'Entrada' : 'Salida'}</span>
                            <span className="text-sm font-black tabular-nums">{formatTime(fichaje.timestamp)}</span>
                            <button
                                onClick={() => onAdjust(fichaje)}
                                title="Solicitar ajuste"
                                aria-label={`Solicitar ajuste del fichaje de ${formatTime(fichaje.timestamp)}`}
                                className="press shrink-0 w-9 h-9 grid place-items-center rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-lime hover:text-ink transition-colors"
                            >
                                <Pencil size={14} aria-hidden="true" />
                            </button>
                        </li>
                    );
                })}
            </ul>
            <p className="px-4 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60">
                {entradas} {entradas === 1 ? 'entrada' : 'entradas'} · {salidas} {salidas === 1 ? 'salida' : 'salidas'}
            </p>
        </div>
    );
};

/**
 * Hero clock-in/out (app FichajeHero): a big abstract blob that morphs shape and colour
 * between out/in states with a spring, plus a sparkle burst on success. Sits on a blue field.
 */
export const FichajeButton: React.FC = () => {
    const { checking, submitting, hasActiveEntry, currentTurno, todayFichajes, missingExit, toggleFichaje, reloadToday } = useFichaje();
    const [showHistory, setShowHistory] = useState(false);
    const [adjustingFichaje, setAdjustingFichaje] = useState<Fichaje | null>(null);
    const [pressed, setPressed] = useState(false);
    const [burstKey, setBurstKey] = useState(0);
    const [now, setNow] = useState(Date.now());
    const prevActive = useRef<boolean | null>(null);

    const spin = useDrift(14000);
    const morph = useSpring(hasActiveEntry ? 1 : 0);
    const press = useSpring(pressed ? 0.88 : 1, 260, 14);

    // Sparkle burst whenever the state flips after the initial load
    useEffect(() => {
        if (checking) return;
        if (prevActive.current !== null && prevActive.current !== hasActiveEntry) setBurstKey(k => k + 1);
        prevActive.current = hasActiveEntry;
    }, [hasActiveEntry, checking]);

    // Running timer while clocked in
    useEffect(() => {
        if (!hasActiveEntry) return;
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, [hasActiveEntry]);

    const lastEntry = [...todayFichajes].reverse().find((f: Fichaje) => f.tipo === 'ENTRADA');
    const since = hasActiveEntry && lastEntry ? new Date(lastEntry.timestamp).getTime() : null;
    const elapsed = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
    const elapsedStr = since ? `${pad(Math.floor(elapsed / 3600))}:${pad(Math.floor((elapsed % 3600) / 60))}:${pad(elapsed % 60)}` : '--:--:--';

    const base = 72 * press;
    const blobColor = mix(COLORS.lime, COLORS.coral, Math.min(1, Math.max(0, morph)));
    const busy = checking || submitting;

    return (
        <div className="flex flex-col items-center w-full">
            <div className="relative w-[17rem] h-[17rem] sm:w-[19rem] sm:h-[19rem]">
                <svg viewBox="0 0 200 200" className="absolute inset-0 w-full h-full overflow-visible" aria-hidden="true">
                    <path d={morphPath(base * 1.18, 0, -spin)} fill="rgba(255,255,255,.18)" />
                    <path d={morphPath(base, morph, spin)} fill={blobColor} />
                    <g transform={`rotate(${(spin * 57) % 360} ${100 + base * 1.05} ${100 - base * 0.95})`}>
                        <path d={sparklePath(100 + base * 1.05, 100 - base * 0.95, base * 0.2)} fill="#fff" />
                    </g>
                    <circle cx={100 - base * 1.1} cy={100 + base * 0.7} r={base * 0.06} fill="#fff" />
                </svg>

                {/* Success burst */}
                {burstKey > 0 && (
                    <div key={burstKey} className="absolute inset-0 pointer-events-none" aria-hidden="true">
                        {Array.from({ length: 8 }).map((_, i) => {
                            const a = (i / 8) * Math.PI * 2;
                            return (
                                <svg key={i} viewBox="0 0 20 20" className="absolute left-1/2 top-1/2 w-6 h-6 -ml-3 -mt-3 animate-burst"
                                    style={{ ['--bx' as any]: `${Math.cos(a) * 150}px`, ['--by' as any]: `${Math.sin(a) * 150}px` }}>
                                    <path d={sparklePath(10, 10, 10)} fill={COLORS.sun} />
                                </svg>
                            );
                        })}
                    </div>
                )}

                <button
                    onClick={() => { setPressed(false); void toggleFichaje(); }}
                    onPointerDown={() => setPressed(true)}
                    onPointerUp={() => setPressed(false)}
                    onPointerLeave={() => setPressed(false)}
                    disabled={busy}
                    aria-label={hasActiveEntry ? 'Fichar salida' : 'Fichar entrada'}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[62%] h-[62%] rounded-full grid place-items-center text-ink disabled:cursor-wait focus-visible:outline-4 focus-visible:outline-white"
                >
                    {busy ? (
                        <Loader2 size={40} className="animate-spin" aria-hidden="true" />
                    ) : (
                        <span key={String(hasActiveEntry)} className="flex flex-col items-center animate-pop">
                            {hasActiveEntry ? <LogOut size={38} strokeWidth={2.6} aria-hidden="true" /> : <LogIn size={38} strokeWidth={2.6} aria-hidden="true" />}
                            <span className="font-display font-black text-2xl tracking-tight mt-1">{hasActiveEntry ? 'SALIDA' : 'ENTRADA'}</span>
                        </span>
                    )}
                </button>
            </div>

            <div key={String(hasActiveEntry)} className="text-center text-white animate-slide-up" aria-live="polite">
                {hasActiveEntry ? (
                    <>
                        <p className="font-display font-black text-[2.75rem] leading-none tracking-tighter tabular-nums">{elapsedStr}</p>
                        <p className="mt-1.5 text-white/80 font-medium">Jornada en curso</p>
                    </>
                ) : (
                    <>
                        <p className="font-display font-black text-[1.75rem] leading-none tracking-tighter">Fuera de jornada</p>
                        <p className="mt-1.5 text-white/80 font-medium">Pulsa para fichar tu entrada</p>
                    </>
                )}
            </div>

            <div className="w-full max-w-sm mt-5 flex flex-col gap-3">
                {missingExit && (
                    <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-[1.25rem] bg-coral text-ink text-sm">
                        <AlertCircle size={18} className="shrink-0 mt-0.5" aria-hidden="true" />
                        <p>
                            <b className="font-extrabold">Falta la salida del {new Date(missingExit.timestamp).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</b>
                            {' '}(entrada a las {formatTime(missingExit.timestamp)}). Pide a tu responsable que la registre.
                        </p>
                    </div>
                )}
                {currentTurno && hasActiveEntry && <TurnoBadge turno={currentTurno} />}

                {todayFichajes.length > 0 && (
                    <div className="w-full">
                        <button
                            onClick={() => setShowHistory(!showHistory)}
                            aria-expanded={showHistory}
                            className="press w-full flex items-center justify-between px-5 h-12 rounded-full bg-white/15 hover:bg-white/25 text-white text-sm font-bold transition-colors"
                        >
                            <span className="flex items-center gap-2"><Clock size={16} aria-hidden="true" />Fichajes de hoy</span>
                            <span className="flex items-center gap-2">
                                <span className="min-w-[1.5rem] h-6 px-2 grid place-items-center rounded-full bg-lime text-ink text-xs font-black">{todayFichajes.length}</span>
                                <ChevronDown size={16} aria-hidden="true" className={`transition-transform duration-300 ease-spring ${showHistory ? 'rotate-180' : ''}`} />
                            </span>
                        </button>

                        {showHistory && (
                            <div className="mt-2 animate-pop origin-top">
                                <TodayFichajesPanel fichajes={todayFichajes} onAdjust={setAdjustingFichaje} />
                            </div>
                        )}
                    </div>
                )}
            </div>

            {adjustingFichaje && (
                <AdjustFichajeModal
                    fichaje={adjustingFichaje}
                    onClose={() => setAdjustingFichaje(null)}
                    onSuccess={() => {
                        toast.success('Solicitud de ajuste enviada');
                        reloadToday();
                    }}
                />
            )}
        </div>
    );
};
