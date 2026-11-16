// UI audit: screenshots every screen on 4 desktop and 4 phone/tablet profiles over raw CDP and checks that
// nothing is cut off, nothing scrolls sideways, and phones cannot start a run. Needs Chrome and `npm run web`.
// usage: node tools/ui-audit.mjs http://127.0.0.1:8770 .local/audit/<name>
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [base, out] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15';
const DEVICES = [
  { name: 'mac-1440', w: 1440, h: 900, dpr: 2 },
  { name: 'win-1920', w: 1920, h: 1080, dpr: 1 },
  { name: 'laptop-short-1280x620', w: 1280, h: 620, dpr: 1.5 },
  { name: 'narrow-window-760', w: 760, h: 900, dpr: 1 },
  { name: 'iphone', w: 390, h: 844, dpr: 3, mobile: true, ua: IOS, platform: 'iOS' },
  { name: 'android', w: 412, h: 915, dpr: 2.625, mobile: true, ua: ANDROID, platform: 'Android' },
  { name: 'iphone-landscape', w: 844, h: 390, dpr: 3, mobile: true, ua: IOS, platform: 'iOS' },
  { name: 'ipad', w: 820, h: 1180, dpr: 2, mobile: true, ua: IPAD, platform: 'macOS', ipad: true },
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const profile = mkdtempSync(join(tmpdir(), 'rest-audit-'));
const port = 9300 + Math.floor(Math.random() * 500);
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--hide-scrollbars', '--no-first-run', '--mute-audio', 'about:blank'], { stdio: 'ignore' });

let ws, id = 0; const pending = new Map();
async function connect() {
  for (let i = 0; i < 50; i++) {
    try { const r = await fetch(`http://127.0.0.1:${port}/json/version`); const { webSocketDebuggerUrl } = await r.json(); ws = new WebSocket(webSocketDebuggerUrl); break; } catch { await sleep(200); }
  }
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
}
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const n = ++id; pending.set(n, (m) => (m.error ? reject(new Error(method + ': ' + m.error.message)) : resolve(m.result)));
  ws.send(JSON.stringify({ id: n, method, params, sessionId }));
});

async function page(dev) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s('Page.enable'); await s('Runtime.enable');
  await s('Emulation.setDeviceMetricsOverride', { width: dev.w, height: dev.h, deviceScaleFactor: dev.dpr, mobile: !!dev.mobile, screenWidth: dev.w, screenHeight: dev.h });
  if (dev.mobile) {
    await s('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await s('Emulation.setUserAgentOverride', { userAgent: dev.ua, platform: dev.platform === 'macOS' ? 'MacIntel' : dev.platform,
      userAgentMetadata: dev.ipad ? undefined : { brands: [{ brand: 'Chromium', version: '140' }], platform: dev.platform, platformVersion: '15', architecture: '', model: '', mobile: true } });
    await s('Emulation.setEmulatedMedia', { features: [{ name: 'pointer', value: 'coarse' }, { name: 'any-pointer', value: 'coarse' }, { name: 'hover', value: 'none' }, { name: 'any-hover', value: 'none' }] });
  }
  return { s, close: () => send('Target.closeTarget', { targetId }) };
}
const evaluate = async (s, expr) => (await s('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result.value;
async function shot(s, file) { const { data } = await s('Page.captureScreenshot', { format: 'png' }); writeFileSync(join(out, file), Buffer.from(data, 'base64')); }
const OVERFLOW = `(() => { const sc = [...document.querySelectorAll('.screen')].find((e) => !e.hidden); if (!sc) return null;
  const r = [...sc.querySelectorAll('*')].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
  const clipped = r.filter((b) => b.bottom > innerHeight + 1 || b.top < -1 || b.right > innerWidth + 1 || b.left < -1).length;
  const kids = [...sc.children].filter((e) => e.offsetParent).map((e) => e.getBoundingClientRect());
  const fits = sc.scrollHeight <= sc.clientHeight + 1, above = Math.min(...kids.map((b) => b.top)), below = innerHeight - Math.max(...kids.map((b) => b.bottom));
  return { screen: sc.id, clipped, centred: !fits || Math.abs(above - below) < 60, scrollable: sc.scrollHeight > sc.clientHeight + 1 && getComputedStyle(sc).overflowY !== 'hidden', hscroll: document.documentElement.scrollWidth > innerWidth + 1, topVisible: sc.firstElementChild.getBoundingClientRect().top >= -1,
  bottomReachable: (() => { const t = sc.scrollTop; sc.scrollTop = 1e6; const ok = [...sc.children].filter((e) => e.offsetParent).every((e) => e.getBoundingClientRect().bottom <= innerHeight + 1); sc.scrollTop = t; return ok; })() }; })()`;

const report = [];
await connect();
for (const dev of DEVICES) {
  const { s, close } = await page(dev);
  await s('Page.navigate', { url: base + '/?cam=1' }); await sleep(1800);
  await shot(s, `${dev.name}-1-intro.png`);
  report.push({ dev: dev.name, step: 'intro', ...(await evaluate(s, OVERFLOW)), blockedNotice: await evaluate(s, `!!document.querySelector('#mobileBlock:not([hidden])')`) });
  const canSetup = await evaluate(s, `(() => { const b = document.getElementById('toSetup'); return !!b && !b.hidden && !b.disabled && b.offsetParent !== null; })()`);
  if (canSetup) {
    await evaluate(s, `document.getElementById('toSetup').click()`); await sleep(5000);
    await shot(s, `${dev.name}-2-setup.png`);
    report.push({ dev: dev.name, step: 'setup', ...(await evaluate(s, OVERFLOW)) });
  } else report.push({ dev: dev.name, step: 'setup', note: 'no setup button (blocked)' });
  // try to force a run straight from the URL: must be refused on mobile
  await s('Page.navigate', { url: base + '/?autorun=6&cam=0&level=0.85' }); await sleep(dev.mobile ? 4000 : 3500);
  const stage = await evaluate(s, `!document.getElementById('stage').hidden`);
  if (stage || dev.mobile) await shot(s, `${dev.name}-3-${stage ? 'stage' : 'autorun-refused'}.png`);
  report.push({ dev: dev.name, step: 'autorun', stageShown: stage });
  if (stage) { await sleep(4500); await shot(s, `${dev.name}-4-end.png`); report.push({ dev: dev.name, step: 'end', ...(await evaluate(s, OVERFLOW)) }); }
  await close();
}
writeFileSync(join(out, 'report.json'), JSON.stringify(report, null, 1));
for (const r of report) console.log(JSON.stringify(r));
chrome.kill(); await sleep(500); try { rmSync(profile, { recursive: true, force: true }); } catch {}
