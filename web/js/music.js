// The soundtrack, and the pulse everything else moves to.
import { notificationAudio } from './audio.js';
// DEAF KEV - Invincible [NCS Release], from NoCopyrightSounds. The track opens quiet for about
// ten seconds and then drops, which is the shape of a run: usable, then not.
// The audio goes through an analyser, so the visuals follow what is actually playing.
const SRC = new URL('../vendor/music/invincible.mp3', import.meta.url).href;
export const CREDIT = 'Music: DEAF KEV - Invincible [NCS Release], provided by NoCopyrightSounds · Photos: Sam Altman by TechCrunch; Dario Amodei by Kimberly White / Getty Images for TechCrunch, both CC BY 2.0';
let audio = null, ctx = null, an = null, gain = null, buf = null, avg = 0.3, lastBeat = 0;
// energy 0..1: how loud the music is now. kick 1..0: jumps on each beat, then decays.
// mode / seed: which glitch the screen does on the beat, re-rolled on some beats.
export const musicState = { ready: false, player: -1, energy: 0, kick: 0, beat: false, mode: 0, seed: 0 };

// call early (setup screen) so the file is already buffered when the run starts
export function loadMusic() {
  if (audio) return;
  audio = new Audio(SRC); audio.loop = true; audio.preload = 'auto';
  audio.addEventListener('canplaythrough', () => { musicState.ready = true; }, { once: true });
  audio.load();
}

// call from the Start click
export function startMusic() {
  loadMusic();
  try {
    if (!ctx) {
      ctx = new AudioContext();
      const src = ctx.createMediaElementSource(audio);
      an = ctx.createAnalyser(); an.fftSize = 1024; an.smoothingTimeConstant = 0.5;
      gain = ctx.createGain(); gain.gain.value = 0;
      src.connect(an); an.connect(gain); gain.connect(ctx.destination);
      buf = new Uint8Array(an.frequencyBinCount);
    }
    ctx.resume(); audio.currentTime = 0; audio.play().catch(() => {});
  } catch {}
}

// once per frame. level 0..1, closed = resting, t seconds, dt seconds
export function music(level, closed, t, dt) {
  const s = musicState; let bass, e;
  const live = !!an && !audio.paused && audio.currentTime > 0;
  s.player = live ? 1 : 2;
  if (live) {
    an.getByteFrequencyData(buf);
    let b = 0, a = 0; for (let i = 1; i < 8; i++) b += buf[i]; for (let i = 0; i < 200; i++) a += buf[i];
    bass = b / 7 / 255; e = Math.min(1, Math.max(0, (a / 200 / 255 - 0.12) * 1.9));
    // Silent when sober (BAC 0), quiet while BAC is low, full by the top.
    const sober = level <= 0.001, ramp = 0.04 + 0.96 * level ** 1.6;
    const baseVolume = sober ? 0 : closed ? Math.min(0.1, ramp) : ramp;
    // Keep the track playing underneath alerts; recover smoothly after the last one ends.
    const targetVolume = 0.8 * baseVolume * (notificationAudio.active > 0 ? 0.35 : 1);
    gain.gain.value += (targetVolume - gain.gain.value) * 0.08;
  } else {
    // no audio (blocked or still loading): a 128 bpm stand-in so the screen still has a pulse
    bass = (t * 2.13) % 1 < 0.15 ? 1 : 0.3; e = 0.6 + 0.3 * Math.sin(t * 0.5);
  }
  s.energy += (e - s.energy) * 0.12;
  avg += (bass - avg) * 0.03;
  const gap = t - lastBeat;
  s.beat = (bass > avg * 1.2 && bass > 0.45 && gap > 0.22) || (s.energy > 0.55 && gap > 0.47);
  if (s.beat) { lastBeat = t; s.kick = 1; if (Math.random() < 0.4) { s.mode = Math.floor(Math.random() * 8); s.seed = Math.random() * 100; } }
  else s.kick *= Math.exp(-7 * dt);
  return s;
}
export function stopMusic() { audio?.pause(); musicState.kick = 0; }
