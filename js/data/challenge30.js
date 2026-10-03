// Desafío de 30 días "Súper poder pulmonar".
// Días 1–21: progresión del libro (verificada contra sus páginas). Días 22–30: consolidación propuesta por la app.

import { PATTERNS, patternHow, soploTotal } from './soploPatterns.js';

// Atajos: [patrón, repeticiones, opciones]
const J = (reps) => ['jadeante', reps];
const JP = (reps) => ['jadeante-poco', reps];
const S = (reps, secs) => ['suave', reps, { secs }];
const C = (reps, secs) => ['contenida', reps, { secs }];
const M = (reps, secs) => ['mantenida', reps, { secs }];
const CF = (reps, secs) => ['contenida-forzada', reps, { secs }];
const V = (reps) => ['vigorosa', reps];
const PO = (reps, cm) => ['poderosa', reps, { cm }];
const CR = (reps) => ['crescendo', reps];
const DE = (reps) => ['decrescendo', reps];
const CD = (reps) => ['cresc-decresc', reps];
const DC = (reps) => ['decresc-cresc', reps];
const PSV = (reps) => ['para-sopla-vigorosa', reps];
const PSS = (reps) => ['para-sopla-suave', reps];
const PRV = (reps) => ['para-respira-vigorosa', reps];
const PRS = (reps) => ['para-respira-suave', reps];
const SF = (reps) => ['suave-fuerte', reps];
const SMF = (reps) => ['suave-medio-fuerte', reps];
const BO = (reps) => ['bombeada', reps];

// Ejercicios cantados de los días de integración (28–29).
const SING = {
  notaLarga: {
    title: 'Nota larga en una sola exhalación',
    mode: 'nota',
    dur: 75,
    text: 'Toma un aliento completo y canta una vocal "a" en una nota cómoda, sostenida y pareja, todo el tiempo que te alcance el aire. Es el apoyo del soplo aplicado a la voz.',
    params: { targets: [0, 7, 4], holdSecs: 8, syllable: 'a' },
  },
  messa: {
    title: 'Crescendo-decrescendo cantado',
    mode: 'volumen',
    dur: 60,
    text: 'Canta una "a" en una nota cómoda: empieza muy suave, sube hasta fuerte y vuelve a suave, sin cortar el aire ni cambiar la afinación. Es el crescendo-decrescendo del soplo, ahora con voz.',
    params: { patterns: [[{ v: [0.15, 0.85], d: 6 }, { v: [0.85, 0.15], d: 6 }]] },
  },
  escalaUnAire: {
    title: 'Escala en un solo aire',
    mode: 'camino',
    dur: 75,
    text: 'Una escala corta de cinco notas en legato, con "oo", intentando que cada nota salga con el mismo aire parejo y sin tomar aliento a la mitad.',
    params: { patterns: [[0, 2, 4, 5, 7, 5, 4, 2, 0].map((n) => ({ n, d: 1.6 }))], syllable: 'oo' },
  },
};

export const BADGE_DAYS = { 7: 'Una semana de aire', 14: 'Dos semanas de aire', 21: 'Curso del libro completo', 30: 'Súper poder pulmonar' };

const BOOK = {
  1: [J(2), S(3, 30), C(3, 30)],
  2: [J(2), S(3, 35), V(3), C(3, 35)],
  3: [J(2), S(2, 40), V(3), JP(2), C(3, 40)],
  4: [J(2), V(3), JP(2), C(2, 45), S(2, 45)],
  5: [J(2), V(3), JP(2), C(2, 45), S(2, 45)],
  6: [J(1), JP(1), V(3), C(2, 60), S(2, 60)],
  7: [J(1), PO(6, 15), S(1, 60), C(1, 60), V(3)],
  8: [J(1), CF(3, 10), V(3), C(1, 60), S(1, 60)],
  9: [J(1), PO(6, 30), S(1, 60), C(1, 60), V(3)],
  10: [J(1), CF(3, 15), V(3), C(1, 60), S(1, 60)],
  11: [J(1), PO(6, 60), S(1, 60), C(1, 60), V(3)],
  12: [J(1), CF(3, 20), V(3), C(1, 60), S(1, 60)],
  13: [J(2), PO(3, 60), CR(3), DE(3), V(3)],
  14: [J(1), CF(3, 20), CR(3), DE(3), S(3, 60)],
  15: [CF(3, 20), CD(3), DC(3), M(1, 60)],
  16: [PO(3, 60), CD(3), DC(3), S(1, 60)],
  17: [CF(3, 20), PSV(3), PSS(3), CD(3), DC(3)],
  18: [CF(3, 20), PSV(3), PSS(3), CD(3), DC(3)],
  19: [CF(3, 20), SF(3), SMF(3), CD(3), S(3, 30)],
  20: [PO(3, 60), SF(3), SMF(3), DC(3), M(1, 60)],
  21: [CF(2, 20), SMF(1), CD(1), DC(1), BO(3), PRV(1), PRS(1), PO(3, 60)],
};

