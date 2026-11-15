// Turns one number (level, 0 sober to 1 gone) into what the screen looks like.
import { hitmarker } from './audio.js';

const POPS = ['WOW', '360', 'MLG', 'SAMPLE TEXT', '+100', 'OHHHH', 'NO SLEEP', 'GET REKT', 'BLINK = NOOB', '404 SLEEP'];

export function createDrunk({ world, fx, mlg, toasts }) {
  const rainbow = document.createElement('div'); rainbow.className = 'rainbow'; mlg.appendChild(rainbow);
  let nextGag = 0, shake = 0;

  const spawn = (cls, style, life) => { const el = document.createElement('div'); el.className = cls; Object.assign(el.style, style); mlg.appendChild(el); setTimeout(() => el.remove(), life); return el; };
  const rnd = (a, b) => a + Math.random() * (b - a);

  function hit(x, y) { spawn('hit', { left: x + 'px', top: y + 'px' }, 400); hitmarker(); shake = 1; }
  function gag() {
    const r = Math.random();
    if (r < 0.4) { const p = spawn('pop', { left: rnd(5, 70) + '%', top: rnd(15, 75) + '%' }, 1400); p.textContent = POPS[Math.floor(Math.random() * POPS.length)]; }
    else if (r < 0.6) { hit(rnd(0.1, 0.9) * innerWidth, rnd(0.1, 0.9) * innerHeight); }
    else if (r < 0.75) { spawn('tri', { left: rnd(10, 80) + '%', top: rnd(15, 60) + '%' }, 2400); }
    else if (r < 0.9) { for (let i = 0; i < 14; i++) spawn('chip', { left: rnd(0, 100) + '%', animationDuration: rnd(1.6, 3.2) + 's' }, 3300); }
    else { spawn('shades', {}, 3000); shake = 1; }
  }

  const SAM = ['hey. need $7 trillion by EOD', 'your free trial of blinking has expired', 'close your eyes. I am scaling.', 'are you AGI yet', 'this meeting could have been a GPU'];
  function sam() {
    const el = spawn('sam', { left: rnd(4, 62) + '%', '--r': rnd(-14, 14) + 'deg' }, 2700);
    el.style.setProperty('--r', rnd(-14, 14) + 'deg');
    const img = new Image(); img.src = new URL('../vendor/img/sam.jpg', import.meta.url).href; img.alt = '';
    const cap = document.createElement('b'); cap.textContent = SAM[Math.floor(Math.random() * SAM.length)];
    el.append(img, cap); shake = 1;
  }

  // t in seconds, level 0..1, m = the music (energy, kick, mode, seed)
  function render(t, level, m = { energy: 1, kick: 0, mode: 0, seed: 0 }) {
    const amp = 0.3 + 0.7 * m.energy;                  // quiet music, calm screen
    const sway = Math.max(0, level - 0.08) * amp;      // nothing at all for the first few seconds
    const deep = Math.max(0, level - 0.4) / 0.6 * amp; // 0..1 over the second half
    const mlgAmt = Math.max(0, level - 0.72) / 0.28 * amp;
    const k = m.kick * Math.min(1, Math.max(0, (level - 0.25) / 0.45));   // the beat
    shake *= 0.86;

    const rot = Math.sin(t * 0.9) * sway * 3 + Math.sin(t * 2.3) * deep * 3 + (Math.random() - 0.5) * (shake * 6 + k * deep * 5);
    const dx = Math.sin(t * 0.7) * sway * 22 + (Math.random() - 0.5) * (mlgAmt * 14 + shake * 30 + k * 18);
    const dy = Math.cos(t * 0.5) * sway * 14 + (Math.random() - 0.5) * (mlgAmt * 14 + shake * 30 + k * 18);
    const sc = 1 + sway * 0.05 + Math.sin(t * 1.3) * deep * 0.04 + k * 0.05;
    const skew = Math.sin(t * 1.1) * deep * 5;
    world.style.transform = `translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) rotate(${rot.toFixed(2)}deg) skewX(${skew.toFixed(2)}deg) scale(${sc.toFixed(3)})`;

    // notifications sway with the room but stay sharp, so the jokes stay readable
    toasts.style.transform = `translate(${(dx * 0.5).toFixed(1)}px,${(dy * 0.5).toFixed(1)}px) rotate(${(rot * 0.6).toFixed(2)}deg)`;

    if (fx.active) {
      fx.draw(t, level, m);         // picture or live video: everything happens on the GPU
      world.style.filter = '';
    } else {
      // built-in desktop (real DOM): compositor-only filters, nothing that needs the CPU
      const blur = sway * 1.1 + Math.max(0, Math.sin(t * 0.8)) * deep * 1.6;
      const hue = deep * Math.sin(t * 0.6) * 70 + mlgAmt * ((t * 240) % 360);
      world.style.filter = level < 0.08 ? '' : `blur(${blur.toFixed(2)}px) saturate(${(1 + deep * 1.2 + mlgAmt * 2).toFixed(2)}) hue-rotate(${hue.toFixed(0)}deg)${m.mode === 7 && k > 0.5 ? ' invert(1)' : ''}`;
    }

    rainbow.style.opacity = (mlgAmt * 0.35).toFixed(2);
    if (mlgAmt > 0 && (t > nextGag || (m.beat && Math.random() < 0.5))) { gag(); nextGag = t + rnd(0.25, 1.1 - mlgAmt * 0.6); }
  }

  function reset() { toasts.style.transform = ''; world.style.transform = ''; world.style.filter = ''; rainbow.style.opacity = 0; rainbow.remove(); }
  return { render, reset, hit, sam };
}
