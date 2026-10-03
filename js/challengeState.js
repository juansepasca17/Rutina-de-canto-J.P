// Estado del desafío de 30 días (lógica sin interfaz).

import * as storage from './core/storage.js';
import { TOTAL_DAYS } from './data/challenge30.js';

export const state = () => storage.get().challenge;

export const isDone = (n) => !!state().completed[n];
export const doneCount = () => Object.keys(state().completed).length;

/** Primer día sin completar (1..30) o null si ya terminaste todo. */
export function currentDay() {
  for (let n = 1; n <= TOTAL_DAYS; n++) if (!isDone(n)) return n;
  return null;
}

export function markComplete(n, summary) {
  const c = state();
  const prev = c.completed[n];
  c.completed[n] = { date: storage.dateKey(), stars: Math.max(prev?.stars || 0, summary.stars), seconds: summary.seconds };
  storage.save();
}

export function accept() {
  const c = state();
  c.accepted = true;
  c.startedAt ||= storage.dateKey();
  storage.save();
}

export function saveTest(which, values) {
  const c = state();
  c.tests[which] = { date: storage.dateKey(), ...values };
  storage.save();
}

/** Días transcurridos desde la última sesión completada (null si nunca). */
export function daysSinceLast() {
  const dates = Object.values(state().completed).map((d) => d.date).sort();
  if (!dates.length) return null;
  const [y, m, d] = dates[dates.length - 1].split('-').map(Number);
  const last = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now - last) / 86400000);
}

export function reset() {
  const c = state();
  c.accepted = false;
  c.completed = {};
  c.tests = {};
  c.startedAt = null;
  storage.save();
}
