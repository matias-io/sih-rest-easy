// Eye state from the webcam. MediaPipe FaceLandmarker gives per-eye "blink" blendshape
// scores (0 open, 1 closed) from a 478-point face mesh; runs on the GPU, on-device.
import { FaceLandmarker, FilesetResolver } from '../vendor/mediapipe/vision_bundle.mjs';

const BASE = new URL('../vendor/mediapipe/', import.meta.url).href;
const CLOSE_AT = 0.5, OPEN_AT = 0.32;   // hysteresis so a half-closed eye does not flicker

export async function createEyes(video) {
  const files = await FilesetResolver.forVisionTasks(BASE + 'wasm');
  const make = (delegate) => FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
  });
  let delegate = 'GPU', lm;
  try { lm = await make('GPU'); } catch { delegate = 'CPU'; lm = await make('CPU'); }

  const s = { closed: false, score: 0, face: false, blinks: 0, ms: 0, delegate, forced: false };
  let last = -1, smooth = 0, listeners = [];
  const set = (closed) => { if (closed !== s.closed) { s.closed = closed; if (!closed) s.blinks++; listeners.forEach((f) => f(closed)); } };

  function frame() {
    if (video.readyState >= 2 && video.currentTime !== last) {
      last = video.currentTime;
      const t0 = performance.now();
      let res; try { res = lm.detectForVideo(video, t0); } catch { res = null; }
      s.ms = performance.now() - t0;
      const cats = res?.faceBlendshapes?.[0]?.categories;
      s.face = !!cats;
      if (cats) {
        let l = 0, r = 0;
        for (const c of cats) { if (c.categoryName === 'eyeBlinkLeft') l = c.score; else if (c.categoryName === 'eyeBlinkRight') r = c.score; }
        smooth = smooth * 0.4 + ((l + r) / 2) * 0.6;
        s.score = smooth;
        if (!s.forced) set(s.closed ? smooth > OPEN_AT : smooth > CLOSE_AT);
      } else if (!s.forced) set(false);   // nobody there counts as awake
    }
    if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(frame); else requestAnimationFrame(frame);
  }
  frame();

  return {
    state: s,
    onChange: (f) => listeners.push(f),
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
