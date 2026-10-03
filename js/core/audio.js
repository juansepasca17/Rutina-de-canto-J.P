// Audio: micrófono, lecturas de nivel/tono, síntesis de referencia y avisos.
// Con ?debug=1 se puede inyectar una señal de prueba en lugar del micrófono real (window.vocalia.setTestSignal).

import { detectPitch, freqToMidi, midiToFreq, PitchSmoother } from './pitch.js';
import { rmsOf, toDb, normalize } from './level.js';

let ctx = null;
let master = null;
const input = { ready: false, kind: 'none', analyser: null, buf: null, stream: null };
let testGraph = null;
let soundOn = true;
let cal = null;

const smoother = new PitchSmoother(5, 140);
let lastSample = { at: 0, value: null };

export const setSound = (on) => (soundOn = !!on);
export const setCalibration = (c) => (cal = c);
export const isDebug = () => new URLSearchParams(location.search).has('debug');

export function getCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export const micReady = () => input.ready;
export const inputKind = () => input.kind;
export const getStream = () => input.stream;

function attachAnalyser(node) {
  const c = getCtx();
  const analyser = c.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0;
  node.connect(analyser);
  input.analyser = analyser;
  input.buf = new Float32Array(analyser.fftSize);
  input.ready = true;
}

/** Activa el micrófono (o la señal de prueba en ?debug=1). Devuelve true si quedó listo. */
export async function initMic() {
  if (input.ready) return true;
  const c = getCtx();
  if (isDebug()) {
    const gain = c.createGain();
    gain.gain.value = 1;
    attachAnalyser(gain);
    testGraph = { gain, osc: null, noise: null, out: null };
    input.kind = 'test';
    return true;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: 1 },
    });
    const src = c.createMediaStreamSource(stream);
    const hp = c.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 60;
    src.connect(hp);
    attachAnalyser(hp);
    input.stream = stream;
    input.kind = 'mic';
    return true;
  } catch (err) {
    console.warn('Micrófono no disponible:', err);
    return false;
  }
}

/** Solo para pruebas (?debug=1): { type: 'off'|'tone'|'noise', freq, gain } */
export function setTestSignal({ type = 'off', freq = 220, gain = 0.3 } = {}) {
  if (!testGraph) return false;
  const c = getCtx();
  const stop = (n) => {
    try {
      n?.stop();
      n?.disconnect();
    } catch {
      /* ya parado */
    }
  };
  stop(testGraph.osc);
  stop(testGraph.noise);
  testGraph.osc = testGraph.noise = null;
  if (testGraph.out) testGraph.out.disconnect();
  if (type === 'off') return true;
  const out = c.createGain();
  out.gain.value = gain;
  out.connect(testGraph.gain);
  testGraph.out = out;
  if (type === 'tone') {
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;
    osc.connect(out);
    osc.start();
    testGraph.osc = osc;
  } else {
    const len = c.sampleRate;
    const buffer = c.createBuffer(1, len, c.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.connect(out);
    src.start();
    testGraph.noise = src;
  }
  return true;
}

/**
 * Lee el micrófono: { db, level (0..1 calibrado), midi|null, clarity }.
 * Con { pitch: true } calcula también el tono. Reutiliza la lectura si es del mismo fotograma.
 */
export function sample({ pitch = false } = {}) {
  if (!input.ready) return null;
  const now = performance.now();
  if (lastSample.value && now - lastSample.at < 8 && (!pitch || lastSample.value.pitched)) return lastSample.value;
  input.analyser.getFloatTimeDomainData(input.buf);
  const rms = rmsOf(input.buf);
  const db = toDb(rms);
  const out = { db, level: normalize(db, cal), midi: null, clarity: 0, pitched: pitch };
  if (pitch) {
    const p = detectPitch(input.buf, getCtx().sampleRate);
    const midi = p && p.clarity > 0.75 ? freqToMidi(p.freq) : null;
    out.midi = smoother.push(midi, now);
    out.clarity = p ? p.clarity : 0;
  }
  lastSample = { at: now, value: out };
  return out;
}

export const resetPitch = () => smoother.reset();

/* ---------- Salida: tonos de referencia y avisos ---------- */

/** Tono tipo piano suave. Devuelve { stop } para cortarlo antes. */
export function playTone(freq, dur = 1, { gain = 0.22, when = 0 } = {}) {
  if (!soundOn) return { stop() {} };
  const c = getCtx();
  const t0 = c.currentTime + when;
  const out = c.createGain();
  out.gain.setValueAtTime(0.0001, t0);
  out.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  out.gain.exponentialRampToValueAtTime(gain * 0.6, t0 + Math.min(0.25, dur * 0.4));
  out.gain.setValueAtTime(gain * 0.6, t0 + Math.max(0.05, dur - 0.12));
  out.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  out.connect(master);
  const oscs = [
    [1, 'triangle', 1],
    [2, 'sine', 0.3],
    [3, 'sine', 0.1],
  ].map(([mult, type, level]) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq * mult;
    g.gain.value = level;
    o.connect(g).connect(out);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return o;
  });
  return {
    stop() {
      try {
        out.gain.cancelScheduledValues(c.currentTime);
        out.gain.setTargetAtTime(0.0001, c.currentTime, 0.02);
        oscs.forEach((o) => o.stop(c.currentTime + 0.1));
      } catch {
        /* ya parado */
      }
    },
  };
}

export const playMidi = (midi, dur = 1, opts) => playTone(midiToFreq(midi), dur, opts);

/** Glissando de f0 a f1 en `dur` segundos. */
export function playGlide(f0, f1, dur = 2, { gain = 0.2 } = {}) {
  if (!soundOn) return { stop() {} };
  const c = getCtx();
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'triangle';
  o.frequency.setValueAtTime(f0, t0);
  o.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
  g.gain.setValueAtTime(gain, t0 + dur - 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return {
    stop() {
      try {
        g.gain.cancelScheduledValues(c.currentTime);
        g.gain.setTargetAtTime(0.0001, c.currentTime, 0.02);
        o.stop(c.currentTime + 0.1);
      } catch {
        /* ya parado */
      }
    },
  };
}

export function beep(freq = 880, dur = 0.09, gain = 0.12) {
  return playTone(freq, dur, { gain });
}

export function click(accent = false) {
  if (!soundOn) return;
  const c = getCtx();
  const t0 = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = 'square';
  o.frequency.value = accent ? 1500 : 1000;
  g.gain.setValueAtTime(accent ? 0.18 : 0.11, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.05);
  o.connect(g).connect(master);
  o.start(t0);
  o.stop(t0 + 0.06);
}

export const chime = () => {
  playTone(784, 0.25, { gain: 0.14 });
  playTone(1047, 0.4, { gain: 0.14, when: 0.12 });
};
