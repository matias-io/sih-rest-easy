// No synthesized sound. Two official sources:
//  - Android system sounds from Google's AOSP (Apache 2.0), shipped in vendor/sounds. Used everywhere.
//  - The operating system's own notification and ring sounds, when the page is served by the local
//    app (npm run web / npm run desktop). They are read from the computer, never shipped.
const DIR = new URL('../vendor/sounds/', import.meta.url).href;
const FILES = {
  message: 'Proxima', email: 'Polaris', calendar: 'Spica', system: 'Tejat', critical: 'LowBattery', call: 'Andromeda',
  bell: 'ChargingStarted', wake: 'Unlock', sleep: 'Lock', tick: 'camera_click', horn: 'Argon'
};
const SYSTEM_KINDS = ['message', 'email', 'calendar', 'call', 'system', 'critical'];
const bank = {};
let ready = false, system = false;

export function initAudio() {
  if (ready) return; ready = true;
  for (const [k, f] of Object.entries(FILES)) { if (!bank[k]) { bank[k] = new Audio(DIR + f + '.ogg'); bank[k].preload = 'auto'; } }
}

export async function probeSystemSounds() {
  try { const r = await fetch('system-sound/system', { method: 'HEAD' }); system = r.ok && /audio/.test(r.headers.get('content-type') || ''); } catch { system = false; }
  if (system) for (const k of SYSTEM_KINDS) { bank[k] = new Audio('system-sound/' + k); bank[k].preload = 'auto'; }
  return system;
}

// play a sound; overlapping plays get their own copy. maxMs cuts long ones (ringtones, alarms) short.
function play(kind, volume = 0.6, maxMs = 0) {
  const src = bank[kind]; if (!src) return;
  const a = src.paused ? src : src.cloneNode();
  a.volume = volume; a.currentTime = 0; a.play().catch(() => {});
  if (maxMs) setTimeout(() => { a.pause(); }, maxMs);
}

export const notify = (kind = 'system') => play(bank[kind] ? kind : 'system', 0.55, kind === 'call' ? 2600 : 0);
export const ding = () => play('bell', 0.7);          // fully sober: you can open your eyes
export const hitmarker = () => play('tick', 0.5);
export const airhorn = () => play('horn', 0.45, 1100);
export function rest(on) { if (on !== rest.on) { rest.on = on; if (on) play('sleep', 0.5); } }
export const wake = () => play('wake', 0.5);
