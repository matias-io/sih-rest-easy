// Eye state from the webcam. MediaPipe FaceLandmarker gives per-eye "blink" blendshape
// scores (0 open, 1 closed) from a 478-point face mesh; runs on the GPU, on-device.
import { FaceLandmarker, FilesetResolver } from '../vendor/mediapipe/vision_bundle.mjs';

const BASE = new URL('../vendor/mediapipe/', import.meta.url).href;
// "Closed" is judged against your own resting reading: looking down at a laptop already reads
// half-closed, so a fixed cutoff would call that a rest.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export async function createEyes(video) {
  const files = await FilesetResolver.forVisionTasks(BASE + 'wasm');
  const make = (delegate) => FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
  });
  let delegate = 'GPU', lm;
  try { lm = await make('GPU'); } catch { delegate = 'CPU'; lm = await make('CPU'); }

  const s = { closed: false, score: 0, face: false, blinks: 0, ms: 0, delegate, forced: false };
  let last = -1, smooth = 0, base = 0.15, listeners = [], high = true, skip = false;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // eyelid gap over eye width, from the mesh itself: 0 open, 1 shut
  const lid = (m, top, bottom, outer, inner) => clamp((0.27 - dist(m[top], m[bottom]) / (dist(m[outer], m[inner]) || 1)) / 0.17, 0, 1);
  const set = (closed) => { if (closed !== s.closed) { s.closed = closed; if (!closed) s.blinks++; listeners.forEach((f) => f(closed)); } };

  function frame() {
    skip = !high && !skip;   // Light: every other frame
    if (!skip && video.readyState >= 2 && video.currentTime !== last) {
      last = video.currentTime;
      const t0 = performance.now();
      let res; try { res = lm.detectForVideo(video, t0); } catch { res = null; }
      s.ms = performance.now() - t0;
      const cats = res?.faceBlendshapes?.[0]?.categories;
      s.face = !!cats;
      if (cats) {
        let l = 0, r = 0;
        for (const c of cats) { if (c.categoryName === 'eyeBlinkLeft') l = c.score; else if (c.categoryName === 'eyeBlinkRight') r = c.score; }
        let now = (l + r) / 2;
        // High: blend the model's blink score with the measured eyelid gap, which holds up better with glasses
        const m = high && res.faceLandmarks?.[0];
        if (m) now = now * 0.55 + ((lid(m, 159, 145, 33, 133) + lid(m, 386, 374, 362, 263)) / 2) * 0.45;
        smooth = smooth * 0.4 + now * 0.6;
        s.score = smooth;
        // base follows the open-eye reading: quick to drop, slow to rise, frozen while closed
        if (!s.closed) base += (smooth - base) * (smooth < base ? 0.3 : 0.015);
        const closeAt = clamp(base + 0.24, 0.5, 0.74);
        s.threshold = closeAt;
        if (!s.forced) set(s.closed ? smooth > closeAt - 0.14 : smooth > closeAt);
      } else if (!s.forced) set(false);   // nobody there counts as awake
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frame); else requestAnimationFrame(frame);
  }
  frame();

  return {
    state: s,
    onChange: (f) => listeners.push(f),
    setQuality: (q) => { high = q !== 'light'; },
    // keyboard fallback: hold Space to "close your eyes"
    force: (closed) => { s.forced = closed; set(closed); }
  };
}

// Fallback when there is no camera or the model fails: keyboard only.
export function keyboardEyes() {
  const s = { closed: false, score: 0, face: false, blinks: 0, ms: 0, delegate: 'keyboard', forced: false };
  const listeners = [];
  return { state: s, onChange: (f) => listeners.push(f),
    force: (closed) => { if (closed !== s.closed) { s.closed = closed; s.score = closed ? 1 : 0; if (!closed) s.blinks++; listeners.forEach((f) => f(closed)); } } };
}
