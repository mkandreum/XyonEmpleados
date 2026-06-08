/**
 * Premium haptic feedback utility.
 * Uses the Vibration API (supported on Android Chrome; silently no-ops on iOS/desktop).
 */

type HapticPattern = number | number[];

const patterns: Record<string, HapticPattern> = {
    /** Subtle tap — navigation, toggles */
    light: 10,
    /** Standard tap — open modal, select filter */
    tap: 20,
    /** Heavier impact — fichaje clock-in/out */
    impact: 40,
    /** Success — approve, save, create */
    success: [10, 60, 30],
    /** Error/reject — reject, delete */
    error: [60, 40, 60],
    /** Double tap — destructive confirm */
    double: [20, 60, 20],
};

/**
 * Trigger haptic vibration using a named preset.
 * Silently ignored when Vibration API is unavailable.
 */
export function haptic(preset: keyof typeof patterns = 'tap'): void {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(patterns[preset] ?? 20);
        }
    } catch {
        // Ignore any errors (e.g., policy restrictions)
    }
}
