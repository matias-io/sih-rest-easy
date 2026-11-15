// Classic worker: the MediaPipe WASM loader needs importScripts().
let landmarker;
(async () => {
  try {
    const { FaceLandmarker, FilesetResolver } = await import('../vendor/mediapipe/vision_bundle.mjs');
    const base = new URL('../vendor/mediapipe/', self.location.href).href;
    const files = await FilesetResolver.forVisionTasks(base + 'wasm');
    const make = (delegate) => FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: base + 'face_landmarker.task', delegate },
      canvas: new OffscreenCanvas(1, 1),
      runningMode: 'VIDEO', numFaces: 1, outputFaceBlendshapes: true
    });
    let delegate = 'GPU';
    try { landmarker = await make('GPU'); } catch { delegate = 'CPU'; landmarker = await make('CPU'); }
    self.postMessage({ type: 'ready', delegate });
  } catch (error) { self.postMessage({ type: 'error', message: String(error) }); }
})();
self.onmessage = ({ data }) => {
  if (data.type !== 'frame') return;
  try {
    const start = performance.now();
    const result = landmarker.detectForVideo(data.bitmap, data.time);
    const mesh = result.faceLandmarks?.[0];
    const eyes = mesh && Object.fromEntries([33, 133, 145, 159, 263, 362, 374, 386].map((i) => [i, mesh[i]]));
    // Transfer only the two scores and eight landmarks used by the UI, not a 478-point mesh.
    const categories = result.faceBlendshapes?.[0]?.categories.filter((c) => c.categoryName === 'eyeBlinkLeft' || c.categoryName === 'eyeBlinkRight');
    const res = { faceBlendshapes: categories ? [{ categories }] : [], faceLandmarks: eyes ? [eyes] : [] };
    self.postMessage({ type: 'result', res, ms: performance.now() - start });
  } catch (error) { self.postMessage({ type: 'error', message: String(error) }); }
  finally { data.bitmap.close(); }
};
