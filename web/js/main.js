import { createEyes, keyboardEyes } from './eyes.js';
import { createDrunk } from './drunk.js';
import { createFx } from './fx.js';
import { createFeed } from './feed.js';
import { loadMusic, startMusic, music, stopMusic, musicState, CREDIT } from './music.js';
import { createAds } from './ads.js';
import { tune, setTune } from './tune.js';
import { createChaos } from './chaos.js';
import { createMascotEyes } from './mascot.js';
import { initAudio, ding, rest as restSound, wake, probeSystemSounds, stopSounds } from './audio.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const FALL_S = 2.6;   // seconds of closed eyes to fully sober
const mascot = createMascotEyes();
const show = (id) => { for (const s of ['intro', 'setup', 'stage', 'end']) $(s).hidden = s !== id; mascot.blink(false); mascot.refresh(); };
const fmt = (s) => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');

let eyes = keyboardEyes(), share = null, running = false, stopRun = null, desktopRestKey = null;

// The desktop app (Electron) loads this same page with ?desktop=1 and a small bridge.
// There the stage is a click-through window over the real desktop, showing it live.
const desktop = new URLSearchParams(location.search).has('desktop') ? window.restEasyDesktop : null;
if (desktop) { document.documentElement.classList.add('desktop'); document.body.classList.add('desktop'); desktop.onStop(() => (stopRun ? stopRun() : desktop.quit())); }
desktop?.onRest((closed) => eyes.force(closed));

// ---------- setup ----------
function check(key, cls, text) {
  const li = document.querySelector(`#checks [data-k="${key}"]`);
  li.className = cls;
  if (text != null) { const sp = li.querySelector('span'); const btn = sp.querySelector('button'); sp.textContent = text; if (btn && cls !== 'ok') sp.append(btn); }
}

async function setup() {
  show('setup'); loadMusic(); initAudio();
  eyes.resume?.();
  const brand = navigator.userAgentData?.brands?.find((b) => !/Not/.test(b.brand))?.brand || (/(Firefox|Safari|Chrome)/.exec(navigator.userAgent) || ['browser'])[0];
  check('browser', document.fullscreenEnabled ? 'ok' : 'bad', `${brand} on ${navigator.userAgentData?.platform || navigator.platform}`);
  check('display', 'ok', `${screen.width}×${screen.height} at ${devicePixelRatio}x`);
  check('browser', document.fullscreenEnabled ? 'ok' : 'bad', desktop ? `Desktop app (Electron ${(/Electron\/([\d.]+)/.exec(navigator.userAgent) || [])[1] || ''}, Chromium ${(/Chrome\/(\d+)/.exec(navigator.userAgent) || [])[1] || ''})` : null);
  if (desktop) desktop.stopKeys().then((keys) => check('screen', 'ok', `${desktop.captureMode === 'snapshot' ? 'desktop overlay · screenshot distortion on Mac' : 'live overlay on your real desktop'} · stop: End button${keys.length ? ' or ' + keys.join(' / ') : ''}`));
  else if (!navigator.mediaDevices?.getDisplayMedia) check('screen', '', 'not supported here, using the built-in desktop');

  hardware();
  probeSystemSounds().then((ok) => { const li = document.querySelector('#checks [data-k="sound"]'); li.className = 'ok'; li.querySelector('span').textContent = ok ? 'Teams, Slack and Discord recordings + local system sounds' : 'Teams, Slack and Discord recordings + Windows system sounds'; });
  check('camera', 'wait'); check('tracker', 'wait');
  $('start').disabled = false; watchEyes();   // keyboard mode works right away; the camera upgrades it
  const video = $('camVideo');
  try {
    if (new URLSearchParams(location.search).get('cam') === '0') throw new Error('camera off');   // rehearsal without a camera
    await useCamera(localStorage.getItem('camera') || undefined);
    await listCameras();
  } catch (e) {
    check('camera', 'bad', 'no camera: hold Space to close your eyes');
    check('tracker', '', 'keyboard mode'); check('eyes', '', 'hold Space to test');
    return;
  }
  try {
    eyes = await createEyes(video); eyes.setQuality($('quality').value);
    check('tracker', 'ok', `478-point face mesh on ${eyes.state.delegate}`);
  } catch (e) {
    check('tracker', 'bad', 'model failed to load: keyboard mode');
  }
}

