// All sound is synthesized: no audio files.
let ctx, master, pad;

export function initAudio() {
  if (ctx) return;
  try { ctx = new AudioContext(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch { ctx = null; }
}

function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
  if (!ctx) return;
  const t = ctx.currentTime + when, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
}

export const notify = () => { tone(740, 0.09, 'sine', 0.12); tone(988, 0.14, 'sine', 0.12, 0.09); };
export const ding = () => { tone(1318, 1.2, 'sine', 0.25); tone(1976, 0.9, 'sine', 0.1, 0.02); };

export function hitmarker() {
  if (!ctx) return;
  const t = ctx.currentTime, len = ctx.sampleRate * 0.05, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), g = ctx.createGain();
  hp.type = 'highpass'; hp.frequency.value = 2500; g.gain.value = 0.5;
  src.buffer = buf; src.connect(hp).connect(g).connect(master); src.start(t);
}

export function airhorn() {
  for (const f of [466, 587, 698]) { tone(f, 0.55, 'sawtooth', 0.09, 0, f * 0.97); tone(f, 0.28, 'sawtooth', 0.09, 0.62, f * 0.97); }
}

// a soft pad that plays while the eyes are closed, so you can hear that resting works
export function rest(on) {
  if (!ctx) return;
  if (on && !pad) {
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    const os = [196, 247, 294].map((f) => { const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f; o.connect(g); o.start(); return o; });
    g.gain.exponentialRampToValueAtTime(0.07, ctx.currentTime + 0.5);
    pad = { g, os };
  } else if (!on && pad) {
    const p = pad; pad = null;
    p.g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    setTimeout(() => p.os.forEach((o) => o.stop()), 500);
  }
}
