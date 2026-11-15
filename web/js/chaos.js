// Random meme clips layer over music and notifications without taking their audio slots.
import { notificationAudio } from './audio.js';
import { CHAOS_FILES } from './chaos-files.js';

const DIR = new URL('../vendor/chaos/', import.meta.url).href;

export function createChaos() {
  const bank = CHAOS_FILES.map(file => {
    const audio = new Audio(DIR + file);
    audio.preload = 'auto';
    return audio;
  });
  const active = new Map();
  let bag = [], previous = -1, nextAt = null, lastTime = null;

  function choose() {
    if (!bag.length) {
      bag = bank.map((_, i) => i);
      for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      if (bag.at(-1) === previous) [bag[0], bag[bag.length - 1]] = [bag.at(-1), bag[0]];
    }
    previous = bag.pop();
    return bank[previous];
  }

  function stop(audio) {
    audio.pause();
    audio.onended = audio.onerror = null;
    active.delete(audio);
  }

  function clear() {
    for (const audio of active.keys()) stop(audio);
    nextAt = null;
    lastTime = null;
  }

  function tick(t, level, closed) {
    if (!Number.isFinite(t) || !Number.isFinite(level)) { clear(); return; }
    if (closed || level < 0.18) { clear(); return; }
    if (lastTime !== null && t < lastTime) clear();
    lastTime = t;
    const intensity = Math.min(1, Math.max(0, (level - 0.18) / 0.82));
    // Sparse interruptions become a layered storm: ~0.25 to 4 new clips per second.
    const rate = 0.25 + 3.75 * intensity ** 2;
    const volume = (0.24 + 0.16 * intensity) * (notificationAudio.active > 0 ? 0.45 : 1);
    for (const [audio, expiry] of active) {
      if (t >= expiry) stop(audio);
      else audio.volume = volume;
    }
    if (nextAt === null) nextAt = t + (0.65 + Math.random() * 0.7) / rate;
    if (t < nextAt) return;
    // No queued burst after a stalled frame, and no unbounded audio nodes.
    nextAt = t + (0.65 + Math.random() * 0.7) / rate;
    while (active.size >= 5) stop(active.keys().next().value);
    const audio = choose().cloneNode();
    audio.volume = volume;
    audio.onended = audio.onerror = () => stop(audio);
    active.set(audio, t + 5);
    audio.play().catch(() => stop(audio));
  }

  return { tick, clear };
}
