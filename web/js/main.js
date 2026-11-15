import { createEyes, keyboardEyes } from './eyes.js';
import { createDrunk } from './drunk.js';
import { createFeed } from './feed.js';
import { initAudio, ding, rest as restSound } from './audio.js';

const $ = (id) => document.getElementById(id);
const RISE_S = 34;    // seconds of open eyes from sober to fully gone
const FALL_S = 2.6;   // seconds of closed eyes to fully sober
const show = (id) => { for (const s of ['intro', 'setup', 'stage', 'end']) $(s).hidden = s !== id; };
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

let eyes = keyboardEyes(), share = null, running = false, stopRun = null;

// The desktop app (Electron) loads this same page with ?desktop=1 and a small bridge.
// There the stage is a click-through window over the real desktop, showing it live.
const desktop = new URLSearchParams(location.search).has('desktop') ? window.restEasyDesktop : null;
if (desktop) { document.body.classList.add('desktop'); desktop.onStop(() => (stopRun ? stopRun() : desktop.quit())); }

// ---------- setup ----------
function check(key, cls, text) {
  const li = document.querySelector(`#checks [data-k="${key}"]`);
  li.className = cls;
  if (text != null) { const sp = li.querySelector('span'); const btn = sp.querySelector('button'); sp.textContent = text; if (btn && cls !== 'ok') sp.append(btn); }
}

async function setup() {
  show('setup');
  const brand = navigator.userAgentData?.brands?.find((b) => !/Not/.test(b.brand))?.brand || (/(Firefox|Safari|Chrome)/.exec(navigator.userAgent) || ['browser'])[0];
  check('browser', document.fullscreenEnabled ? 'ok' : 'bad', `${brand} on ${navigator.userAgentData?.platform || navigator.platform}`);
  check('display', 'ok', `${screen.width}×${screen.height} at ${devicePixelRatio}x`);
  if (desktop) check('screen', 'ok', 'live overlay on your real desktop (Ctrl+Shift+X stops it)');
  else if (!navigator.mediaDevices?.getDisplayMedia) check('screen', '', 'not supported here, using the built-in desktop');

  check('camera', 'wait'); check('tracker', 'wait');
  $('start').disabled = false; watchEyes();   // keyboard mode works right away; the camera upgrades it
  const video = $('camVideo');
  try {
    if (new URLSearchParams(location.search).get('cam') === '0') throw new Error('camera off');   // rehearsal without a camera
    const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 30, facingMode: 'user' }, audio: false });
    video.srcObject = stream; await video.play();
    const tr = stream.getVideoTracks()[0], st = tr.getSettings();
    check('camera', 'ok', `${tr.label.replace(/\s*\([0-9a-f:]+\)/i, '')}, ${st.width}×${st.height}`);
  } catch (e) {
    check('camera', 'bad', 'no camera: hold Space to close your eyes');
    check('tracker', '', 'keyboard mode'); check('eyes', '', 'hold Space to test');
    return;
  }
  try {
    eyes = await createEyes(video);
    check('tracker', 'ok', `478-point face mesh on ${eyes.state.delegate}`);
  } catch (e) {
    check('tracker', 'bad', 'model failed to load: keyboard mode');
  }
}

let watching = false;
function watchEyes() {
  if (watching) return; watching = true;
  const tick = () => {
    if (running || $('setup').hidden) { watching = false; return; }
    const s = eyes.state;
    $('eyeState').textContent = s.closed ? 'closed' : s.face ? 'open' : 'no face';
    $('eyeState').classList.toggle('closed', s.closed);
    $('eyeMeter').style.width = Math.round(s.score * 100) + '%';
    if (s.blinks >= 2) check('eyes', 'ok', `tracking, ${s.blinks} blinks seen, ${s.ms.toFixed(0)} ms per frame`);
    else if (s.face || s.delegate === 'keyboard') check('eyes', 'wait', `blink twice to confirm (${s.blinks}/2)`);
    else check('eyes', 'wait', 'looking for your face…');
    requestAnimationFrame(tick);
  };
  tick();
}

