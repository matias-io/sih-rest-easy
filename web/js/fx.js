// GPU path for the drunk screen. Whenever the backdrop is a picture or a live video (your real
// desktop, a shared window, a screenshot), every effect runs in one fragment shader: wobble,
// double vision, colour split, soft blur, saturation and hue. The CPU only uploads the frame.
const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `precision mediump float;
uniform sampler2D tex; uniform float t, lvl, en, kick, mode, seed, desktop; uniform vec2 fit, hueCS; uniform vec3 motion; varying vec2 uv;
float hash(float n){ return fract(sin(n * 12.9898 + seed) * 43758.5453); }
vec3 hue(vec3 c){ const vec3 k = vec3(0.57735); return c * hueCS.x + cross(k, c) * hueCS.y + k * dot(k, c) * (1.0 - hueCS.x); }
vec3 samp(vec2 q){ vec2 s = (q - 0.5) / fit + 0.5; if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return vec3(0.0); return texture2D(tex, s).rgb; }
void main(){
  // The neutral screen needs one sample, not eight samples and all the distortion math.
  if (lvl <= 0.08) { gl_FragColor = vec4(samp(uv), 1.0); return; }
  float amp = 0.3 + 0.7 * en;                                   // quiet music, calm screen
  float sway = max(0.0, lvl - 0.08) * amp, deep = max(0.0, lvl - 0.4) / 0.6 * amp, mlg = max(0.0, lvl - 0.72) / 0.28 * amp;
  float k = kick * smoothstep(0.25, 0.7, lvl);                    // the beat, once the screen is far enough gone
  if (desktop > 0.5) {
    // A bounded ghost image over the real desktop: no flips, mirrors or torn
    // coordinates that would make the visible controls disagree with clicks.
    float strength = smoothstep(0.08, 1.0, lvl);
    float pulse = 0.7 + 0.2 * en + 0.6 * k;
    vec2 drift = vec2(sin(t * 0.8), cos(t * 0.65)) * strength * pulse * (0.003 + 0.009 * strength);
    vec2 q = uv + drift;
    float r = strength * (0.001 + 0.006 * strength * pulse);
    vec3 blurred = (samp(q) * 2.0 + samp(q + vec2(r, r)) + samp(q - vec2(r, r))
      + samp(q + vec2(r, -r)) + samp(q + vec2(-r, r))) / 6.0;
    vec3 ghost = samp(q + vec2(0.006 + 0.02 * strength, 0.002 + 0.006 * sin(t * 0.9)) * strength * pulse);
    vec3 c = mix(blurred, ghost, strength * 0.45);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = hue(mix(vec3(l), c, 1.0 + strength * 0.8));
    gl_FragColor = vec4(c, 1.0);
    return;
  }
  vec2 q = uv;
  q = (q - 0.5) * (1.0 - 0.07 * k) + 0.5;                         // every beat punches in
  if (mode < 0.5) { q.x += (hash(floor(q.y * 14.0)) - 0.5) * 0.25 * k; }                    // torn slices
  else if (mode < 1.5) { if (k > 0.3) q.x = 0.5 - abs(q.x - 0.5); }                         // mirror
  else if (mode < 2.5) { float px = mix(500.0, 36.0, k); q = floor(q * px) / px; }          // pixels
  else if (mode < 3.5) { if (k > 0.4) q = fract(q * 2.0); }                                 // four screens
  else if (mode < 4.5) { if (k > 0.5) q = 1.0 - q; }                                        // upside down
  else if (mode < 5.5) { vec2 c2 = q - 0.5; float an = k * 2.5 * (0.6 - length(c2)); q = 0.5 + vec2(c2.x * cos(an) - c2.y * sin(an), c2.x * sin(an) + c2.y * cos(an)); }   // swirl
  q += vec2(sin(q.y * 7.0 + t * 1.3), cos(q.x * 6.0 + t * 1.1)) * (0.004 * sway + 0.022 * deep);   // wobble
  q.x += sin(q.y * 23.0 + t * 3.0) * 0.006 * mlg;
  float ca = 0.002 * sway + 0.008 * deep + ((mode > 5.5 && mode < 6.5) ? 0.035 * k : 0.0);                                                             // colour split
  vec3 a = vec3(samp(q + vec2(ca, 0.0)).r, samp(q).g, samp(q - vec2(ca, 0.0)).b);
  vec3 b = samp(q + motion.xy * sway);                           // double vision
  vec3 c = mix(a, b, min(0.5, sway * 0.7));
  float r = sway * 0.0012 + deep * 0.0025 * motion.z;                                    // soft focus
  vec3 bl = (samp(q + vec2(r, r)) + samp(q + vec2(-r, r)) + samp(q + vec2(r, -r)) + samp(q + vec2(-r, -r))) * 0.25;
  c = mix(c, bl, 0.5);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.0 + deep * 1.2 + mlg * 2.0);
  c = hue(c);
  if (mode > 6.5 && k > 0.5) c = 1.0 - c;                         // negative
  c += k * 0.10 * mlg;
  gl_FragColor = vec4(c, 1.0);
}`;

