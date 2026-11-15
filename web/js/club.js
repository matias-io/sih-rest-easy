// Fixed-size light rig: only transforms and opacity change during playback.
export function createClub(host) {
  const rig = document.createElement('div'); rig.className = 'club'; rig.setAttribute('aria-hidden', 'true');
  const wash = document.createElement('div'); wash.className = 'club-wash'; rig.append(wash);
  const beams = Array.from({ length: 6 }, (_, i) => {
    const beam = document.createElement('div'); beam.className = 'club-beam';
    beam.style.setProperty('--light', ['#ff16bb', '#00eaff', '#a4ff00', '#a43bff', '#ff9230', '#00ffd0'][i]);
    beam.style.left = `${8 + i * 17}%`; rig.append(beam); return beam;
  });
  const ball = document.createElement('div'); ball.className = 'club-ball'; ball.textContent = '🪩'; rig.append(ball);
  const sign = document.createElement('div'); sign.className = 'club-sign'; rig.append(sign);
  const captions = ['CPU AT 140 BPM', 'EXCEL HAS LEFT THE CHAT', 'DJ TASK MANAGER', 'RAM? I BARELY KNOW HER', '404: SOBRIETY NOT FOUND', 'THE PRINTER REQUESTS A DROP'];
  host.append(rig);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let pulse = 0, previous = null, caption = -1;
  return {
    render(t, level, music) {
      const dt = previous === null ? 0 : Math.max(0, Math.min(0.1, t - previous)); previous = t;
      const amount = Math.max(0, Math.min(1, (level - 0.18) / 0.82));
      const energy = Math.max(0, Math.min(1, music.energy || 0));
      // Smooth envelopes give the room a pulse without full-screen flashes.
      pulse += (Math.max(energy * 0.5, Math.min(1, music.kick || 0)) - pulse) * (1 - Math.exp(-dt * 5));
      rig.style.opacity = (amount * (reduced.matches ? 0.28 : 0.55 + pulse * 0.25)).toFixed(3);
      for (let i = 0; i < beams.length; i++) {
        const angle = reduced.matches ? (i - 2.5) * 12 : Math.sin(t * (0.32 + i * 0.035) + i * 1.7) * (22 + amount * 24);
        beams[i].style.transform = `rotate(${angle.toFixed(2)}deg) scaleX(${(0.75 + pulse * 0.35).toFixed(3)})`;
      }
      wash.style.opacity = (0.35 + pulse * 0.3).toFixed(3);
      ball.style.transform = reduced.matches ? 'none' : `translateY(${(Math.sin(t * 1.4) * 5).toFixed(1)}px) rotate(${(Math.sin(t * 0.8) * 18).toFixed(1)}deg)`;
      sign.style.opacity = (Math.max(0, (amount - 0.35) / 0.65) * 0.85).toFixed(3);
      const next = Math.floor(t / 7) % captions.length;
      if (next !== caption) { caption = next; sign.textContent = captions[next]; }
    },
    clear() { rig.remove(); }
  };
}