// ---------- screen share ----------
// A page cannot draw over the real desktop. What it can do: capture the screen.
// Whole monitor: take one frame and show that fullscreen (a live view would show itself, forever).
// A window or another tab: show it live, since our page is not in the picture.
async function shareScreen() {
  try {
    const controller = 'CaptureController' in window ? new CaptureController() : undefined;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false, controller, selfBrowserSurface: 'exclude', monitorTypeSurfaces: 'include' });
    const track = stream.getVideoTracks()[0], surface = track.getSettings().displaySurface || 'monitor';
    try { if (surface !== 'monitor') controller?.setFocusBehavior?.('no-focus-change'); } catch {}
    const video = document.createElement('video'); video.muted = true; video.srcObject = stream; await video.play();
    share = { stream, surface, video, controller };
    track.onended = () => { if (!running) { share = null; check('screen', '', 'optional'); } };
    check('screen', 'ok', surface === 'monitor' ? 'whole screen: your real desktop gets drunk' : surface === 'browser' ? 'a tab, live (you can scroll it)' : 'a window, live');
  } catch { check('screen', '', 'skipped: using the built-in desktop'); }
}

// ---------- the run ----------
async function start() {
  initAudio();
  const world = $('world'), bg = $('bg'), ghost = $('ghost'), live = $('liveBg'), desk = $('desk');
  bg.className = ghost.className = ''; bg.style.backgroundImage = ghost.style.backgroundImage = ''; live.hidden = true; desk.hidden = true;

  // keep the camera video rendering while the setup screen is hidden
  const cam = $('camVideo'); Object.assign(cam.style, { position: 'fixed', width: '2px', height: '2px', opacity: '0.01', left: '0', top: '0' }); $('stage').appendChild(cam);

  ghost.replaceChildren();
  if (desktop) {
    // the window is excluded from capture, so a live view of the whole screen does not show itself
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 }, audio: false });
      live.srcObject = stream; live.hidden = false; live.classList.add('fill'); live.play();
      const twin = document.createElement('video'); twin.muted = true; twin.srcObject = stream; twin.className = 'fill'; twin.play(); ghost.append(twin);
    } catch { /* no capture: the overlay still draws notifications and chaos over the real screen */ }
    show('stage'); await desktop.overlay(true);
    return run();
  }
  if (share?.surface === 'monitor') {
    // show the built-in desktop in the page for a moment so the frame we take has "work" in it,
    // under your real tab strip and above your real taskbar
    bg.className = 'wall'; desk.hidden = false; show('stage');
    await new Promise((r) => setTimeout(r, 450));
    const v = share.video, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    const url = await new Promise((r) => c.toBlob((b) => r(URL.createObjectURL(b)), 'image/jpeg', 0.92));
    share.stream.getTracks().forEach((t) => t.stop()); share = null;
    bg.className = ghost.className = ''; bg.style.backgroundImage = ghost.style.backgroundImage = `url(${url})`; desk.hidden = true;
  } else if (share) {
    live.srcObject = share.stream; live.hidden = false; live.play();
    try { await share.controller?.forwardWheel?.(live); } catch {}   // Chrome: scroll the shared tab from here
    show('stage');
  } else {
    bg.className = ghost.className = 'wall'; desk.hidden = false; show('stage');
  }
  try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); navigator.keyboard?.lock?.(['Escape']).catch(() => {}); } catch {}
  run();
}

