import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDay, dayInfo, TOTAL_DAYS, BADGE_DAYS } from '../js/data/challenge30.js';
import { PATTERNS, soploTotal, INHALE, RECOVER } from '../js/data/soploPatterns.js';

test('hay 30 días definidos y cada uno tiene ejercicios', () => {
  assert.equal(TOTAL_DAYS, 30);
  for (let d = 1; d <= 30; d++) {
    const ex = buildDay(d);
    assert.ok(ex.length >= 3, `día ${d} con pocos ejercicios`);
  }
});

test('cada sesión de los días 1–29 dura entre 3 y 8 minutos', () => {
  for (let d = 1; d <= 29; d++) {
    const { seconds } = dayInfo(d);
    assert.ok(seconds >= 3 * 60 && seconds <= 8 * 60, `día ${d}: ${(seconds / 60).toFixed(1)} min`);
  }
});

test('el día 30 es solo un calentamiento corto: la prueba final se suma aparte', () => {
  const { seconds } = dayInfo(30);
  assert.ok(seconds >= 60 && seconds <= 3 * 60, `día 30: ${(seconds / 60).toFixed(1)} min`);
});

test('todos los patrones referidos existen y los ids son únicos por día', () => {
  for (let d = 1; d <= 30; d++) {
    const ids = new Set();
    for (const e of buildDay(d)) {
      assert.ok(!ids.has(e.id), `id repetido ${e.id}`);
      ids.add(e.id);
      if (e.mode === 'soplo') assert.ok(PATTERNS[e.params.pattern], `patrón ${e.params.pattern} en día ${d}`);
      assert.ok(e.text && e.title && e.dur > 0);
    }
  }
});

test('las retenciones nunca superan 1 minuto (regla de seguridad del libro)', () => {
  for (let d = 1; d <= 30; d++) {
    for (const e of buildDay(d)) {
      if (e.mode !== 'soplo') continue;
      const p = PATTERNS[e.params.pattern];
      if (p.kind === 'hold') assert.ok(p.dur(e.params) <= 60, `día ${d}: retención de ${p.dur(e.params)} s`);
    }
  }
});

test('progresión del libro: días 4=5, 17=18 y los tiempos crecen', () => {
  const sig = (d) => JSON.stringify(buildDay(d).map((e) => [e.params?.pattern, e.params?.reps, e.params?.secs, e.params?.cm]));
  assert.equal(sig(4), sig(5));
  assert.equal(sig(17), sig(18));
  const hold = (d) => buildDay(d).find((e) => e.params?.pattern === 'contenida')?.params.secs;
  assert.deepEqual([hold(1), hold(2), hold(3), hold(4), hold(6)], [30, 35, 40, 45, 60]);
  const papel = (d) => buildDay(d).find((e) => e.params?.pattern === 'poderosa')?.params.cm;
  assert.deepEqual([papel(7), papel(9), papel(11)], [15, 30, 60]);
  const forzada = (d) => buildDay(d).find((e) => e.params?.pattern === 'contenida-forzada')?.params.secs;
  assert.deepEqual([forzada(8), forzada(10), forzada(12)], [10, 15, 20]);
});

test('días 22–27 repiten sesiones del libro y 28–29 incluyen canto', () => {
  const pats = (d) => buildDay(d).map((e) => e.id.replace(/^d\d+-/, ''));
  assert.deepEqual(pats(22).map((s) => s.slice(2)), pats(16).map((s) => s.slice(2)));
  assert.ok(buildDay(28).some((e) => e.mode === 'nota'));
  assert.ok(buildDay(28).some((e) => e.mode === 'volumen'));
  assert.ok(buildDay(29).some((e) => e.mode === 'camino'));
});

test('día 30 es la prueba final e insignias en 7, 14, 21 y 30', () => {
  assert.equal(dayInfo(30).isFinal, true);
  assert.deepEqual(Object.keys(BADGE_DAYS).map(Number), [7, 14, 21, 30]);
});

test('soploTotal suma reps × (inhalar + acción + recuperar)', () => {
  assert.equal(soploTotal({ pattern: 'suave', reps: 3, secs: 30 }), 3 * (INHALE + 30 + RECOVER));
  assert.equal(soploTotal({ pattern: 'crescendo', reps: 3 }), 3 * (INHALE + 8 + RECOVER));
  assert.throws(() => soploTotal({ pattern: 'no-existe', reps: 1 }));
});
