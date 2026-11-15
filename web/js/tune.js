// Viewer-set opacity for the two layers of the run, from the panel under the Rest Easy logo.
// fg: notifications, junk ads, jokes and cameo photos. bg: everything else drawn over the screen.
const read = (k) => { try { const v = parseFloat(localStorage.getItem(k)); return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 1; } catch { return 1; } };
export const tune = { fg: read('tune.fg'), bg: read('tune.bg') };
export function setTune(key, value) {
  tune[key] = Math.min(1, Math.max(0, value));
  try { localStorage.setItem('tune.' + key, String(tune[key])); } catch {}
}
