// Haptic ticks. Inside the SAHI MF Android app the shell exposes window.SahiShell.haptic, which plays the system's own
// ruler / segment tick (Android WebView ignores the Vibration API). Elsewhere it falls back to navigator.vibrate,
// which Chrome on Android honours during a touch; desktop browsers and iOS Safari simply do nothing.

type Shell = { haptic?: (kind: string) => void };

export type HapticKind = "tick" | "major";

let last = 0;

export function haptic(kind: HapticKind = "tick") {
  const now = performance.now();
  if (now - last < 30) return; // a fast fling can cross several stoppers in one frame: one buzz is enough
  last = now;
  const shell = (window as unknown as { SahiShell?: Shell }).SahiShell;
  if (shell?.haptic) {
    shell.haptic(kind);
    return;
  }
  navigator.vibrate?.(kind === "major" ? 12 : 6);
}