let watching = false;
function watchEyes() {
  if (watching) return; watching = true;
  let nextUpdate = 0;
  const tick = (now = performance.now()) => {
    if (running || $('setup').hidden) { watching = false; return; }
    if (now < nextUpdate) { requestAnimationFrame(tick); return; }
    nextUpdate = now + 100;
    const s = eyes.state;
    mascot.blink(s.closed);
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

// ---------- camera choice and hardware ----------
const camName = (label) => label.replace(/\s*\([0-9a-f]{4}:[0-9a-f]{4}\)/i, '');
async function useCamera(deviceId) {
  const video = $('camVideo');
  video.srcObject?.getTracks().forEach((t) => t.stop());
  const hq = $('quality').value !== 'light';
  const want = hq
    ? { width: { ideal: 640, max: 640 }, height: { ideal: 480, max: 480 }, frameRate: { ideal: 24, max: 24 } }
    : { width: { ideal: 320, max: 320 }, height: { ideal: 240, max: 240 }, frameRate: { ideal: 15, max: 15 } };
  let stream, busy = false;
  try { stream = await navigator.mediaDevices.getUserMedia({ video: deviceId ? { ...want, deviceId: { exact: deviceId } } : { ...want, facingMode: 'user' }, audio: false }); }
  catch (e) {   // saved camera is gone, or another app (often another tab running this page) has it open
    if (!deviceId) throw e;
    busy = e.name === 'NotReadableError';
    stream = await navigator.mediaDevices.getUserMedia({ video: want, audio: false });
  }
  video.srcObject = stream; await video.play();
  const tr = stream.getVideoTracks()[0], st = tr.getSettings();
  const wanted = busy && st.deviceId !== deviceId ? (await navigator.mediaDevices.enumerateDevices()).find((d) => d.deviceId === deviceId) : null;
  check('camera', 'ok', `${camName(tr.label)}, ${st.width}×${st.height} at ${Math.round(st.frameRate || 30)} fps` + (wanted ? ` (${camName(wanted.label) || 'your camera'} is in use by another app or tab)` : ''));
  return st.deviceId;
}
async function listCameras() {
  const pick = $('camPick'), cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
  if (cams.length < 2) return;
  let current = $('camVideo').srcObject.getVideoTracks()[0].getSettings().deviceId;
  // first visit: prefer a real webcam over phone, virtual and infrared cameras
  if (!localStorage.getItem('camera')) {
    const odd = /virtual|phone|obs|IR|infrared|S\d\d|iphone|pixel|galaxy/i, cur = cams.find((c) => c.deviceId === current);
    const better = cams.find((c) => !odd.test(c.label));
    if (better && cur && odd.test(cur.label)) current = await useCamera(better.deviceId);
  }
  pick.replaceChildren(...cams.map((c) => { const o = document.createElement('option'); o.value = c.deviceId; o.textContent = camName(c.label) || 'Camera'; o.selected = c.deviceId === current; return o; }));
  pick.hidden = false;
  pick.onchange = async () => { localStorage.setItem('camera', pick.value); check('camera', 'wait', 'switching…'); try { await useCamera(pick.value); } catch { check('camera', 'bad', 'could not open that camera'); } };
}
async function hardware() {
  let gpu = '';
  try { const gl = document.createElement('canvas').getContext('webgl'), ext = gl.getExtension('WEBGL_debug_renderer_info');
    gpu = (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '').replace(/^ANGLE \(([^,]+, )?/, '').replace(/( \(0x[0-9A-F]+\))? Direct3D.*$| OpenGL.*$|,.*$|\)$/gi, '').trim(); } catch {}
  const native = desktop ? await desktop.hardware().catch(() => null) : null;
  const cpu = native ? `${native.cpu}, ${native.cores} threads, ${native.ramGb} GB` : `${navigator.hardwareConcurrency || '?'} threads${navigator.deviceMemory ? `, ${navigator.deviceMemory}+ GB` : ''}`;
  check('hardware', 'ok', [cpu, gpu].filter(Boolean).join(' · '));
  document.querySelector('#checks [data-k="hardware"] span').title = [cpu, gpu].join(' · ');
}

// ---------- screen share ----------
// A page cannot draw over the real desktop. What it can do: capture the screen.
// Whole monitor: take one frame and show that fullscreen (a live view would show itself, forever).
// A window or another tab: show it live, since our page is not in the picture.
async function shareScreen() {
  try {
    const controller = 'CaptureController' in window ? new CaptureController() : undefined;
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 }, width: { max: 1920 }, height: { max: 1080 } }, audio: false, controller, selfBrowserSurface: 'exclude', monitorTypeSurfaces: 'include' });
    const track = stream.getVideoTracks()[0], surface = track.getSettings().displaySurface || 'monitor';
    try { if (surface !== 'monitor') controller?.setFocusBehavior?.('no-focus-change'); } catch {}
    // do not wait for the first frame: a background tab sends none until it is shown
    const video = document.createElement('video'); video.muted = true; video.srcObject = stream; video.play().catch(() => {});
    share = { stream, surface, video, controller };
    track.onended = () => { if (!running) { share = null; check('screen', '', 'optional'); } };
    check('screen', 'ok', surface === 'monitor' ? 'whole screen: your real desktop gets drunk' : surface === 'browser' ? 'a tab, live (you can scroll it)' : 'a window, live');
  } catch { check('screen', '', 'skipped: using the built-in desktop'); }
}

