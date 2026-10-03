// Estado persistente en localStorage. Todo va en try/catch: si el almacenamiento falla, la app sigue en memoria.

const KEY = 'vocalia.v1';

const defaults = () => ({
  settings: {
    tonic: 0, // clase de nota de la tonalidad base (0 = Do)
    octave: 3, // registro de referencia: 3 = grave (♂), 4 = agudo (♀)
    micOn: true,
    sound: true,
    speed: 1, // multiplicador de duración: 0.7 corta, 1 normal, 1.5 larga
    includeExtras: true, // incluir los ejercicios marcados "Extra" en las tandas
    cal: null, // { floorDb, softDb, strongDb }
    range: null, // { low, high } en MIDI
  },
  progress: {}, // id → { stars, best, plays }
  days: {}, // 'YYYY-MM-DD' → { seconds, xp, sessions }
  records: { pinocho: [], mpt_sss: [], mpt_soplo: [] }, // [{ date, value }]
  challenge: { accepted: false, completed: {}, tests: {}, startedAt: null },
  xp: 0,
});

let state = null;

function merge(base, extra) {
  for (const k of Object.keys(extra || {})) {
    if (extra[k] && typeof extra[k] === 'object' && !Array.isArray(extra[k]) && base[k] && typeof base[k] === 'object') merge(base[k], extra[k]);
    else base[k] = extra[k];
  }
  return base;
}

export function load() {
  if (state) return state;
  state = defaults();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) merge(state, JSON.parse(raw));
  } catch {
    /* sin almacenamiento */
  }
  return state;
}

export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* sin almacenamiento */
  }
}

export function get() {
  return load();
}

export function reset() {
  state = defaults();
  save();
}

export const dateKey = (d = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export function keyRoot(settings = load().settings) {
  const { tonic, octave, range } = settings;
  if (range && range.high > range.low) {
    const center = Math.round((range.low + range.high) / 2) - 4;
    let best = null;
    for (let m = range.low; m <= range.high; m++) {
      if (m % 12 === tonic && (best == null || Math.abs(m - center) < Math.abs(best - center))) best = m;
    }
    if (best != null) return best;
  }
  return 12 * (octave + 1) + tonic;
}

export function addSeconds(seconds, xp = 0) {
  const s = load();
  const k = dateKey();
  const day = s.days[k] || (s.days[k] = { seconds: 0, xp: 0, sessions: 0 });
  day.seconds += Math.round(seconds);
  day.xp += xp;
  s.xp += xp;
  save();
}

export function addSession() {
  const s = load();
  const k = dateKey();
  const day = s.days[k] || (s.days[k] = { seconds: 0, xp: 0, sessions: 0 });
  day.sessions += 1;
  save();
}

export function recordExercise(id, stars, score) {
  const s = load();
  const p = s.progress[id] || (s.progress[id] = { stars: 0, best: 0, plays: 0 });
  p.plays += 1;
  p.stars = Math.max(p.stars, stars);
  if (score != null) p.best = Math.max(p.best, Math.round(score * 100));
  save();
}

export function addRecord(kind, value) {
  const s = load();
  (s.records[kind] || (s.records[kind] = [])).push({ date: dateKey(), value });
  if (s.records[kind].length > 200) s.records[kind].shift();
  save();
}

export function bestRecord(kind) {
  const list = load().records[kind] || [];
  return list.reduce((m, r) => Math.max(m, r.value), 0);
}

/** Días consecutivos con al menos una sesión (hoy cuenta si ya practicaste; si no, cuenta desde ayer). */
export function streak() {
  const days = load().days;
  const d = new Date();
  let n = 0;
  if (!days[dateKey(d)]?.sessions) d.setDate(d.getDate() - 1);
  while (days[dateKey(d)]?.sessions) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}

export function lastDays(count = 7) {
  const days = load().days;
  const out = [];
  const d = new Date();
  d.setDate(d.getDate() - (count - 1));
  for (let i = 0; i < count; i++) {
    out.push({ key: dateKey(d), label: 'DLMXJVS'[d.getDay()], seconds: days[dateKey(d)]?.seconds || 0 });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export function updateSettings(patch) {
  Object.assign(load().settings, patch);
  save();
}