function run() {
  running = true;
  const drunk = createDrunk({ world: $('world'), ghost: $('ghost'), mlg: $('mlg'), toasts: $('toasts') });
  const feed = createFeed($('toasts'), $('chatlog'));
  const pin = parseFloat(new URLSearchParams(location.search).get('level')) || 0;   // rehearsal: ?level=0.8 starts there
  let level = pin, peak = 0, awake = 0, total = 0, rests = 0, rested = true, nextToast = 2.5, last = performance.now(), t = 0, closedFor = 0;

  const onClick = (e) => { if (level > 0.72) drunk.hit(e.clientX, e.clientY); };
  const onKey = (e) => { if (e.key === ']') level = Math.min(1, level + 0.15); if (e.key === 'Escape' && !document.fullscreenElement) stop(); };
  const onFs = () => { if (!document.fullscreenElement) stop(); };
  addEventListener('pointerdown', onClick); addEventListener('keydown', onKey); document.addEventListener('fullscreenchange', onFs);

  function stop() {
    if (!running) return; running = false; stopRun = null; if (desktop) desktop.overlay(false);
    removeEventListener('pointerdown', onClick); removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs);
    restSound(false); drunk.reset(); feed.clear(); $('mlg').innerHTML = ''; $('rest').classList.remove('on');
    $('liveBg').srcObject?.getTracks().forEach((x) => x.stop()); share = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('endTime').textContent = fmt(total); $('endBac').textContent = (peak * 0.4).toFixed(2); $('endRests').textContent = rests;
    show('end');
  }

  stopRun = stop;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000); last = now; t += dt; total += dt;
    // a glance down at the keyboard reads as closed, so eyes must stay shut for 0.4 s to count
    closedFor = eyes.state.closed ? closedFor + dt : 0;
    const closed = closedFor > 0.4;
    if (closed) {
      level = Math.max(0, level - dt / FALL_S);
      if (level === 0 && !rested) { rested = true; rests++; awake = 0; ding(); }
    } else {
      if (rested && level === 0 && total > 1 && rests > 0 && !$('morning').classList.contains('on')) { $('morning').classList.add('on'); setTimeout(() => $('morning').classList.remove('on'), 1700); }
      level = Math.min(1, level + dt / RISE_S); awake += dt; if (level > 0.02) rested = false;
    }
    peak = Math.max(peak, level);
    $('rest').classList.toggle('on', closed && !rested);
    restSound(closed && !rested);

    drunk.render(t, level);
    $('hudAwake').textContent = 'awake ' + fmt(awake);
    $('hudBac').textContent = 'screen BAC ' + (level * 0.4).toFixed(2);
    $('hudBac').style.color = level < 0.3 ? 'var(--ok)' : level < 0.7 ? '#ffd166' : 'var(--bad)';

    if (!closed && t > nextToast) {
      let tier = level < 0.14 ? 0 : level < 0.42 ? 1 : level < 0.72 ? 2 : 3;
      if (tier > 0 && Math.random() < 0.25) tier--;
      feed.push(tier);
      nextToast = t + 4.2 - level * 3.2 + Math.random() * 0.8;
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- wiring ----------
$('toSetup').onclick = setup;
$('share').onclick = shareScreen;
$('start').onclick = start;
$('again').onclick = () => { $('setup').querySelector('.cam').prepend($('camVideo')); $('camVideo').removeAttribute('style'); show('setup'); watchEyes(); };

const inField = (e) => /INPUT|TEXTAREA/.test(e.target.tagName);
addEventListener('keydown', (e) => { if (e.code === 'Space' && !inField(e)) { e.preventDefault(); if (!e.repeat) eyes.force(true); } });
addEventListener('keyup', (e) => { if (e.code === 'Space' && !inField(e)) eyes.force(false); });

// built-in desktop: draggable windows, a clock, a chat that answers back
for (const win of document.querySelectorAll('.win')) {
  const head = win.querySelector('header');
  head.onpointerdown = (e) => {
    const r = win.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top; head.setPointerCapture(e.pointerId);
    head.onpointermove = (m) => { win.style.left = m.clientX - ox + 'px'; win.style.top = m.clientY - oy + 'px'; };
    head.onpointerup = () => { head.onpointermove = null; };
  };
}
setInterval(() => { $('clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); }, 1000);
$('chatform').onsubmit = (e) => {
  e.preventDefault(); const inp = e.target.querySelector('input'); if (!inp.value.trim()) return;
  const add = (who, msg) => { const p = document.createElement('p'), b = document.createElement('b'); b.textContent = who; p.append(b, msg); $('chatlog').append(p); $('chatlog').scrollTop = 1e6; };
  add('you', inp.value); inp.value = ''; setTimeout(() => add('Dave (Manager)', 'per my last message'), 900);
};

// desktop app extras
if (desktop) {
  const q = document.createElement('button'); q.className = 'mini'; q.textContent = 'Quit'; q.onclick = () => desktop.quit(); $('end').append(q);
  const q2 = q.cloneNode(true); q2.onclick = q.onclick; $('intro').append(q2);
  if (new URLSearchParams(location.search).has('smoke')) (async () => {   // npm run desktop self-check
    try {
      const st = await navigator.mediaDevices.getDisplayMedia({ video: true }); const v = document.createElement('video'); v.muted = true; v.srcObject = st; await v.play();
      console.log(`SMOKE ok capture ${v.videoWidth}x${v.videoHeight} bridge ${typeof desktop.overlay}`);
    } catch (e) { console.log('SMOKE fail ' + e.message); }
  })();
}
