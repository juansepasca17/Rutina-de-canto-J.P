// Bucle de animación pausable. fn(dt en segundos, now en ms).

export function createLoop(fn) {
  let raf = 0;
  let last = 0;
  let running = false;
  const frame = (t) => {
    if (!running) return;
    const dt = Math.min(0.1, (t - last) / 1000);
    last = t;
    fn(dt, t);
    raf = requestAnimationFrame(frame);
  };
  return {
    start() {
      if (running) return;
      running = true;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    },
    stop() {
      running = false;
      cancelAnimationFrame(raf);
    },
    get running() {
      return running;
    },
  };
}

/** Ajusta un canvas a su tamaño CSS con densidad de pantalla; devuelve { ctx, w, h }. */
export function fitCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, canvas.clientWidth);
  const h = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}
