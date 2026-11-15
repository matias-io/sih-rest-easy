// Turns one number (level, 0 sober to 1 gone) into what the screen looks like.
import { hitmarker, airhorn } from './audio.js';

const POPS = ['WOW', '360', 'MLG', 'SAMPLE TEXT', '+100', 'OHHHH', 'NO SLEEP', 'GET REKT', 'BLINK = NOOB', '420 FPS'];

export function createDrunk({ world, ghost, mlg, toasts }) {
  const warpMap = document.getElementById('warpMap'), warpNoise = document.getElementById('warpNoise');
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
    else { spawn('shades', {}, 3000); airhorn(); shake = 1; }
  }

  // t in seconds, level 0..1
  function render(t, level) {
    const sway = Math.max(0, level - 0.08);          // nothing at all for the first few seconds
    const deep = Math.max(0, level - 0.4) / 0.6;      // 0..1 over the second half
    const mlgAmt = Math.max(0, level - 0.72) / 0.28;  // 0..1 at the very end
    shake *= 0.86;

    const rot = Math.sin(t * 0.9) * sway * 4 + Math.sin(t * 2.3) * deep * 3 + (Math.random() - 0.5) * shake * 6;
    const dx = Math.sin(t * 0.7) * sway * 26 + (Math.random() - 0.5) * (mlgAmt * 14 + shake * 30);
    const dy = Math.cos(t * 0.5) * sway * 16 + (Math.random() - 0.5) * (mlgAmt * 14 + shake * 30);
    const sc = 1 + sway * 0.05 + Math.sin(t * 1.3) * deep * 0.04;
    const skew = Math.sin(t * 1.1) * deep * 5;
    world.style.transform = `translate(${dx}px,${dy}px) rotate(${rot}deg) skewX(${skew}deg) scale(${sc})`;

    // notifications sway with the room but stay sharp, so the jokes stay readable
    toasts.style.transform = `translate(${(dx * 0.5).toFixed(1)}px,${(dy * 0.5).toFixed(1)}px) rotate(${(rot * 0.6).toFixed(2)}deg)`;

    const blur = sway * 1.1 + Math.max(0, Math.sin(t * 0.8)) * deep * 1.6;
    const hue = deep * Math.sin(t * 0.6) * 70 + mlgAmt * ((t * 240) % 360);
    const useWarp = level > 0.3;
    world.style.filter = `blur(${blur.toFixed(2)}px) saturate(${1 + deep * 1.2 + mlgAmt * 2}) hue-rotate(${hue.toFixed(0)}deg) contrast(${1 + mlgAmt * 0.5})${useWarp ? ' url(#warp)' : ''}`;
    if (useWarp) {
      warpMap.setAttribute('scale', ((level - 0.3) * 110).toFixed(1));
      warpNoise.setAttribute('baseFrequency', `${(0.004 + Math.sin(t * 0.3) * 0.0015).toFixed(5)} ${(0.009 + Math.cos(t * 0.4) * 0.003).toFixed(5)}`);
    }

    // double vision
    ghost.style.opacity = Math.min(0.55, sway * 0.75).toFixed(2);
    ghost.style.transform = `translate(${(Math.sin(t * 1.4) * sway * 46).toFixed(1)}px, ${(Math.cos(t * 1.1) * sway * 18).toFixed(1)}px)`;

    rainbow.style.opacity = (mlgAmt * 0.35).toFixed(2);
    if (mlgAmt > 0 && t > nextGag) { gag(); nextGag = t + rnd(0.25, 1.1 - mlgAmt * 0.6); }
  }

  function reset() { toasts.style.transform = ''; world.style.transform = ''; world.style.filter = ''; ghost.style.opacity = 0; rainbow.style.opacity = 0; }
  return { render, reset, hit };
}
