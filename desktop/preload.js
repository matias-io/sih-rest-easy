// The only bridge between the shared web app and the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('restEasyDesktop', {
  captureMode: process.platform === 'darwin' ? 'snapshot' : 'live',
  screenAccess: (request = false) => ipcRenderer.invoke('screenAccess', request),
  screenInsets: () => ipcRenderer.invoke('screenInsets'),
  captureHidden: (hidden) => ipcRenderer.invoke('captureHidden', hidden),
  overlay: (on) => ipcRenderer.invoke('overlay', on),   // true: cover the desktop, clicks pass through
  quit: () => ipcRenderer.invoke('quit'),
  stopKeys: () => ipcRenderer.invoke('stopKeys'),      // the stop shortcuts that registered
  hitBox: (box) => ipcRenderer.send('hitBox', box),     // where our own controls are, so they can take clicks
  hardware: () => ipcRenderer.invoke('hardware'),   // CPU and memory, which a web page cannot read
  onRest: (fn) => ipcRenderer.on('rest', (_event, closed) => fn(closed)),
  onStop: (fn) => ipcRenderer.on('stop', fn)            // the global stop shortcut was pressed
});
