// One generated, non-video atmospheric background -- slow-drifting fog
// blobs plus a soft light halo, entirely in the site's own navy hue,
// mounted once per page (index.html and game.html each call this at
// startup) so every screen shares the exact same backdrop instead of a
// flat color or a per-screen effect. No canvas/WebGL asset, no video file:
// everything here is a handful of radial gradients redrawn on a fixed,
// full-viewport <canvas> sitting behind all page content.
//
// Kept deliberately cheap for low-end mobile: gradient *stops* fade to
// transparent (no expensive per-frame ctx.filter blur), the canvas itself
// is capped at 1.5x device pixel ratio, and the draw loop self-throttles to
// ~24fps -- plenty smooth for motion this slow, a fraction of the cost of
// 60fps. `prefers-reduced-motion` freezes it on a single static frame.

const BLOBS = [
  { rx: 0.30, ry: 0.35, r: 0.55, hue: 205, sat: 65, light: 22, alpha: 0.38, speedX: 0.000085, speedY: 0.000060, phase: 0.0 },
  { rx: 0.72, ry: 0.22, r: 0.50, hue: 212, sat: 55, light: 18, alpha: 0.32, speedX: -0.000070, speedY: 0.000095, phase: 2.1 },
  { rx: 0.18, ry: 0.78, r: 0.50, hue: 196, sat: 50, light: 16, alpha: 0.32, speedX: 0.000075, speedY: -0.000080, phase: 4.2 },
  { rx: 0.85, ry: 0.82, r: 0.46, hue: 222, sat: 45, light: 14, alpha: 0.28, speedX: -0.000060, speedY: -0.000065, phase: 1.4 },
  { rx: 0.50, ry: 0.55, r: 0.40, hue: 201, sat: 60, light: 20, alpha: 0.20, speedX: 0.000050, speedY: 0.000040, phase: 3.0 },
];
const HALO = { rx: 0.55, ry: 0.12, r: 0.42, hue: 200, sat: 35, light: 60, alpha: 0.07, speedX: 0.000030, speedY: 0.000022, phase: 0.6 };
const BASE_FILL = 'hsl(201, 100%, 9%)';
const FRAME_INTERVAL_MS = 40; // ~24fps cap

export function mountAtmosphereBackground() {
  if (document.getElementById('atmosphere-bg')) return; // never double-mount
  const canvas = document.createElement('canvas');
  canvas.id = 'atmosphere-bg';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  let width = 0;
  let height = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    width = canvas.width = Math.max(1, Math.floor(window.innerWidth * dpr));
    height = canvas.height = Math.max(1, Math.floor(window.innerHeight * dpr));
  }
  window.addEventListener('resize', resize);
  resize();

  function drawBlob(blob, t) {
    const cx = (blob.rx + Math.sin(t * blob.speedX + blob.phase) * 0.12) * width;
    const cy = (blob.ry + Math.cos(t * blob.speedY + blob.phase) * 0.12) * height;
    const r = blob.r * Math.max(width, height);
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    gradient.addColorStop(0, `hsla(${blob.hue}, ${blob.sat}%, ${blob.light}%, ${blob.alpha})`);
    gradient.addColorStop(1, `hsla(${blob.hue}, ${blob.sat}%, ${blob.light}%, 0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  function draw(t) {
    ctx.fillStyle = BASE_FILL;
    ctx.fillRect(0, 0, width, height);
    BLOBS.forEach(blob => drawBlob(blob, t));
    drawBlob(HALO, t);
  }

  let lastDraw = 0;
  let rafId = null;
  function frame(t) {
    if (document.hidden) { rafId = requestAnimationFrame(frame); return; }
    if (t - lastDraw >= FRAME_INTERVAL_MS) {
      lastDraw = t;
      draw(t);
    }
    if (!reduceMotion) rafId = requestAnimationFrame(frame);
  }

  draw(0);
  if (!reduceMotion) rafId = requestAnimationFrame(frame);

  return () => { // exposed for tests / hot-reload scenarios, not used by either page today
    if (rafId) cancelAnimationFrame(rafId);
    window.removeEventListener('resize', resize);
    canvas.remove();
  };
}
