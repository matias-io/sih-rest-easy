// Overlays that make the screen hard to use as BAC climbs: torn colour bars on the beat.
// They follow the music, the meme clips (m.sting) and dice rolls. Nothing here darkens the screen.
// The DOM is fixed; per frame only transform and opacity change, and nothing takes clicks.
const COLORS = ['#ff16bb', '#00eaff', '#a4ff00', '#a43bff', '#ff9230', '#00ffd0', '#fff600', '#ff2a2a'];
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v) => Math.max(0, Math.min(1, v));

export function createHaze(host) {
  const make = (cls, parent) => { const el = document.createElement('div'); el.className = cls; parent.append(el); return el; };
  const root = document.createElement('div'); root.className = 'haze'; root.setAttribute('aria-hidden', 'true');
  const bars = Array.from({ length: 6 }, () => ({ el: make('haze-bar', root), until: 0, y: 0, h: 1, x: 0 }));
  host.append(root);

  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const last = new Map();
  const set = (el, prop, value) => { let seen = last.get(el); if (!seen) last.set(el, seen = {}); if (seen[prop] !== value) { seen[prop] = value; el.style[prop] = value; } };
  let previous = null, pulse = 0, flash = 0, flashColor = COLORS[0], visible = false;

  function tear(t, amount, count) {
    for (let n = 0; n < count; n++) {
      const bar = bars.find((b) => b.until <= t) || bars[Math.floor(Math.random() * bars.length)];
      bar.until = t + rnd(0.07, 0.12 + 0.25 * amount);
      bar.y = rnd(0, 96); bar.h = rnd(0.25, 1.6); bar.x = rnd(-8, 8);
      bar.el.style.background = pick(COLORS);
    }
  }

  return {
    // t seconds, level 0..1 (BAC = level * 0.4), m = music state ({ energy, kick, beat, sting })
    render(t, level, m) {
      const dt = previous === null ? 0 : Math.max(0, Math.min(0.1, t - previous)); previous = t;
      const amount = clamp((level - 0.12) / 0.88);    // starts at BAC 0.05, full at 0.40
      const show = amount > 0;
      if (show !== visible) { visible = show; root.style.visibility = show ? 'visible' : 'hidden'; }
      if (!show) return;
      const calm = reduced.matches;
      const energy = clamp(m.energy || 0), kick = clamp(m.kick || 0);
      pulse += (Math.max(energy * 0.6, kick) - pulse) * (1 - Math.exp(-dt * 6));

      // A meme clip or a beat throws random junk at the screen.
      if (!calm && (m.sting || (m.beat && Math.random() < amount * 0.8))) {
        flash = Math.min(1, flash + (m.sting ? 0.8 : 0.5)); flashColor = pick(COLORS);
        if (Math.random() < 0.3 + amount * 0.6) tear(t, amount, 1 + Math.floor(Math.random() * (1 + amount * 3)));
      }
      flash *= Math.exp(-dt * 7);

      for (const bar of bars) {
        const on = bar.until > t;
        set(bar.el, 'opacity', on ? (0.35 + 0.5 * amount).toFixed(2) : '0');
        if (on) set(bar.el, 'transform', `translate(${(bar.x + rnd(-2, 2)).toFixed(1)}vw,${bar.y.toFixed(1)}vh) scaleY(${bar.h.toFixed(2)})`);
      }

    },
    clear() { root.remove(); }
  };
}
