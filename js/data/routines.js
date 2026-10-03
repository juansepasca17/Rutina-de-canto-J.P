// Armado de tandas a partir de las categorías.

import { CATEGORY_ORDER } from './categories.js';
import { byCategory, effectiveDur } from './exercises.js';

/** Ejercicios de una categoría respetando el interruptor de "Extra". */
export function stepsForCategory(cat, settings) {
  const list = byCategory(cat);
  return settings.includeExtras === false ? list.filter((e) => !e.extra) : list;
}

export function stepsForFull(settings) {
  return CATEGORY_ORDER.flatMap((c) => stepsForCategory(c, settings));
}

export const totalSeconds = (steps, speed = 1) => steps.reduce((t, e) => t + effectiveDur(e, speed), 0);
