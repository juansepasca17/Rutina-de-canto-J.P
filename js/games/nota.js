// Motor "nota": suena la referencia, tú cantas; una bolita sigue tu tono hasta llenar la barra de sostén.
// Compara por clase de nota (la octava es libre) para servir igual a voces graves y agudas.

import { createLoop, fitCanvas } from '../core/loop.js';
import { midiToFreq, foldToTarget, pcName } from '../core/pitch.js';

const TOL_CENTS = 40;
const SHIFTS = [0, 1, 2, 3, 2, 1, 0, -1, -2, -1];
const LISTEN = 1.5;
const OK_FLASH = 0.7;

export function mount(host, ex, env) {
  const p = ex.params;
  const targets = p.targets;
  const hold = p.holdSecs || 3;
  const useMic = env.mic;
  const root = env.root;

  host.innerHTML = `<div class="g-nota">
    <div class="nt-top"><div class="nt-note"></div><div class="nt-syl"></div></div>
    <canvas class="nt-canvas"></canvas>
    <div class="nt-bar"><i></i></div>
    <p class="nt-hint"></p>
    <div class="nt-foot"><span class="nt-cents"></span><span class="nt-score"></span></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const noteEl = $('.nt-note');
  const sylEl = $('.nt-syl');
  const canvas = $('.nt-canvas');
  const barEl = $('.nt-bar i');
  const hintEl = $('.nt-hint');
  const centsEl = $('.nt-cents');
  const scoreEl = $('.nt-score');

  let idx = 0;
  let shiftIdx = 0;
  let phase = 'listen';
  let pt = 0; // tiempo en la fase
  let held = 0;
  let onTime = 0;
  let singTime = 0;
  let tone = null;
  let history = []; // [t, midi|null]
  let clock = 0;
  let targetMidi = 0;
  let inTune = false;

  const currentShift = () => SHIFTS[shiftIdx % SHIFTS.length];

  function validShift(shift) {
    const r = env.range;
    if (!r) return true;
    const lo = root + shift + Math.min(...targets);
    const hi = root + shift + Math.max(...targets);
    return lo >= r.low - 3 && hi <= r.high + 3;
  }

  function beginTarget(play = true) {
    targetMidi = root + currentShift() + targets[idx];
    phase = 'listen';
    pt = 0;
    held = 0;
    history = [];
    env.audio.resetPitch();
    tone?.stop();
    if (play) tone = env.audio.playTone(midiToFreq(targetMidi), LISTEN - 0.2);
    noteEl.textContent = pcName(targetMidi);
    sylEl.textContent = p.syllable ? `canta "${p.syllable}"` : '';
    hintEl.textContent = 'Escucha la nota…';
    barEl.style.width = '0%';
    env.onTarget?.({ offset: targets[idx] + currentShift(), degree: targets[idx], idx, midi: targetMidi });
  }

  function advance() {
    idx++;
    if (idx >= targets.length) {
      idx = 0;
      for (let i = 0; i < SHIFTS.length; i++) {
        shiftIdx++;
        if (validShift(currentShift())) break;
      }
    }
    beginTarget();
  }

  function draw(now) {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 12;
    const span = 6; // semitonos por encima y debajo
    const Y = (m) => h / 2 - ((m - targetMidi) / span) * (h / 2 - pad);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 14);
    ctx.fill();
    // líneas de semitono
    ctx.strokeStyle = 'rgba(255,255,255,0.06)';
    ctx.lineWidth = 1;
    for (let s = -span; s <= span; s++) {
      ctx.beginPath();
      ctx.moveTo(pad, Y(targetMidi + s));
      ctx.lineTo(w - pad, Y(targetMidi + s));
      ctx.stroke();
    }
    // banda objetivo
    const bandH = (TOL_CENTS / 100) * ((h / 2 - pad) / span) * 2;
    ctx.fillStyle = phase === 'ok' ? 'rgba(74,222,128,0.55)' : 'rgba(45,212,191,0.32)';
    ctx.fillRect(pad, Y(targetMidi) - bandH, w - pad * 2, bandH * 2);
    ctx.strokeStyle = 'rgba(45,212,191,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(pad, Y(targetMidi));
    ctx.lineTo(w - pad, Y(targetMidi));
    ctx.stroke();
    if (phase === 'listen') {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = '600 20px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🔊 escucha', w / 2, Y(targetMidi) - bandH - 14);
      return;
    }
    if (!useMic) return;
    // traza
    const win = 4.5;
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    let pen = false;
    let lastX = w - pad;
    let lastY = h / 2;
    for (const [tt, m] of history) {
      if (m == null || clock - tt > win) {
        pen = false;
        continue;
      }
      const x = w - pad - ((clock - tt) / win) * (w - pad * 2);
      const y = Math.max(pad, Math.min(h - pad, Y(foldToTarget(m, targetMidi))));
      if (!pen) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      pen = true;
      lastX = x;
      lastY = y;
    }
    ctx.stroke();
    const latest = history[history.length - 1];
    if (latest && latest[1] != null && clock - latest[0] < 0.2) {
      ctx.fillStyle = inTune ? '#4ade80' : '#ffd166';
      ctx.beginPath();
      ctx.arc(lastX, lastY, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const loop = createLoop((dt, now) => {
    clock += dt;
    pt += dt;
    inTune = false;
    let cents = null;

    if (phase === 'listen') {
      if (pt >= LISTEN) {
        phase = 'sing';
        pt = 0;
        hintEl.textContent = useMic ? 'Ahora tú: canta la nota y sostenla' : 'Ahora tú: canta y sostén la nota';
      }
    } else if (phase === 'sing') {
      const s = useMic ? env.audio.sample({ pitch: true }) : null;
      if (s) {
        history.push([clock, s.midi]);
        if (history.length > 400) history.shift();
        singTime += dt;
        if (s.midi != null) {
          cents = (foldToTarget(s.midi, targetMidi) - targetMidi) * 100;
          if (Math.abs(cents) <= TOL_CENTS) {
            inTune = true;
            onTime += dt;
          }
        }
        held = inTune ? held + dt : Math.max(0, held - dt * 0.6);
        if (held >= hold) {
          phase = 'ok';
          pt = 0;
          env.audio.chime();
          hintEl.textContent = '¡Bien! ✔';
        } else if (pt > Math.max(14, hold * 4)) {
          advance();
        }
      } else {
        held = Math.min(hold, pt);
        if (pt >= hold + 1) advance();
      }
      barEl.style.width = `${Math.min(100, (held / hold) * 100)}%`;
    } else if (phase === 'ok') {
      barEl.style.width = '100%';
      if (pt >= OK_FLASH) advance();
    }

    if (cents == null) centsEl.textContent = phase === 'sing' && useMic ? 'Sin tono claro' : '';
    else centsEl.textContent = Math.abs(cents) <= TOL_CENTS ? `✔ en tono (${Math.round(cents)}¢)` : cents > 0 ? `▲ alto ${Math.round(cents)}¢` : `▼ bajo ${Math.round(-cents)}¢`;
    if (useMic && singTime > 0) scoreEl.textContent = `${Math.round((onTime / singTime) * 100)}%`;
    draw(now);
  });

  beginTarget(false); // prepara textos; el sonido empieza con start()
  let began = false;

  return {
    start() {
      if (!began) {
        began = true;
        tone = env.audio.playTone(midiToFreq(targetMidi), LISTEN - 0.2);
      }
      loop.start();
    },
    pause() {
      loop.stop();
      tone?.stop();
    },
    resume: () => loop.start(),
    destroy() {
      loop.stop();
      tone?.stop();
      host.innerHTML = '';
    },
    score: () => (useMic && singTime > 0 ? onTime / singTime : null),
  };
}
