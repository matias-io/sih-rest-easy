// The only bridge between the shared web app and the desktop shell.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('restEasyDesktop', {
  overlay: (on) => ipcRenderer.invoke('overlay', on),   // true: cover the desktop, clicks pass through
  quit: () => ipcRenderer.invoke('quit'),
  onStop: (fn) => ipcRenderer.on('stop', fn)            // the global stop shortcut was pressed
});