// ---------- the run ----------
const fx = createFx($('fx'));

async function captureDesktop() {
  const snapshot = desktop.captureMode === 'snapshot', live = $('liveBg');
  if (snapshot) await desktop.captureHidden(true);
  try {
    live.srcObject = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: { ideal: 30, max: 30 }, width: { max: 1920 }, height: { max: 1080 } }, audio: false });
    await live.play();
    if (!snapshot) { live.hidden = false; return live; }
    const still = document.createElement('canvas'); still.width = live.videoWidth; still.height = live.videoHeight;
    if (!still.width || !still.height) throw new Error('No screen capture frame received');
    still.getContext('2d').drawImage(live, 0, 0);
    return still;
  } finally {
    if (snapshot) {
      live.srcObject?.getTracks().forEach((track) => track.stop()); live.srcObject = null;
      await desktop.captureHidden(false);
    }
  }
}

async function start() {
  initAudio(); startMusic();
  const bg = $('bg'), live = $('liveBg'), desk = $('desk');
  bg.className = ''; live.hidden = true; desk.hidden = true; fx.clear();
  $('facecam').prepend($('camVideo'));   // the face cam rides along in the corner

  if (desktop) {
    try {
      fx.setSource(await captureDesktop(), { seeThrough: true });
    } catch (error) { console.warn('Desktop capture unavailable; using transparent effects only:', error.message); }
    show('stage'); desktopRestKey = (await desktop.overlay(true)).restKey;
    return run();
  }
  if (share?.surface === 'monitor' && share.video.videoWidth) {
    // show the built-in desktop in the page for a moment so the frame we take has "work" in it,
    // under your real tab strip and above your real taskbar
    bg.className = 'wall'; desk.hidden = false; show('stage');
    await new Promise((r) => setTimeout(r, 450));
    const v = share.video, c = document.createElement('canvas'); c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d').drawImage(v, 0, 0);
    share.stream.getTracks().forEach((t) => t.stop()); share = null;
    bg.className = ''; desk.hidden = true; fx.setSource(c);
  } else if (share) {
    live.srcObject = share.stream; live.hidden = false; live.play().catch(() => {});
    fx.setSource(live, { contain: true });
    try { await share.controller?.forwardWheel?.($('fx')); } catch {}   // Chrome: scroll the shared tab from here
    show('stage');
  } else {
    bg.className = 'wall'; desk.hidden = false; show('stage');
  }
  try { await document.documentElement.requestFullscreen({ navigationUI: 'hide' }); navigator.keyboard?.lock?.(['Escape']).catch(() => {}); } catch {}
  run();
}

