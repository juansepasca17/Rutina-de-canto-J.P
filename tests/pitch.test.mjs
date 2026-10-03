import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPitch, freqToMidi, midiToFreq, foldToTarget, centsFrom, midiName, PitchSmoother } from '../js/core/pitch.js';
import { normalize, buildCalibration, DEFAULT_CAL } from '../js/core/level.js';

const SR = 48000;

function sine(freq, n = 2048, amp = 0.3, noise = 0) {
  const b = new Float32Array(n);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let i = 0; i < n; i++) b[i] = amp * Math.sin((2 * Math.PI * freq * i) / SR) + noise * rnd();
  return b;
}

const centsBetween = (a, b) => Math.abs(1200 * Math.log2(a / b));

for (const f of [110, 146.83, 220, 261.63, 440, 880]) {
  test(`detecta ${f} Hz (seno limpio) dentro de ±5 cents`, () => {
    const r = detectPitch(sine(f), SR);
    assert.ok(r, 'debe detectar tono');
    assert.ok(centsBetween(r.freq, f) < 5, `obtuvo ${r.freq}`);
  });
}

test('detecta 220 Hz con armónicos y ruido dentro de ±15 cents', () => {
  const n = 2048;
  const b = new Float32Array(n);
  let seed = 99;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    b[i] = 0.25 * Math.sin(2 * Math.PI * 220 * t) + 0.12 * Math.sin(2 * Math.PI * 440 * t) + 0.06 * Math.sin(2 * Math.PI * 660 * t) + 0.02 * rnd();
  }
  const r = detectPitch(b, SR);
  assert.ok(r);
  assert.ok(centsBetween(r.freq, 220) < 15, `obtuvo ${r.freq}`);
});

test('el silencio devuelve null', () => {
  assert.equal(detectPitch(new Float32Array(2048), SR), null);
  assert.equal(detectPitch(sine(220, 2048, 0.001), SR), null);
});

test('el ruido blanco no da un tono claro', () => {
  const b = new Float32Array(2048);
  let seed = 7;
  for (let i = 0; i < b.length; i++) b[i] = 0.3 * (((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1);
  const r = detectPitch(b, SR);
  assert.ok(r === null || r.clarity < 0.9);
});

test('conversiones de notas', () => {
  assert.equal(Math.round(freqToMidi(440)), 69);
  assert.ok(Math.abs(midiToFreq(60) - 261.6256) < 0.01);
  assert.equal(midiName(60), 'Do4');
  assert.equal(midiName(69), 'La4');
});

test('foldToTarget ignora la octava', () => {
  assert.equal(foldToTarget(48, 60), 60);
  assert.equal(foldToTarget(75, 60), 63);
  assert.ok(Math.abs(centsFrom(48.5, 60) - 50) < 1e-9);
  assert.ok(Math.abs(centsFrom(71.6, 60) - -40) < 1e-6);
});

test('PitchSmoother usa la mediana y sostiene un instante', () => {
  const s = new PitchSmoother(5, 200);
  s.push(60, 0);
  s.push(60.1, 10);
  s.push(70, 20); // valor atípico
  assert.ok(Math.abs(s.push(60.05, 30) - 60.05) < 0.06);
  assert.ok(s.push(null, 100) != null);
  assert.equal(s.push(null, 500), null);
});

test('normalize: silencio→0, soplo suave→~0.3, fuerte→~0.9, monotónico', () => {
  assert.equal(normalize(-90), 0);
  assert.ok(Math.abs(normalize(DEFAULT_CAL.softDb) - 0.3) < 1e-9);
  assert.ok(Math.abs(normalize(DEFAULT_CAL.strongDb) - 0.9) < 1e-9);
  assert.equal(normalize(0), 1);
  let prev = -1;
  for (let db = -80; db <= 0; db += 2) {
    const v = normalize(db);
    assert.ok(v >= prev);
    prev = v;
  }
});

test('buildCalibration garantiza orden suelo < suave < fuerte', () => {
  const c = buildCalibration({ silence: -60, soft: -62, strong: -61 });
  assert.ok(c.floorDb < c.softDb && c.softDb < c.strongDb);
  const ok = buildCalibration({ silence: -60, soft: -40, strong: -15 });
  assert.equal(ok.softDb, -40);
  assert.equal(ok.strongDb, -15);
});

test('buildCalibration acota el suelo si el silencio medido es digital (-120 dB)', () => {
  const c = buildCalibration({ silence: -120, soft: -38, strong: -16 });
  assert.equal(c.floorDb, -75);
});
