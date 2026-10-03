// Nivel de señal: RMS → dB → escala 0..1 calibrada (0 = silencio, ~0.3 = soplo suave, ~0.9 = fuerte).

export const DEFAULT_CAL = { floorDb: -58, softDb: -38, strongDb: -16 };

export function rmsOf(buf) {
  let s = 0;
  for (let i = 0; i < buf.length; i++) s += buf[i] * buf[i];
  return Math.sqrt(s / buf.length);
}

export const toDb = (rms) => 20 * Math.log10(Math.max(rms, 1e-6));

const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

export function normalize(db, cal) {
  const c = { ...DEFAULT_CAL, ...(cal || {}) };
  const softAt = 0.3;
  const strongAt = 0.9;
  if (db <= c.softDb) return clamp01((softAt * (db - c.floorDb)) / Math.max(1, c.softDb - c.floorDb));
  return clamp01(softAt + ((strongAt - softAt) * (db - c.softDb)) / Math.max(1, c.strongDb - c.softDb));
}

export function percentile(values, p) {
  if (!values.length) return -120;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))];
}

/** Convierte las 3 mediciones de calibración en un objeto de calibración válido. */
export function buildCalibration({ silence, soft, strong }) {
  const floorDb = Math.max(-75, silence + 4); // un suelo irrealmente bajo (silencio digital) deformaría la escala
  const softDb = Math.max(soft, floorDb + 6);
  const strongDb = Math.max(strong, softDb + 8);
  return { floorDb, softDb, strongDb };
}
