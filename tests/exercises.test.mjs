import test from 'node:test';
import assert from 'node:assert/strict';
import { EXERCISES, byCategory, effectiveDur } from '../js/data/exercises.js';
import { CATEGORIES, CATEGORY_ORDER, GROUPS } from '../js/data/categories.js';

const MODES = new Set(['guia', 'soplo', 'aire', 'nota', 'camino', 'volumen', 'ritmo', 'contador', 'kodaly', 'graba']);
const total = (cat, speed = 1) => byCategory(cat).reduce((t, e) => t + effectiveDur(e, speed), 0);
const avg = (cat) => total(cat) / byCategory(cat).length;

test('ids únicos, categorías y motores válidos', () => {
  const ids = new Set();
  for (const e of EXERCISES) {
    assert.ok(!ids.has(e.id), `id repetido: ${e.id}`);
    ids.add(e.id);
    assert.ok(CATEGORIES[e.cat], `categoría inexistente en ${e.id}`);
    assert.ok(MODES.has(e.mode), `motor inválido en ${e.id}: ${e.mode}`);
    assert.ok(e.title && e.text && e.dur > 0, `datos incompletos en ${e.id}`);
  }
});

test('todas las categorías tienen ejercicios y aparecen en algún grupo', () => {
  for (const c of Object.keys(CATEGORIES)) assert.ok(byCategory(c).length > 0, `sin ejercicios: ${c}`);
  assert.deepEqual([...CATEGORY_ORDER].sort(), Object.keys(CATEGORIES).sort());
  assert.equal(GROUPS.length, 3);
});

test('Relajación: 8 ejercicios de 30–45 s', () => {
  const rel = byCategory('relajacion');
  assert.equal(rel.length, 8);
  for (const e of rel.filter((x) => x.mode === 'guia')) assert.ok(e.dur >= 30 && e.dur <= 45, `${e.id}: ${e.dur}`);
});

test('Respiración dura más por ejercicio que Relajación (pedido del usuario)', () => {
  assert.ok(avg('respiracion') > avg('relajacion'), `respiración ${avg('respiracion')} vs relajación ${avg('relajacion')}`);
  assert.ok(Math.min(...byCategory('respiracion').map((e) => e.dur)) >= 30);
});

test('el multiplicador de velocidad escala los ejercicios normales pero no los de soplo', () => {
  const guia = byCategory('relajacion').find((e) => e.mode === 'guia');
  assert.ok(effectiveDur(guia, 1.5) > effectiveDur(guia, 1) && effectiveDur(guia, 0.7) < effectiveDur(guia, 1));
  const soplo = byCategory('respiracion')[0];
  assert.equal(effectiveDur(soplo, 1.5), soplo.dur);
});

test('los parámetros de los juegos están completos', () => {
  for (const e of EXERCISES) {
    if (e.mode === 'camino' || e.mode === 'volumen') assert.ok(Array.isArray(e.params.patterns) && e.params.patterns.length, e.id);
    if (e.mode === 'nota') assert.ok(e.params.targets?.length && e.params.holdSecs > 0, e.id);
    if (e.mode === 'ritmo') assert.ok(e.params.pattern?.length && e.params.bpm > 0, e.id);
    if (e.mode === 'guia') assert.ok(e.params.anim, e.id);
    if (e.mode === 'soplo') assert.ok(e.params.pattern && e.params.reps > 0, e.id);
  }
});
