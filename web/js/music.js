// Music for the deep end: an NCS release, streamed from NoCopyrightSounds' own YouTube upload.
// Nothing is copied into this repo. Offline, the run is simply without music.
const ID = 'J2X5mJ3HDYE';   // DEAF KEV - Invincible [NCS Release]
export const CREDIT = 'Music: DEAF KEV - Invincible [NCS Release], provided by NoCopyrightSounds';
let frame = null, playing = false, vol = -1, last = 0;
export const musicState = { ready: false, player: -1 };   // player: YouTube state, 1 = playing

const send = (func, args = []) => frame?.contentWindow?.postMessage(JSON.stringify({ event: 'command', func, args }), '*');
addEventListener('message', (e) => {
  if (!frame || e.source !== frame.contentWindow) return;
  try { const d = JSON.parse(e.data); if (d.event === 'onReady' || d.info) musicState.ready = true; if (d.info?.playerState != null) musicState.player = d.info.playerState; } catch {}
});

// call from the Start click, so the browser lets it play later
export function loadMusic() {
  if (frame || !navigator.onLine) return;
  frame = document.createElement('iframe'); frame.className = 'music'; frame.tabIndex = -1; frame.allow = 'autoplay; encrypted-media';
  frame.referrerPolicy = 'strict-origin-when-cross-origin';
  frame.src = `https://www.youtube-nocookie.com/embed/${ID}?enablejsapi=1&controls=0&playsinline=1&start=50&loop=1&playlist=${ID}&origin=${encodeURIComponent(location.origin)}`;
  frame.onload = () => frame.contentWindow.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), '*');
  document.body.append(frame);
}

// amount 0..1: silent at 0, louder as the screen goes
export function music(amount, now) {
  if (!frame) return;
  const want = amount > 0;
  if (want !== playing || (want && musicState.player !== 1 && now - last > 1500)) { playing = want; last = now; send(want ? 'playVideo' : 'pauseVideo'); }
  const v = Math.round(amount * 14) * 5;
  if (want && v !== vol) { vol = v; send('setVolume', [v]); }
}
export function stopMusic() { playing = false; vol = -1; send('pauseVideo'); }
