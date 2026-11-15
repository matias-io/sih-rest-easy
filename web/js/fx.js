// GPU path for the drunk screen. Whenever the backdrop is a picture or a live video (your real
// desktop, a shared window, a screenshot), every effect runs in one fragment shader: wobble,
// double vision, colour split, soft blur, saturation and hue. The CPU only uploads the frame.
const VERT = `attribute vec2 p; varying vec2 uv; void main(){ uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `precision mediump float;
uniform sampler2D tex; uniform float t, lvl; uniform vec2 fit; varying vec2 uv;
vec3 hue(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a), sa = sin(a); return c * ca + cross(k, c) * sa + k * dot(k, c) * (1.0 - ca); }
vec3 samp(vec2 q){ vec2 s = (q - 0.5) / fit + 0.5; if (s.x < 0.0 || s.x > 1.0 || s.y < 0.0 || s.y > 1.0) return vec3(0.0); return texture2D(tex, s).rgb; }
void main(){
  float sway = max(0.0, lvl - 0.08), deep = max(0.0, lvl - 0.4) / 0.6, mlg = max(0.0, lvl - 0.72) / 0.28;
  vec2 q = uv;
  q += vec2(sin(q.y * 7.0 + t * 1.3), cos(q.x * 6.0 + t * 1.1)) * (0.004 * sway + 0.022 * deep);   // wobble
  q.x += sin(q.y * 23.0 + t * 3.0) * 0.006 * mlg;
  float ca = 0.002 * sway + 0.008 * deep;                                                             // colour split
  vec3 a = vec3(samp(q + vec2(ca, 0.0)).r, samp(q).g, samp(q - vec2(ca, 0.0)).b);
  vec3 b = samp(q + vec2(sin(t * 1.4) * 0.02, cos(t * 1.1) * 0.008) * sway);                           // double vision
  vec3 c = mix(a, b, min(0.5, sway * 0.7));
  float r = sway * 0.0012 + deep * 0.0025 * max(0.0, sin(t * 0.8));                                    // soft focus
  vec3 bl = (samp(q + vec2(r, r)) + samp(q + vec2(-r, r)) + samp(q + vec2(r, -r)) + samp(q + vec2(-r, -r))) * 0.25;
  c = mix(c, bl, 0.5);
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(l), c, 1.0 + deep * 1.2 + mlg * 2.0);
  c = hue(c, deep * sin(t * 0.6) * 1.2 + mlg * t * 4.2);
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
  const U = { t: gl.getUniformLocation(prog, 't'), lvl: gl.getUniformLocation(prog, 'lvl'), fit: gl.getUniformLocation(prog, 'fit') };

  let src = null, contain = false, still = false, uploaded = false, lastTime = -1, through = false, off = false;
  const fx = {
    active: false,
    // source: a <video> (live) or an <img>/<canvas> (still). contain keeps the picture's shape.
    // seeThrough (desktop app): while sober, hide the picture so the real desktop shows with no capture delay
    setSource(el, opts = {}) { through = !!opts.seeThrough; off = false; canvas.style.visibility = ''; src = el; contain = !!opts.contain; still = !(el instanceof HTMLVideoElement); uploaded = false; lastTime = -1; fx.active = true; canvas.hidden = false; },
    clear() { src = null; fx.active = false; canvas.hidden = true; },
    draw(t, level) {
      if (!src) return;
      const hide = through && level < 0.08;
      if (hide !== off) { off = hide; canvas.style.visibility = hide ? 'hidden' : ''; }
      if (hide) return;
      // 1920 wide is plenty for a picture that is being smeared anyway, and keeps 4K screens cheap
      const scale = Math.min(1, 1920 / (canvas.clientWidth * devicePixelRatio)) * devicePixelRatio;
      const w = Math.round(canvas.clientWidth * scale), h = Math.round(canvas.clientHeight * scale);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); }
      const sw = src.videoWidth || src.naturalWidth || src.width, shh = src.videoHeight || src.naturalHeight || src.height;
      if (!sw) return;
      const fresh = still ? !uploaded : src.readyState >= 2 && src.currentTime !== lastTime;
      if (fresh) { try { gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, src); uploaded = true; lastTime = src.currentTime; } catch { return; } }
      if (!uploaded) return;
      let fx_ = 1, fy = 1;
      if (contain) { const ra = sw / shh, ca = w / h; if (ra > ca) fy = ca / ra; else fx_ = ra / ca; }
      gl.uniform1f(U.t, t); gl.uniform1f(U.lvl, level); gl.uniform2f(U.fit, fx_, fy);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
  };
  return fx;
}
