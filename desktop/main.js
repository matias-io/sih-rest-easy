// Desktop shell for the shared web app in ../web.
// What it adds over Chrome: one window that covers the whole desktop, stays above everything,
// lets every click and key pass through to your real apps, and is excluded from screen capture.
// That last part is the trick: the page captures the live screen (without seeing itself) and
// shows it back distorted, so your real desktop is what gets drunk while you keep using it.
const { app, BrowserWindow, desktopCapturer, globalShortcut, ipcMain, screen, session } = require('electron');
const { serve } = require('./serve');

const SMOKE = process.env.REST_EASY_SMOKE === '1';   // CI-style check: no window shown, prints a result, exits
const STOP_KEY = 'CommandOrControl+Shift+X';
let win;

app.whenReady().then(async () => {
  const { url } = await serve(0);
  const display = screen.getPrimaryDisplay();

  // camera: yes. screen capture: always the primary display, no picker.
  session.defaultSession.setPermissionRequestHandler((_wc, perm, cb) => cb(['media', 'fullscreen'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((_wc, perm) => ['media', 'fullscreen'].includes(perm));
  session.defaultSession.setDisplayMediaRequestHandler(async (_req, cb) => {
    const sources = await desktopCapturer.getSources({ types: ['screen'] });
    cb({ video: sources.find((s) => s.display_id === String(display.id)) || sources[0] });
  });

  win = new BrowserWindow({
    ...display.bounds, show: !SMOKE, frame: false, transparent: true, resizable: false, hasShadow: false,
    skipTaskbar: false, backgroundColor: '#00000000',
    webPreferences: { preload: require('node:path').join(__dirname, 'preload.js'), backgroundThrottling: false }
  });
  win.setContentProtection(true);   // keep this window out of its own screen capture
  win.loadURL(url + '?desktop=1' + (SMOKE ? '&smoke=1' : ''));

  ipcMain.handle('overlay', (_e, on) => {
    win.setAlwaysOnTop(on, 'screen-saver');
    win.setIgnoreMouseEvents(on);          // clicks and scroll go to the real apps underneath
    win.setFocusable(!on);                 // so does typing
    if (on) { win.setBounds(display.bounds); win.showInactive(); } else { win.show(); win.focus(); }
  });
  ipcMain.handle('quit', () => app.quit());
  ipcMain.handle('hardware', () => { const os = require('node:os'); return { cpu: os.cpus()[0].model.replace(/\s+/g, ' ').trim(), cores: os.cpus().length, ramGb: Math.round(os.totalmem() / 2 ** 30) }; });
  globalShortcut.register(STOP_KEY, () => win.webContents.send('stop'));

  if (SMOKE) {
    win.webContents.on('console-message', (e) => { const msg = e.message || ''; if (msg.startsWith('SMOKE ')) { console.log(msg); app.quit(); } });
    setTimeout(() => { console.log('SMOKE timeout'); app.quit(); }, 25000);
  }
});
app.on('window-all-closed', () => app.quit());
app.on('will-quit', () => globalShortcut.unregisterAll());