function run() {
  running = true;
  eyes.resume?.();
  const drunk = createDrunk({ world: $('world'), fx, mlg: $('mlg'), toasts: $('toasts'), ads: $('ads') });
  const feed = createFeed($('toasts'), $('chatlog'));
  const ads = createAds($('ads'));
  const chaos = createChaos();
  // Dario gets the first surprise; alternate with Sam so cameos never pile up.
  let cameoAt = 10 + Math.random() * 8, nextCameo = 'dario';
  const pin = parseFloat(params.get('level')) || 0;   // rehearsal: ?level=0.8 starts there
  // seconds of open eyes from sober to fully gone: ?rise=20 in the URL, or the Speed menu
  const RISE_S = Math.max(3, parseFloat(params.get('rise')) || parseFloat($('speed').value) || 12);
  const pace = Math.min(2, Math.max(0.6, RISE_S / 14));   // notifications keep up with the speed
  let level = pin, peak = 0, awake = 0, total = 0, rests = 0, nextToast = 1.2, last = performance.now(), t = 0, closedFor = 0;
  let lastHud = '', lastRing = '', perfN = 0, perfAt = performance.now(), worst = 0;
  let wasClosed = false, restStart = 0, levelAtClose = 0, belled = false;
  const GREET = ['nice rest', 'good morning', 'welcome back', 'rise and shine', 'power nap complete', 'eyelids: rebooted', 'that was a blink, technically'];
  const greet = (secs, recovered) => {
    const m = $('morning'); m.style.setProperty('--c', `hsl(${Math.floor(Math.random() * 360)} 95% 68%)`);
    m.querySelector('b').textContent = GREET[Math.floor(Math.random() * GREET.length)];
    m.querySelector('span').textContent = `rested ${secs.toFixed(1)} s · recovered ${(recovered * 0.4).toFixed(2)} BAC`;
    m.classList.remove('on'); void m.offsetWidth; m.classList.add('on');
  };
  $('endBtn').onclick = () => stop();
  // desktop: the overlay ignores the mouse, except over our own controls
  // desktop: the hit box covers the HUD, and the transparency panel while it is open
  const syncHit = () => { if (!desktop) return; const a = $('hud').getBoundingClientRect(), p = $('tune'); const b = p.hidden ? a : p.getBoundingClientRect();
    const x = Math.min(a.left, b.left) - 6, y = Math.min(a.top, b.top) - 6; desktop.hitBox({ x, y, w: Math.max(a.right, b.right) + 6 - x, h: Math.max(a.bottom, b.bottom) + 6 - y }); };
  $('tuneFg').value = Math.round(tune.fg * 100); $('tuneBg').value = Math.round(tune.bg * 100);
  $('tuneFg').oninput = (e) => setTune('fg', e.target.value / 100);
  $('tuneBg').oninput = (e) => setTune('bg', e.target.value / 100);
  $('brandBtn').onclick = () => { const p = $('tune'); p.hidden = !p.hidden; $('brandBtn').setAttribute('aria-expanded', String(!p.hidden)); syncHit(); };
  syncHit();

  const onClick = (e) => { if (level > 0.72) drunk.hit(e.clientX, e.clientY); };
  const onKey = (e) => { if (e.key === ']') level = Math.min(1, level + 0.15); if (e.key === 'Escape' && !document.fullscreenElement) stop(); };
  const onFs = () => { if (!document.fullscreenElement) stop(); };
  addEventListener('pointerdown', onClick); addEventListener('keydown', onKey); document.addEventListener('fullscreenchange', onFs);

  function stop() {
    if (!running) return; running = false; stopRun = null; if (desktop) desktop.overlay(false);
    eyes.pause?.();
    $('morning').classList.remove('on'); $('tune').hidden = true; $('brandBtn').setAttribute('aria-expanded', 'false');
    removeEventListener('pointerdown', onClick); removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs);
    restSound(false); stopMusic(); stopSounds(); chaos.clear(); ads.clear(); $('credit').textContent = CREDIT; drunk.reset(); feed.clear(); $('mlg').innerHTML = ''; $('rest').classList.remove('on');
    $('liveBg').srcObject?.getTracks().forEach((x) => x.stop()); $('liveBg').srcObject = null; fx.clear(); share = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    $('endTime').textContent = fmt(total); $('endBac').textContent = (peak * 0.4).toFixed(2); $('endRests').textContent = rests;
    show('end');
  }

  stopRun = stop;
  function frame(now) {
    if (!running) return;
    // Keep high-refresh monitors from multiplying inference/compositing work.
    if (now - last < 1000 / 60 - 0.5) { requestAnimationFrame(frame); return; }
    const frameMs = now - last;
    const dt = Math.min(0.1, frameMs / 1000); last = now; t += dt; total += dt;
    // a glance down at the keyboard reads as closed, so eyes must stay shut for 0.4 s to count
    closedFor = eyes.state.closed ? closedFor + dt : 0;
    const closed = closedFor > 0.4;
    if (closed) {
      if (!wasClosed) { wasClosed = true; restStart = t - closedFor; levelAtClose = level; belled = false; }
      level = Math.max(0, level - dt / FALL_S);
      if (level === 0 && !belled) { belled = true; awake = 0; ding(); }   // the bell: fully sober, you can open them
    } else {
      if (wasClosed) { wasClosed = false; rests++; wake(); greet(t - restStart, levelAtClose - level); }
      // a few usable seconds, then it goes fast
      level = Math.min(1, level + dt / RISE_S * (level < 0.12 ? 0.4 : 1.7)); awake += dt;
    }
    peak = Math.max(peak, level);
    if (closed && !$('rest').classList.contains('on')) {
      // Each rest shows one of the CEOs at random.
      const pic = $('rest').querySelector('.rest-pic'), who = [['feed/matias-gym.jpg', 'Elon Musk gym meme'], ['zuck.jpg', 'Mark Zuckerberg'], ['theo.jpg', 'Theo Browne']][Math.floor(Math.random() * 3)];
      pic.src = 'vendor/img/' + who[0]; pic.alt = who[1];
    }
    $('rest').classList.toggle('on', closed);
    restSound(closed && level > 0);
    const ring = level < 0.3 ? 'var(--ok)' : level < 0.7 ? '#ffd166' : 'var(--bad)';
    const face = closed ? 'resting' : eyes.state.delegate === 'keyboard' ? (desktop ? (desktopRestKey ? `${desktopRestKey} = rest` : 'camera needed to rest') : 'Space = rest') : eyes.state.face ? 'open' : 'no face';
    if (ring + face !== lastRing) { lastRing = ring + face; $('hud').style.setProperty('--ring', ring); $('facecam').style.setProperty('--ring', closed ? 'var(--accent)' : ring); $('faceState').textContent = face; }

    const m = music(level, closed, t, dt);
    m.sting = chaos.tick(t, level, closed);   // a meme clip just started: the overlays flinch
    drunk.render(t, level, m);
    ads.tick(t, level, m.energy);
    if (!closed && level > 0.3 && t > cameoAt) {
      drunk[nextCameo]();
      nextCameo = { dario: 'sam', sam: 'zuck', zuck: 'theo', theo: 'dario' }[nextCameo];
      cameoAt = t + 16 + Math.random() * 16;
    }
    const hudText = 'awake ' + fmt(awake) + '|BAC ' + (level * 0.4).toFixed(2);
    if (hudText !== lastHud) { lastHud = hudText; [$('hudAwake').textContent, $('hudBac').textContent] = hudText.split('|'); }

    if (!closed && t > nextToast) {
      let tier = level < 0.14 ? 0 : level < 0.42 ? 1 : level < 0.72 ? 2 : 3;
      if (tier > 0 && Math.random() < 0.25) tier--;
      feed.push(tier);
      nextToast = t + (2.4 - level * 1.7 + Math.random() * 0.5) * pace;
    }
    // one line every 5 s so slowdowns are visible (npm run desktop prints it in the terminal)
    perfN++; worst = Math.max(worst, frameMs);
    if (now - perfAt > 5000) { console.log(`PERF ${Math.round(perfN * 1000 / (now - perfAt))} fps · worst frame ${worst.toFixed(0)} ms · eye ${eyes.state.ms.toFixed(0)} ms · level ${level.toFixed(2)} · heap ${performance.memory ? Math.round(performance.memory.usedJSHeapSize / 2 ** 20) : '?'} MB · nodes ${document.getElementsByTagName('*').length} · music ${musicState.player} energy ${musicState.energy.toFixed(2)} · ${Math.round(total)} s in`); perfN = 0; perfAt = now; worst = 0; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---------- wiring ----------
$('toSetup').onclick = setup;
$('share').onclick = shareScreen;
$('start').onclick = start;
$('again').onclick = () => { $('setup').querySelector('.cam').prepend($('camVideo')); show('setup'); eyes.resume?.(); watchEyes(); };
$('quality').value = localStorage.getItem('quality') || 'high';
$('quality').onchange = async (e) => { localStorage.setItem('quality', e.target.value); eyes.setQuality?.(e.target.value); if ($('camVideo').srcObject) { try { await useCamera($('camPick').value || localStorage.getItem('camera') || undefined); } catch {} } };
$('speed').value = localStorage.getItem('speed') || '12'; $('speed').onchange = (e) => localStorage.setItem('speed', e.target.value);

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

// test hook: ?autorun=60 goes through setup, runs for 60 s, ends. ?cycle=8 closes the eyes for 3 s every 8 s.
const auto = parseFloat(params.get('autorun'));
if (auto) setup().then(start).then(() => {
  const cyc = parseFloat(params.get('cycle'));
  const iv = cyc ? setInterval(() => { eyes.force(true); setTimeout(() => eyes.force(false), 3000); }, cyc * 1000) : 0;
  setTimeout(() => { clearInterval(iv); stopRun?.(); console.log('AUTORUN done'); }, auto * 1000);
});

// desktop app extras
if (desktop) {
  const q = document.createElement('button'); q.className = 'mini'; q.textContent = 'Quit'; q.onclick = () => desktop.quit(); $('end').append(q);
  const q2 = q.cloneNode(true); q2.onclick = q.onclick; $('intro').append(q2);
  if (new URLSearchParams(location.search).has('smoke')) (async () => {   // npm run desktop self-check
    try {
      const source = await captureDesktop();
      // Run the same capture and GPU path used by Start.
      fx.setSource(source); show('stage');
      const c = $('fx'), gl = c.getContext('webgl'), px = new Uint8Array(4); let n = 0, lit = 0; const t0 = performance.now();
      while (performance.now() - t0 < 2500) { fx.draw(n / 30, 0.8); gl.readPixels(c.width >> 1, c.height >> 1, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); lit += px[0] + px[1] + px[2] > 0 ? 1 : 0; n++; await new Promise((r) => setTimeout(r, 0)); }
      source.srcObject?.getTracks().forEach((track) => track.stop());
      if (!lit) throw new Error('Screen capture rendered only black frames');
      console.log(`SMOKE ok ${desktop.captureMode} capture ${source.videoWidth || source.width}x${source.videoHeight || source.height} bridge ${typeof desktop.overlay} shader ${c.width}x${c.height} ${((performance.now() - t0) / n).toFixed(1)} ms/frame lit ${lit}/${n}`);
    } catch (e) { console.log('SMOKE fail ' + e.message); }
  })();
}
