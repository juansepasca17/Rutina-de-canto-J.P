// Detección de tono (YIN) y utilidades de notas. Sin DOM: se puede probar con Node.

export const A4 = 440;
export const NOTE_NAMES = ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'];
export const SOLFEGE = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];

export const freqToMidi = (f) => 69 + 12 * Math.log2(f / A4);
export const midiToFreq = (m) => A4 * Math.pow(2, (m - 69) / 12);
export const pcOf = (m) => ((Math.round(m) % 12) + 12) % 12;
export const pcName = (m) => NOTE_NAMES[pcOf(m)];
export const midiName = (m) => `${pcName(m)}${Math.floor(Math.round(m) / 12) - 1}`;

// Desplaza `midi` por octavas hasta quedar lo más cerca posible de `target`.
export const foldToTarget = (midi, target) => midi + 12 * Math.round((target - midi) / 12);

// Desviación en cents respecto a `target`, ignorando la octava.
export const centsFrom = (midi, target) => (foldToTarget(midi, target) - target) * 100;

const cache = { n: 0, d: null, c: null };

/**
 * YIN: devuelve { freq, clarity, rms } o null si no hay tono claro.
 * buf: Float32Array de muestras (recomendado 2048).
 */
export function detectPitch(buf, sampleRate, { minHz = 70, maxHz = 1100, threshold = 0.15, minRms = 0.006 } = {}) {
  const N = buf.length;
  const W = N >> 1;
  let sum = 0;
  for (let i = 0; i < N; i++) sum += buf[i] * buf[i];
  const rms = Math.sqrt(sum / N);
  if (rms < minRms) return null;

  const tauMin = Math.max(2, Math.floor(sampleRate / maxHz));
  const tauMax = Math.min(W - 1, Math.ceil(sampleRate / minHz));
  if (cache.n !== tauMax + 1) {
    cache.n = tauMax + 1;
    cache.d = new Float32Array(cache.n);
    cache.c = new Float32Array(cache.n);
  }
  const d = cache.d;
  const c = cache.c;

  for (let tau = 1; tau <= tauMax; tau++) {
    let s = 0;
    for (let j = 0; j < W; j++) {
      const diff = buf[j] - buf[j + tau];
      s += diff * diff;
    }
    d[tau] = s;
  }
  let running = 0;
  c[0] = 1;
  for (let tau = 1; tau <= tauMax; tau++) {
    running += d[tau];
    c[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  let tau = -1;
  for (let t = tauMin; t <= tauMax; t++) {
    if (c[t] < threshold) {
      while (t + 1 <= tauMax && c[t + 1] < c[t]) t++;
      tau = t;
      break;
    }
  }
  if (tau === -1) return null;

  const x0 = tau > 1 ? c[tau - 1] : c[tau];
  const x1 = c[tau];
  const x2 = tau < tauMax ? c[tau + 1] : c[tau];
  const denom = x0 + x2 - 2 * x1;
  const shift = denom !== 0 ? (x0 - x2) / (2 * denom) : 0;
  const freq = sampleRate / (tau + shift);
  if (freq < minHz || freq > maxHz) return null;
  return { freq, clarity: 1 - x1, rms };
}

/** Suaviza la secuencia de notas con la mediana de las últimas `size` lecturas. */
export class PitchSmoother {
  constructor(size = 5, holdMs = 140) {
    this.size = size;
    this.holdMs = holdMs;
    this.vals = [];
    this.lastGood = null;
    this.lastAt = 0;
  }
  push(midi, now = performance.now()) {
    if (midi == null) {
      if (this.lastGood != null && now - this.lastAt < this.holdMs) return this.lastGood;
      this.vals.length = 0;
      this.lastGood = null;
      return null;
    }
    this.vals.push(midi);
    if (this.vals.length > this.size) this.vals.shift();
    const s = [...this.vals].sort((a, b) => a - b);
    this.lastGood = s[s.length >> 1];
    this.lastAt = now;
    return this.lastGood;
  }
  reset() {
    this.vals.length = 0;
    this.lastGood = null;
  }
}
