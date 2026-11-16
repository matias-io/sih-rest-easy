// App-owned recordings and real OS assets. Provenance: vendor/sounds/sources.json.
const DIR = new URL('../vendor/sounds/', import.meta.url).href;
const MEME_DIR = new URL('../vendor/chaos/', import.meta.url).href;
const MEMES = ['vine-boom.mp3', 'crying-cat.mp3', 'gta-v-wasted.mp3', 'mlg-air-horn.mp3', 'oh-no-no-no-laugh.mp3'];
let memeBag = [], lastMeme;
const FILES = {
  slack: 'slack-message.mp3', teams: 'teams-message.mp3', teamsCall: 'teams-call.mp3',
  discord: 'discord-message.mp3', discordCall: 'discord-call.mp3',
  discordJoin: 'discord-join.mp3', discordLeave: 'discord-leave.mp3',
  pagerduty: 'pagerduty-notification.mp3',
  message: 'windows-system.wav', email: 'windows-email.wav', calendar: 'windows-calendar.wav',
  system: 'windows-system.wav', critical: 'windows-critical.wav',
  bell: 'ChargingStarted.ogg', wake: 'Unlock.ogg', sleep: 'Lock.ogg', tick: 'camera_click.ogg'
};
const SYSTEM_KINDS = ['message', 'email', 'calendar', 'system', 'critical'];
const bank = {};
const active = new Map();
// Only app/OS notifications duck the soundtrack; UI effects keep their own mix.
export const notificationAudio = { active: 0 };
let ready = false;
export function initAudio() {
  if (ready) return;
  ready = true;
  for (const [kind, file] of Object.entries(FILES)) {
    if (!bank[kind]) { bank[kind] = new Audio(DIR + file); bank[kind].preload = 'auto'; }
  }
  for (const file of MEMES) { bank[file] = new Audio(MEME_DIR + file); bank[file].preload = 'auto'; }
}
export async function probeSystemSounds() {
  try {
    const response = await fetch('system-sound/system', { method: 'HEAD' });
    if (!response.ok || !/audio/.test(response.headers.get('content-type') || '')) return false;
    for (const kind of SYSTEM_KINDS) { bank[kind] = new Audio('system-sound/' + kind); bank[kind].preload = 'auto'; }
    return true;
  } catch { return false; }
}
function play(kind, volume = 0.55, maxMs = 4000, notification = false) {
  initAudio();
  const source = bank[kind];
  if (!source) return () => {};
  // One ringtone at a time; bounded overlap keeps a notification storm responsive.
  if (/Call$/.test(kind)) for (const entry of active.values()) if (/Call$/.test(entry.kind)) entry.stop();
  while (active.size >= 8) active.values().next().value.stop();
  const audio = source.cloneNode();
  let timer;
  const stop = () => {
    clearTimeout(timer); audio.pause();
    if (active.delete(audio) && notification) notificationAudio.active--;
  };
  active.set(audio, { kind, stop });
  if (notification) notificationAudio.active++;
  audio.volume = volume;
  audio.onended = stop; audio.onerror = stop;
  timer = setTimeout(stop, maxMs);
  audio.play().catch(stop);
  return stop;
}
export const notify = (kind = 'system') => play(FILES[kind] ? kind : 'system', 1, /Call$/.test(kind) ? 6500 : 4000, true);
export function notifyPopup(kind, tier) {
  if (tier < 2 || (tier === 2 && Math.random() < 0.5)) return notify(kind);
  if (!memeBag.length) {
    memeBag = [...MEMES];
    for (let i = memeBag.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [memeBag[i], memeBag[j]] = [memeBag[j], memeBag[i]];
    }
    if (memeBag.at(-1) === lastMeme) [memeBag[0], memeBag[memeBag.length - 1]] = [memeBag.at(-1), memeBag[0]];
  }
  lastMeme = memeBag.pop();
  return play(lastMeme, 1, 5000, true);
}
export function stopSounds() { for (const entry of active.values()) entry.stop(); }
export const ding = () => play('bell', 0.7);
export const hitmarker = () => play('tick', 0.5);
export function rest(on) { if (on !== rest.on) { rest.on = on; if (on) { stopSounds(); play('sleep', 0.5); } } }
export const wake = () => play('wake', 0.5);