// Días 22–27: repaso en ciclo (16, 19, 17, 20, 18, 21). Días 28–29: integración. Día 30: prueba final.
const REVIEW_OF = { 22: 16, 23: 19, 24: 17, 25: 20, 26: 18, 27: 21 };

const STEPS = { ...BOOK };
for (const [d, src] of Object.entries(REVIEW_OF)) STEPS[d] = BOOK[src];
STEPS[28] = [J(1), S(2, 40), CD(2), { sing: 'notaLarga' }, { sing: 'messa' }];
STEPS[29] = [J(1), PSS(2), SMF(2), { sing: 'escalaUnAire' }, { sing: 'messa' }, S(1, 45)];
STEPS[30] = [J(1), S(1, 30), CD(1)];

const phaseOf = (n) =>
  n <= 5 ? 'Base' : n <= 12 ? 'Retenciones y papel' : n <= 16 ? 'Crescendo y decrescendo' : n <= 18 ? 'Para-sopla' : n <= 20 ? 'Suave-fuerte' : n === 21 ? 'Sesión final del libro' : n <= 27 ? `Repaso del día ${REVIEW_OF[n]}` : n <= 29 ? 'Integración con canto' : 'Prueba final';

export const TOTAL_DAYS = 30;

function stepToExercise(day, i, step) {
  if (step.sing) {
    const s = SING[step.sing];
    return { id: `d${day}-${i}-${step.sing}`, cat: 'desafio', extra: false, ...s };
  }
  const [pattern, reps, opts = {}] = step;
  const p = PATTERNS[pattern];
  const params = { pattern, reps, ...opts };
  const dur = Math.ceil(soploTotal(params));
  return {
    id: `d${day}-${i}-${pattern}`,
    cat: 'desafio',
    title: p.name,
    mode: 'soplo',
    fixed: true,
    dur,
    text: patternHow(p, opts),
    params,
  };
}

export function buildDay(n) {
  const steps = STEPS[n];
  if (!steps) throw new Error(`Día inválido: ${n}`);
  return steps.map((s, i) => stepToExercise(n, i, s));
}

export function dayInfo(n) {
  const exercises = buildDay(n);
  const seconds = exercises.reduce((t, e) => t + e.dur, 0);
  return {
    n,
    phase: phaseOf(n),
    exercises,
    seconds,
    badge: BADGE_DAYS[n] || null,
    isReview: n in REVIEW_OF,
    isFinal: n === TOTAL_DAYS,
    isIntegration: n === 28 || n === 29,
    fromBook: n <= 21,
  };
}

/** Resumen corto de un paso para las listas: "Suave · 3× · 30 s". */
export function stepLabel(ex) {
  if (ex.mode !== 'soplo') return `${ex.title} · ${Math.round(ex.dur / 60 * 10) / 10 || 1} min`;
  const { reps, secs, cm } = ex.params;
  const bits = [`${reps}×`];
  if (secs) bits.push(secs >= 60 && secs % 60 === 0 ? `${secs / 60} min` : `${secs} s`);
  if (cm) bits.push(`${cm} cm`);
  return `${ex.title} · ${bits.join(' · ')}`;
}
