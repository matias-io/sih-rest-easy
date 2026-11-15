// Cursor gaze is independent of the eyelids so it stays current during a blink.
export function createMascotEyes() {
  const logos = [...document.querySelectorAll('[data-mascot]')];
  let pointer = null, frame = 0;

  function draw() {
    frame = 0;
    for (const logo of logos) {
      if (!logo.getClientRects().length) continue;
      for (const eye of logo.querySelectorAll('.eye')) {
        const rect = eye.getBoundingClientRect();
        const dx = pointer ? pointer.x - rect.left - rect.width / 2 : 0;
        const dy = pointer ? pointer.y - rect.top - rect.height / 2 : 0;
        const distance = Math.hypot(dx, dy);
        const pupil = eye.firstElementChild;
        const radius = Math.max(0, (eye.offsetWidth - pupil.offsetWidth) / 2 - 5);
        const amount = Math.min(radius, distance * 0.12);
        pupil.style.transform = `translate(${distance ? dx / distance * amount : 0}px, ${distance ? dy / distance * amount : 0}px)`;
      }
    }
  }
  function refresh() { if (!frame) frame = requestAnimationFrame(draw); }
  addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    pointer = { x: event.clientX, y: event.clientY }; refresh();
  }, { passive: true });
  const center = () => { pointer = null; refresh(); };
  document.documentElement.addEventListener('pointerleave', center);
  addEventListener('blur', center);
  addEventListener('resize', refresh);
  return {
    refresh,
    blink(closed) {
      for (const logo of logos) if (logo.closest('#setup')) logo.classList.toggle('is-closed', closed);
    }
  };
}
