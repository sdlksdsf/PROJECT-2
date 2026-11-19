/**
 * Typing sounds, synthesised with the Web Audio API.
 *
 * No audio files to download, no extra megabytes in the installer, and the
 * sound is a soft, short "thock" rather than the harsh mechanical clack some
 * gaming browsers ship. Volume is user controlled and it can be switched off
 * entirely in Settings → Search.
 */
let context: AudioContext | null = null;
let lastPlayed = 0;

function ensureContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!context) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    context = new Ctor();
  }
  if (context.state === 'suspended') void context.resume();
  return context;
}

export function playKeySound(volume = 0.35, variant: 'key' | 'enter' | 'back' = 'key'): void {
  if (volume <= 0) return;
  const now = Date.now();
  if (now - lastPlayed < 18) return; // never machine-gun the speaker
  lastPlayed = now;

  const ctx = ensureContext();
  if (!ctx) return;

  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();

  const base = variant === 'enter' ? 210 : variant === 'back' ? 150 : 175 + Math.random() * 26;
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(base, t);
  osc.frequency.exponentialRampToValueAtTime(base * (variant === 'enter' ? 0.6 : 0.78), t + 0.045);

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(variant === 'enter' ? 1500 : 1100, t);

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(0.13 * volume, t + 0.004);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + (variant === 'enter' ? 0.16 : 0.075));

  osc.connect(filter).connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.2);
}

export function warmUpAudio(): void {
  void ensureContext();
}
