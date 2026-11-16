// Checks the website's "where the run happens" rules in a private Chrome, over raw CDP:
//   1. Start is locked until a mode is picked; the desktop-app panel opens.
//   2. Sharing a whole screen is refused (Chrome's auto-picker chooses "Entire screen").
//   3. Sharing a Chrome tab is accepted and plays live on the stage (a stand-in tab stream; see below).
//   4. The practice desktop's five tasks can all be done, and the end screen scores them.
// usage: node tools/share-audit.mjs http://127.0.0.1:8770 .local/audit/share
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const CHROME = process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const report = (name, pass, detail) => { results.push({ name, pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${detail ? '  (' + detail + ')' : ''}`); };

async function browser(extraFlags) {
  const profile = mkdtempSync(join(tmpdir(), 'rest-share-'));
  const port = 9400 + Math.floor(Math.random() * 400);
  const proc = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--use-fake-device-for-media-stream',
    '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--hide-scrollbars', '--no-first-run', ...extraFlags, 'about:blank'], { stdio: 'ignore' });
  let ws, id = 0; const pending = new Map();
  for (let i = 0; i < 60 && !ws; i++) { try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); ws = new WebSocket((await r.json()).webSocketDebuggerUrl); } catch { await sleep(200); } }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const n = ++id; pending.set(n, (m) => (m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result))); ws.send(JSON.stringify({ id: n, method, params, sessionId })); });
  async function page(url, w = 1440, h = 900) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => send(m, p, sessionId);
    await s('Page.enable'); await s('Runtime.enable');
    await s('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false });
    await s('Page.navigate', { url }); await sleep(2200);
    const ev = async (expr, gesture = false) => { const r = await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true, userGesture: gesture }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const shot = async (file, clip) => { const { data } = await s('Page.captureScreenshot', { format: 'png', ...(clip ? { clip: { ...clip, scale: 1 } } : {}) }); writeFileSync(join(out, file), Buffer.from(data, 'base64')); };
    return { s, ev, shot, targetId };
  }
  const close = async () => { proc.kill(); await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  return { send, page, close };
}
const toSetup = `document.getElementById('toSetup').click(); await new Promise((r) => setTimeout(r, 3500));`;
const screenText = `document.querySelector('#checks [data-k="screen"] span').textContent`;

// 1 and 4: setup rules and the practice desktop
{
  const b = await browser([]);
  const p = await b.page(base + '/?cam=0&rise=40');
  await p.ev(`(async () => { ${toSetup} })()`);
  const locked = await p.ev(`document.getElementById('start').disabled && !document.getElementById('modes').hidden`);
  report('Start is locked until a mode is picked', locked);
  await p.shot('1-setup.png');
  await p.ev(`document.getElementById('modeApp').click()`); await sleep(300);
  report('Desktop app card opens the run-it panel', await p.ev(`!document.getElementById('getApp').hidden`));
  await p.shot('2-get-app.png');
  await p.ev(`document.getElementById('modeSim').click()`); await sleep(200);
  report('Practice desktop unlocks Start', await p.ev(`!document.getElementById('start').disabled`), await p.ev(screenText));
  await p.ev(`document.getElementById('start').click()`); await sleep(2500);
  report('Practice desktop shows the to-do list', await p.ev(`document.querySelectorAll('#todo li').length === 5 && !document.getElementById('desk').hidden`));
  // dodge: past half drunk the Approve button moves away from a cursor next to it
  await p.ev(`(async () => { for (let i = 0; i < 6; i++) document.dispatchEvent(new KeyboardEvent('keydown', { key: ']', bubbles: true })); })()`);
  await sleep(600);
  const btn = await p.ev(`(() => { const r = document.querySelector('.approve').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
  for (let i = 0; i < 12; i++) { await p.s('Input.dispatchMouseEvent', { type: 'mouseMoved', x: btn.x - 30 + i * 2, y: btn.y + 5 }); await sleep(40); }
  const moved = await p.ev(`document.querySelector('.approve').style.transform`);
  report('Approve button dodges the cursor when drunk', /translate\((?!0px, 0px)/.test(moved || ''), moved);
  // do the work: write, reply, approve, clear three notifications, take a call
  await p.ev(`(() => { const t = document.querySelector('#winNotes textarea'); t.value += '\\nRevenue is up, morale is up, and I have blinked twice today which is more than the plan required for this quarter.'; t.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await p.ev(`(() => { const f = document.getElementById('chatform'); f.querySelector('input').value = 'on it, Dave'; f.requestSubmit(); })()`);
  await p.ev(`document.querySelector('.approve').click()`);
  const deadline = Date.now() + 70000;
  while (Date.now() < deadline) {
    const st = await p.ev(`(() => { const call = document.querySelector('#toasts .toast.call'); const done = [...document.querySelectorAll('#todo li.done')].map((l) => l.dataset.task);
      if (call && !done.includes('call')) { call.click(); return done; }
      const t = document.querySelector('#toasts .toast:not(.out)'); if (t && !done.includes('clear')) t.click(); return done; })()`);
    if (st.length === 5) break;
    await sleep(700);
  }
  const done = await p.ev(`[...document.querySelectorAll('#todo li.done')].map((l) => l.dataset.task).join(',')`);
  report('All five tasks can be completed by doing them', done.split(',').length === 5, done);
  await p.ev(`(() => { for (const el of document.querySelectorAll('#toasts > *, #ads > *, #mlg > *')) el.remove(); })()`);
  const todo = await p.ev(`(() => { const r = document.getElementById('winTodo').getBoundingClientRect(); return { x: r.left - 6, y: r.top - 6, width: r.width + 12, height: r.height + 12 }; })()`);
  await p.shot('4-todo.png', todo);
  await p.shot('3-practice-desktop.png');
  await p.ev(`document.getElementById('endBtn').click()`); await sleep(1500);
  report('End screen scores the work', await p.ev(`document.getElementById('endWork').textContent`) === 'Work done: 5 of 5 tasks.', await p.ev(`document.getElementById('endWork').textContent`));
  await p.shot('5-end.png');
  await b.close();
}

// 2: a whole screen or a window is refused. Headless Chrome has no screen to pick, so the page gets a
// stand-in capture whose track reports that surface; this checks the page's own rule, not Chrome's picker.
{
  const b = await browser([]);
  for (const surface of ['monitor', 'window']) {
    const p = await b.page(base + '/?cam=0');
    await p.ev(`(async () => { ${toSetup} })()`);
    await p.ev(`(() => { window.__tracks = []; navigator.mediaDevices.getDisplayMedia = async () => {
      const c = document.createElement('canvas'); c.width = 64; c.height = 64; c.getContext('2d').fillRect(0, 0, 64, 64);
      const s = c.captureStream(5), t = s.getVideoTracks()[0], gs = t.getSettings.bind(t);
      t.getSettings = () => ({ ...gs(), displaySurface: '${surface}' }); window.__tracks.push(t); return s; }; })()`);
    await p.ev(`document.getElementById('modeTab').click()`, true); await sleep(800);
    const text = await p.ev(screenText);
    const locked = await p.ev(`document.getElementById('start').disabled`);
    const stopped = await p.ev(`window.__tracks.every((t) => t.readyState === 'ended')`);
    report(`Sharing a ${surface === 'monitor' ? 'whole screen' : 'window'} is refused, stopped, and Start stays locked`, locked && stopped && /whole screen|window/.test(text), text.slice(0, 60));
    if (surface === 'monitor') await p.shot('6-screen-refused.png');
  }
  await b.close();
}

// 3: another tab is accepted and plays live. The page gets a stand-in tab stream (a white document drawn on a
// canvas) because headless Chrome's picker can't be pointed at another tab; brightness proves the stage shows it.
{
  const b = await browser([]);
  const p = await b.page(base + '/?cam=0&level=0.3&rise=60');
  await p.ev(`(async () => { ${toSetup} })()`);
  await p.ev(`(() => { navigator.mediaDevices.getDisplayMedia = async () => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 800; const x = c.getContext('2d');
    const paint = () => { x.fillStyle = '#fff'; x.fillRect(0, 0, 1280, 800); x.fillStyle = '#222'; x.font = 'bold 56px Georgia'; x.fillText('Quarterly numbers', 80, 140);
      x.font = '28px Georgia'; for (let i = 0; i < 14; i++) x.fillText('Revenue, churn and a table nobody reads ' + (2026 - i), 80, 220 + i * 40); };
    paint(); setInterval(paint, 200);
    const s = c.captureStream(15), t = s.getVideoTracks()[0], gs = t.getSettings.bind(t);
    t.getSettings = () => ({ ...gs(), displaySurface: 'browser' }); return s; }; })()`);
  await p.ev(`document.getElementById('modeTab').click()`, true); await sleep(800);
  const text = await p.ev(screenText);
  report('Sharing another Chrome tab is accepted and unlocks Start', !(await p.ev(`document.getElementById('start').disabled`)) && /Chrome tab, live/.test(text), text.slice(0, 60));
  await p.shot('7-tab-accepted.png');
  await p.ev(`document.getElementById('start').click()`); await sleep(3500);
  const bright = await p.ev(`(() => { const v = document.getElementById('liveBg'); const c = document.createElement('canvas'); c.width = 64; c.height = 40; const x = c.getContext('2d'); x.drawImage(v, 0, 0, 64, 40);
    const d = x.getImageData(0, 0, 64, 40).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return Math.round(s / (d.length / 4) / 3); })()`);
  const deskHidden = await p.ev(`document.getElementById('desk').hidden`);
  report('The shared tab plays live on the stage (no practice desktop)', bright > 180 && deskHidden, 'frame brightness ' + bright + ' of 255');
  await p.ev(`(() => { for (const el of document.querySelectorAll('#ads > *')) el.remove(); })()`);
  await p.shot('8-tab-stage.png');
  await b.close();
}

writeFileSync(join(out, 'results.json'), JSON.stringify(results, null, 1));
const failed = results.filter((r) => !r.pass).length;
console.log(`${results.length - failed} of ${results.length} checks pass`);
process.exit(failed ? 1 : 0);
