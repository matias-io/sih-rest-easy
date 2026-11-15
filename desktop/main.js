// Desktop shell for the shared web app in ../web.
// What it adds over Chrome: one window that covers the whole desktop, stays above everything,
// lets clicks and keys pass through to your real apps. Windows can exclude the overlay
// from live capture; macOS uses a clean snapshot because ScreenCaptureKit includes it.
const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, session, systemPreferences } = require("electron");
const { serve } = require('./serve');

// use the machine: discrete/high-performance GPU, GPU rasterization, no copies of video frames
app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
const SMOKE = process.env.REST_EASY_SMOKE === '1';   // CI-style check: no window shown, prints a result, exits
const STOP_KEYS = ['CommandOrControl+Shift+X', 'CommandOrControl+Alt+X', 'F9'];
const REST_KEY = 'CommandOrControl+Shift+Space';
let win;

// One copy at a time: a second (or hung) copy keeps the camera open and the new one gets no picture.
if (!SMOKE && !app.requestSingleInstanceLock()) { console.log('Rest Easy is already running.'); app.exit(0); }
app.on('second-instance', () => { if (win && !win.isDestroyed()) { win.show(); win.focus(); } });

// A fixed port keeps the page's origin, so the saved camera and settings survive restarts.
async function serveFixed() {
  for (const port of [8771, 8772, 8773]) { try { return await serve(port); } catch {} }
  return serve(0);
}

app.whenReady().then(async () => {
  // macOS asks for the camera once per app; without this getUserMedia fails silently on a fresh Mac.
  if (process.platform === 'darwin') {
    try { await systemPreferences.askForMediaAccess('camera'); } catch {}
    if (systemPreferences.getMediaAccessStatus('screen') !== 'granted') console.log('macOS: allow Screen Recording for Electron in System Settings > Privacy & Security for the live desktop backdrop.');
  }
  const { url } = await serveFixed();
  const display = screen.getPrimaryDisplay();

  // camera: yes. screen capture: always the primary display, no picker.
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'fullscreen', 'display-capture'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['media', 'fullscreen'].includes(perm));
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    try {
      const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });
      const source = sources.find((s) => s.display_id === String(display.id)) || sources[0];
      cb(source ? { video: source } : {});
    } catch (error) { console.error('Screen capture failed:', error.message); cb({}); }
  });

  win = new BrowserWindow({
    ...display.bounds, show: !SMOKE, frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: false, backgroundColor: '#00000000',
    webPreferences: { autoplayPolicy: 'no-user-gesture-required', preload: require('node:path').join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  // keep this window out of its own screen capture (REST_EASY_VISIBLE=1 turns that off for screenshots and testing)
  if (process.env.REST_EASY_VISIBLE !== '1') win.setContentProtection(true);
  win.loadURL(url + '?desktop=1' + (SMOKE ? '&smoke=1' : '') + (process.env.REST_EASY_QUERY ? '&' + process.env.REST_EASY_QUERY : ''));   // REST_EASY_QUERY=autorun=60 for a timed test run

  // Modern macOS captures protected windows too. Hide ours while taking a single
  // clean frame, then reuse that image for distortion without recursive feedback.
  let restoreAfterCapture = false;
  ipcMain.handle('captureHidden', (_event, hidden) => {
    if (hidden) { restoreAfterCapture = win.isVisible(); win.hide(); }
    else if (restoreAfterCapture && !win.isDestroyed()) { restoreAfterCapture = false; win.show(); }
  });

  // overlay on: cover the desktop, stay above everything, let the mouse and keyboard through.
  // The page asks for the mouse back only while the pointer is over its own controls (the End button).
  let overlayOn = false, keepTop = null, resting = false;
  const setOverlay = (on) => {
    overlayOn = on; clearInterval(keepTop);
    globalShortcut.unregister(REST_KEY); resting = false;
    win.webContents.send('rest', false);
    win.setIgnoreMouseEvents(on); wasOver = false;
    win.setFocusable(!on);                       // typing goes to the real apps, and Alt+Tab skips us
    win.setSkipTaskbar(on);
    win.setAlwaysOnTop(on, 'screen-saver');
    if (on) {
      win.blur();                              // setFocusable(false) alone keeps focus on macOS
      win.setBounds(display.bounds); win.showInactive(); win.moveTop();
      keepTop = setInterval(() => { if (!win.isDestroyed()) win.moveTop(); }, 2000);
    } else { win.show(); win.focus(); }
    const restKey = on && globalShortcut.register(REST_KEY, () => {
      resting = !resting; win.webContents.send('rest', resting);
    }) ? REST_KEY.replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl') : null;
    return { restKey };
  };
  ipcMain.handle('overlay', (_e, on) => setOverlay(on));
  let wasOver = false;
  let hitBox = null;   // screen rectangle of the page's own controls, in DIPs
  ipcMain.on('hitBox', (_e, box) => { hitBox = box; });
  setInterval(() => {
    if (!overlayOn || !hitBox || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    const over = p.x - b.x >= hitBox.x && p.x - b.x <= hitBox.x + hitBox.w && p.y - b.y >= hitBox.y && p.y - b.y <= hitBox.y + hitBox.h;
    if (over !== wasOver) { wasOver = over; win.setIgnoreMouseEvents(!over, { forward: false }); }   // only on change
  }, 40);
  // stop keys are handled here, in the main process, so they work even if the page is stuck
  const stopNow = () => { if (overlayOn) { setOverlay(false); win.webContents.send('stop'); } };
  // another app may already own a shortcut, so try several and tell the page which ones we got
  const stopKeys = STOP_KEYS.filter((key) => globalShortcut.register(key, stopNow));
  ipcMain.handle('stopKeys', () => stopKeys.map((k) => k.replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')));
  globalShortcut.register('CommandOrControl+Shift+Q', () => { win.destroy(); app.exit(0); });
  ipcMain.handle('quit', () => { clearInterval(keepTop); win.destroy(); app.exit(0); });   // no slow teardown
  ipcMain.handle('hardware', () => { const os = require('node:os'); return { cpu: os.cpus()[0].model.replace(/\s+/g, ' ').trim(), cores: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30) }; });

  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3 || /^(PERF|AUTORUN)/.test(e.message || '')) console.log('[page] ' + e.message); if (process.env.REST_EASY_QUERY && (e.message || '').startsWith('AUTORUN done')) setTimeout(() => app.exit(0), 800); });
  if (SMOKE) {
    win.webContents.on('console-message', (e) => { const msg = e.message || ''; if (msg.startsWith('SMOKE ')) { console.log(msg); app.exit(msg.startsWith('SMOKE ok') ? 0 : 1); } });
    setTimeout(() => { console.log('SMOKE timeout'); app.exit(1); }, 25000);
  }
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
