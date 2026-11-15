// Desktop shell for the shared web app in ../web.
// What it adds over Chrome: one window that covers the whole desktop, stays above everything,
// lets every click and key pass through to your real apps, and is excluded from screen capture.
// That last part is the trick: the page captures the live screen (without seeing itself) and
// shows it back distorted, so your real desktop is what gets drunk while you keep using it.
const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, session } = require('electron');
const { serve } = require('./serve');

const SMOKE = process.env.REST_EASY_SMOKE === '1';   // CI-style check: no window shown, prints a result, exits
const STOP_KEYS = ['CommandOrControl+Shift+X', 'CommandOrControl+Alt+X', 'F9'];
let win;

app.whenReady().then(async () => {
  const { url } = await serve(0);
  const display = screen.getPrimaryDisplay();

  // camera: yes. screen capture: always the primary display, no picker.
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'fullscreen'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['media', 'fullscreen'].includes(perm));
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 0, height: 0 } });   // no thumbnails: they made Start take 15 s
    cb({ video: sources.find((s) => s.display_id === String(display.id)) || sources[0] });
  });

  win = new BrowserWindow({
    ...display.bounds, show: !SMOKE, frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: false, backgroundColor: '#00000000',
    webPreferences: { preload: require('node:path').join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  // keep this window out of its own screen capture (REST_EASY_VISIBLE=1 turns that off for screenshots and testing)
  if (process.env.REST_EASY_VISIBLE !== '1') win.setContentProtection(true);
  win.loadURL(url + '?desktop=1' + (SMOKE ? '&smoke=1' : ''));

  // overlay on: cover the desktop, stay above everything, let the mouse and keyboard through.
  // The page asks for the mouse back only while the pointer is over its own controls (the End button).
  let overlayOn = false, keepTop = null;
  const setOverlay = (on) => {
    overlayOn = on; clearInterval(keepTop);
    win.setIgnoreMouseEvents(on, { forward: true });
    win.setFocusable(!on);                       // typing goes to the real apps, and Alt+Tab skips us
    win.setSkipTaskbar(on);
    win.setAlwaysOnTop(on, 'screen-saver');
    if (on) {
      win.setBounds(display.bounds); win.showInactive(); win.moveTop();
      keepTop = setInterval(() => { if (!win.isDestroyed()) { win.setAlwaysOnTop(true, 'screen-saver'); win.moveTop(); } }, 1000);
    } else { win.show(); win.focus(); }
  };
  ipcMain.handle('overlay', (_e, on) => setOverlay(on));
  let hitBox = null;   // screen rectangle of the page's own controls, in DIPs
  ipcMain.on('hitBox', (_e, box) => { hitBox = box; });
  setInterval(() => {
    if (!overlayOn || !hitBox || win.isDestroyed()) return;
    const p = screen.getCursorScreenPoint(), b = win.getBounds();
    const over = p.x - b.x >= hitBox.x && p.x - b.x <= hitBox.x + hitBox.w && p.y - b.y >= hitBox.y && p.y - b.y <= hitBox.y + hitBox.h;
    win.setIgnoreMouseEvents(!over, { forward: true });
  }, 40);
  // stop keys are handled here, in the main process, so they work even if the page is stuck
  const stopNow = () => { if (overlayOn) { setOverlay(false); win.webContents.send('stop'); } };
  // another app may already own a shortcut, so try several and tell the page which ones we got
  const stopKeys = STOP_KEYS.filter((key) => globalShortcut.register(key, stopNow));
  ipcMain.handle('stopKeys', () => stopKeys.map((k) => k.replace('CommandOrControl', process.platform === 'darwin' ? 'Cmd' : 'Ctrl')));
  globalShortcut.register('CommandOrControl+Shift+Q', () => app.quit());
  ipcMain.handle('quit', () => app.quit());
  ipcMain.handle('hardware', () => { const os = require('node:os'); return { cpu: os.cpus()[0].model.replace(/\s+/g, ' ').trim(), cores: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30) }; });

  win.webContents.on('console-message', (e) => { if (e.level === 'error' || e.level === 3) console.log('[page] ' + e.message); });
  if (SMOKE) {
    win.webContents.on('console-message', (e) => { const msg = e.message || ''; if (msg.startsWith('SMOKE ')) { console.log(msg); app.quit(); } });
    setTimeout(() => { console.log('SMOKE timeout'); app.quit(); }, 25000);
  }
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
