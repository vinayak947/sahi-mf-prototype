import { useEffect, useRef } from "react";

/* Halftone dot field behind the order pads, after the hero on design.sahi.com: one WebGL2 fragment shader
   draws a 4px grid of magenta dots whose size follows slowly drifting 3D simplex noise. Tuned quieter than the
   web hero (slower drift, lower opacity) so it reads as texture, not motion. `active` false fades it out and
   stops drawing; it stays gone. */

const CELL_CSS = 4; // dot grid pitch, CSS px
const FREQ = 0.5; // noise scale: smaller = bigger, softer blobs
const SPEED = 0.035; // drift; well under the web's 0.08 so it never pulls the eye
const GAMMA = 1.6;
const BIAS = 0.02;
const INK = [0.902, 0.11, 0.604]; // #E61C9A
const ALPHA_LO = 0.03;
const ALPHA_HI = 0.04;
const FPS = 24;
const FADE_MS = 700; // keep in step with .mf-dotfield's opacity transition

const VERT = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform float uCell;
uniform vec3 uInk;
out vec4 fragColor;

vec3 mod289(vec3 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x){ return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x){ return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
vec3 hsv2rgb(vec3 c){
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}
void main(){
  vec2 pix = gl_FragCoord.xy;
  // density sampled once per cell so every dot is a clean circle
  vec2 center = (floor(pix / uCell) + 0.5) * uCell;
  vec2 uv = center / uResolution;
  uv = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0) + 0.5;
  vec3 col = hsv2rgb(vec3(abs(snoise(vec3(uv * ${FREQ.toFixed(3)}, uTime * ${SPEED.toFixed(3)}))), 1.0, 1.0));
  float g = pow(clamp(0.3 * col.r + 0.59 * col.g + 0.11 * col.b, 0.0001, 1.0), ${GAMMA.toFixed(2)});
  g = clamp(g + ${BIAS.toFixed(3)}, 0.0, 1.0);
  float dist = length(fract(pix / uCell) - 0.5);
  float aa = fwidth(dist) + 1e-4;
  float mark = 1.0 - smoothstep(g * 0.5 - aa, g * 0.5 + aa, dist);
  float a = mix(${ALPHA_LO.toFixed(3)}, ${ALPHA_HI.toFixed(3)}, g) * mark;
  fragColor = vec4(uInk * a, a); // premultiplied: iOS Safari ignores premultipliedAlpha:false and would draw solid pink
}`;

export function DotField({ active }: { active: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef(active);
  const halt = useRef(() => {});

  // Once faded, stop the loop for good; it keeps drawing through the fade so the dots don't freeze mid-way.
  useEffect(() => {
    live.current = active;
    if (active) return;
    const id = window.setTimeout(() => halt.current(), FADE_MS);
    return () => window.clearTimeout(id);
  }, [active]);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : (console.warn("dot field:", gl.getShaderInfoLog(s)), null);
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // One oversized triangle covers the viewport; the fragment shader does the rest.
    gl.bindVertexArray(gl.createVertexArray());
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "uResolution");
    const uTime = gl.getUniformLocation(prog, "uTime");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    gl.uniform1f(gl.getUniformLocation(prog, "uCell"), CELL_CSS * dpr);
    gl.uniform3f(gl.getUniformLocation(prog, "uInk"), INK[0], INK[1], INK[2]);
    // One draw per frame, so no blending: the canvas is premultiplied and takes (ink * alpha, alpha) as is.
    gl.clearColor(0, 0, 0, 0);

    // Start somewhere other than t=0 so each visit opens on a different pattern.
    const offset = Math.random() * 200;
    let time = offset;
    const render = (t: number) => {
      time = t;
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(uTime, t);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      render(time);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => ro.disconnect();

    // Throttled loop, paused while the tab is hidden.
    let raf = 0;
    let halted = false;
    let t0: number | null = null;
    let last = 0;
    const frame = (ts: number) => {
      if (halted) return;
      if (t0 === null) t0 = ts;
      if (ts - last >= 1000 / FPS) {
        last = ts;
        render(offset + (ts - t0) / 1000);
      }
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden && !halted) raf = requestAnimationFrame(frame);
    };
    halt.current = () => {
      halted = true;
      cancelAnimationFrame(raf);
    };
    if (!live.current) halted = true;
    const onVisibility = () => (document.hidden ? cancelAnimationFrame(raf) : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
<canvas ref={ref} className={`mf-dotfield${active ? "" : " off"}`} aria-hidden="true" />
  );
}
