// Eye state from the webcam. MediaPipe FaceLandmarker gives per-eye "blink" blendshape
// scores (0 open, 1 closed) from a 478-point face mesh; runs on the GPU, on-device.
const BASE = new URL('../vendor/mediapipe/', import.meta.url).href;
// "Closed" is judged against your own resting reading: looking down at a laptop already reads
// half-closed, so a fixed cutoff would call that a rest.
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export async function createEyes(video) {
  let tracker;
  try { tracker = await workerTracker(); } catch { tracker = await mainTracker(); }

  const s = { closed: false, score: 0, face: false, blinks: 0, ms: 0, delegate: tracker.delegate, forced: false };
  let last = -1, smooth = 0, base = 0.15, listeners = [], high = true;
  let paused = false, disposed = false, busy = false, nextAt = 0, callback = 0;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  // eyelid gap over eye width, from the mesh itself: 0 open, 1 shut
  const lid = (m, top, bottom, outer, inner) => clamp((0.27 - dist(m[top], m[bottom]) / (dist(m[outer], m[inner]) || 1)) / 0.17, 0, 1);
  const set = (closed) => { if (closed !== s.closed) { s.closed = closed; if (!closed) s.blinks++; listeners.forEach((f) => f(closed)); } };

  function schedule() {
    if (!paused && !disposed) callback = video.requestVideoFrameCallback ? video.requestVideoFrameCallback(frame) : requestAnimationFrame(frame);
  }
  async function frame() {
    if (paused || disposed) return;
    schedule();
    const time = performance.now();
    if (!busy && !document.hidden && time >= nextAt && video.readyState >= 2 && video.currentTime !== last) {
      last = video.currentTime;
      busy = true;
      nextAt = time + Math.max(1000 / (high ? 24 : 15), tracker.worker ? s.ms : s.ms * 4);
      let res;
      try { const result = await tracker.infer(video, time); res = result.res; s.ms = result.ms; }
      catch {
        res = null;
        if (tracker.failed) {
          tracker.close();
          try { tracker = await mainTracker(); s.delegate = tracker.delegate; } catch { pause(); }
        }
      }
      finally { busy = false; }
      if (paused || disposed) return;
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
  }
  schedule();

  function pause() {
    paused = true;
    if (video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(callback); else cancelAnimationFrame(callback);
  }

  return {
    state: s,
    onChange: (f) => listeners.push(f),
    setQuality: (q) => { high = q !== 'light'; },
    pause,
    resume: () => { if (paused && !disposed) { paused = false; nextAt = 0; schedule(); } },
    destroy: () => { pause(); disposed = true; tracker.close(); listeners = []; },
    // keyboard fallback: hold Space to "close your eyes"
    force: (closed) => { s.forced = closed; set(closed); }
  };
}

// MediaPipe's synchronous inference otherwise blocks every animation and input event.
// A classic worker is required because its WASM loader uses importScripts().
function workerTracker() {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap === 'undefined') return reject(new Error('Worker vision unavailable'));
    const worker = new Worker(new URL('./eyes-worker.js', import.meta.url));
    let pending = null, ready = false, failed = null;
    const timer = setTimeout(() => fail(new Error('Vision worker timed out')), 15000);
    const fail = (error) => { failed = error; clearTimeout(timer); worker.terminate(); pending?.reject(error); pending = null; if (!ready) reject(error); };
    worker.onerror = (event) => fail(new Error(event.message || 'Vision worker failed'));
    worker.onmessage = ({ data }) => {
      if (data.type === 'ready') {
        clearTimeout(timer); ready = true;
        resolve({
          delegate: data.delegate + ' worker', worker: true, get failed() { return failed; },
          infer: async (video, time) => {
            if (failed) throw failed;
            const bitmap = await createImageBitmap(video);
            if (failed) { bitmap.close(); throw failed; }
            return new Promise((resolve, reject) => {
              pending = { resolve, reject };
              try { worker.postMessage({ type: 'frame', bitmap, time }, [bitmap]); }
              catch (error) { bitmap.close(); pending = null; reject(error); }
            });
          },
          close: () => fail(new Error('Vision worker closed'))
        });
      } else if (data.type === 'error') {
        fail(new Error(data.message));
      } else if (data.type === 'result') { pending?.resolve(data); pending = null; }
    };
  });
}

async function mainTracker() {
  const { FaceLandmarker, FilesetResolver } = await import('../vendor/mediapipe/vision_bundle.mjs');
  const files = await FilesetResolver.forVisionTasks(BASE + 'wasm');
  const make = (delegate) => FaceLandmarker.createFromOptions(files, {
    baseOptions: { modelAssetPath: BASE + 'face_landmarker.task', delegate },
    runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
  });
  let delegate = 'GPU', lm;
  try { lm = await make('GPU'); } catch { delegate = 'CPU'; lm = await make('CPU'); }
  return { delegate, worker: false,
    infer: (video, time) => { const start = performance.now(); const res = lm.detectForVideo(video, time); return { res, ms: performance.now() - start }; },
    close: () => lm.close() };
}

// Fallback when there is no camera or the model fails: keyboard only.
export function keyboardEyes() {
  const s = { closed: false, score: 0, face: false, blinks: 0, ms: 0, delegate: 'keyboard', forced: false };
  const listeners = [];
  return { state: s, onChange: (f) => listeners.push(f),
    force: (closed) => { if (closed !== s.closed) { s.closed = closed; s.score = closed ? 1 : 0; if (!closed) s.blinks++; listeners.forEach((f) => f(closed)); } } };
}