export function createFx(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false, powerPreference: 'high-performance', desynchronized: true });
  if (!gl) return { active: false, setSource() {}, clear() {}, draw() {} };
  const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
  const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
  for (const [k, v] of [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR], [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]) gl.texParameteri(gl.TEXTURE_2D, k, v);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  const U = { t: gl.getUniformLocation(prog, 't'), lvl: gl.getUniformLocation(prog, 'lvl'), fit: gl.getUniformLocation(prog, 'fit'), en: gl.getUniformLocation(prog, 'en'), kick: gl.getUniformLocation(prog, 'kick'), mode: gl.getUniformLocation(prog, 'mode'), seed: gl.getUniformLocation(prog, 'seed'), hueCS: gl.getUniformLocation(prog, 'hueCS'), motion: gl.getUniformLocation(prog, 'motion') };
  U.desktop = gl.getUniformLocation(prog, 'desktop');

  let src = null, contain = false, still = false, uploaded = false, lastTime = -1, through = false, off = false;
  let frameCallback = null, frameReady = true, sizeDirty = true, cssWidth = 0, cssHeight = 0;
  // Reading clientWidth after animated DOM writes can force layout. Read it only on resize.
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(() => { sizeDirty = true; }).observe(canvas);
  } else {
    window.addEventListener('resize', () => { sizeDirty = true; });
  }
  function stopFrames() {
    if (frameCallback !== null && src?.cancelVideoFrameCallback) src.cancelVideoFrameCallback(frameCallback);
    frameCallback = null;
  }
  function watchFrames(video) {
    frameCallback = video.requestVideoFrameCallback(() => {
      if (src !== video) return;
      frameReady = true;
      watchFrames(video);
    });
  }
  const fx = {
    active: false,
    // source: a <video> (live) or an <img>/<canvas> (still). contain keeps the picture's shape.
    // seeThrough (desktop app): while sober, hide the picture so the real desktop shows with no capture delay
    setSource(el, opts = {}) {
      stopFrames();
      through = !!opts.seeThrough; off = false; canvas.style.visibility = ''; src = el;
      contain = !!opts.contain; still = !(el instanceof HTMLVideoElement);
      uploaded = false; lastTime = -1; frameReady = true; sizeDirty = true;
      fx.active = true; canvas.hidden = false;
      if (!still && el.requestVideoFrameCallback) watchFrames(el);
    },
    clear() { stopFrames(); src = null; fx.active = false; canvas.hidden = true; canvas.style.opacity = ''; },
    draw(t, level, m = { energy: 1, kick: 0, mode: 0, seed: 0 }) {
      if (!src) return;
      // Desktop: the blurred, ghosted copy thickens with BAC (about 25% at 0.10, 60-75% at 0.40)
      // and the music pumps it, so the real screen is barely readable at the top.
      const s = Math.max(0, Math.min(1, (level - 0.08) / 0.92));
      canvas.style.opacity = through ? (s * (0.2 + 0.4 * s + 0.08 * Math.max(0, Math.min(1, m.energy)) + 0.07 * Math.max(0, Math.min(1, m.kick)))).toFixed(3) : '1';
      const hide = through && level < 0.08;
      if (hide !== off) { off = hide; canvas.style.visibility = hide ? 'hidden' : ''; }
      if (hide) return;
      if (sizeDirty) { cssWidth = canvas.clientWidth; cssHeight = canvas.clientHeight; sizeDirty = false; }
      if (!cssWidth || !cssHeight) return;
      // Spend pixels on a sharp sober screen; strong blur already discards detail. Bound
      // total pixels too, so portrait and very tall displays cannot overwhelm the GPU.
      const maxWidth = level < 0.08 ? 1920 : level < 0.4 ? 1600 : 1280;
      const maxPixels = maxWidth * maxWidth * 9 / 16;
      const scale = Math.min(devicePixelRatio || 1, maxWidth / cssWidth, Math.sqrt(maxPixels / (cssWidth * cssHeight)));
      const w = Math.max(1, Math.round(cssWidth * scale)), h = Math.max(1, Math.round(cssHeight * scale));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      const sw = src.videoWidth || src.naturalWidth || src.width, shh = src.videoHeight || src.naturalHeight || src.height;
      if (!sw) return;
      // Video currentTime can change every animation frame even for a 15/30 fps stream.
      // Upload once per decoded frame while continuing to animate the shader at display rate.
      const fresh = still ? !uploaded : src.readyState >= 2 && (!uploaded || (src.requestVideoFrameCallback ? frameReady : src.currentTime !== lastTime));
      if (fresh) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); uploaded = true; lastTime = src.currentTime; frameReady = false; } catch { return; } }
      if (!uploaded) return;
      let fx_ = 1, fy = 1;
      if (contain) { const ra = sw / shh, ca = w / h; if (ra > ca) fy = ca / ra; else fx_ = ra / ca; }
      gl.uniform1f(U.en, m.energy); gl.uniform1f(U.kick, m.kick); gl.uniform1f(U.mode, m.mode); gl.uniform1f(U.seed, m.seed);
      gl.uniform1f(U.desktop, through ? 1 : 0);
      gl.uniform1f(U.t, t); gl.uniform1f(U.lvl, level); gl.uniform2f(U.fit, fx_, fy);
      // These oscillations are identical for every pixel: calculate them once per frame.
      const amp = 0.3 + 0.7 * m.energy;
      const hueAngle = Math.max(0, level - 0.4) / 0.6 * amp * Math.sin(t * 0.6) * 1.2 + Math.max(0, level - 0.72) / 0.28 * amp * t * 4.2;
      gl.uniform2f(U.hueCS, Math.cos(hueAngle), Math.sin(hueAngle));
      gl.uniform3f(U.motion, Math.sin(t * 1.4) * 0.02, Math.cos(t * 1.1) * 0.008, Math.max(0, Math.sin(t * 0.8)));
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  return fx;
}
