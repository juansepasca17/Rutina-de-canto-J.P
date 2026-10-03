// Motor "ritmo": metrónomo + patrón de sílabas que se desplaza. Primero escuchas el patrón, luego lo marcas
// (toque en pantalla, barra espaciadora o tu voz si el micrófono está activo). Puntúa la precisión.

import { createLoop, fitCanvas } from '../core/loop.js';
import { midiToFreq } from '../core/pitch.js';

const VIEW = 6.5;
const CURSOR = 0.22;
const WINDOW = 0.2; // tolerancia en segundos

export function mount(host, ex, env) {
  const p = ex.params;
  const bd = 60 / p.bpm;
  const useMic = env.mic;
  const beatsTotal = p.pattern.reduce((s, n) => s + n.d, 0);
  const passLen = beatsTotal * bd;
  const COUNT_IN = 4 * bd;
  const stepText = { 1: 'Di la sílaba en cada golpe (ta, ti…)', 2: 'Di el nombre de la nota en cada golpe', 3: 'Canta cada nota con su ritmo' }[p.step] || '';

  host.innerHTML = `<div class="g-ritmo">
    <div class="rt-top"><span class="rt-phase"></span><span class="rt-judge"></span></div>
    <canvas class="rt-canvas"></canvas>
    <button class="rt-tap" type="button">TOCA<small>o barra espaciadora${useMic ? ' · o tu voz' : ''}</small></button>
    <p class="rt-hint">${stepText}</p>
    <div class="rt-foot"><span>${p.bpm} bpm</span><span class="rt-score"></span></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const canvas = $('.rt-canvas');
  const tapBtn = $('.rt-tap');
  const phaseEl = $('.rt-phase');
  const judgeEl = $('.rt-judge');
  const scoreEl = $('.rt-score');

  let rt = 0;
  let frameAt = performance.now();
  let hits = 0;
  let judged = 0;
  let beatIdx = 0;
  let notes = []; // { t, s, pass, user, state, midi }
  let builtPasses = 0;
  let judgeTimer = 0;
  let armed = true;
  let running = false;

  const passKind = (k) => (k % 3 === 0 ? 'demo' : 'user');

  function buildPass(k) {
    let beat = 0;
    p.pattern.forEach((n, i) => {
      notes.push({
        t: COUNT_IN + k * passLen + beat * bd,
        s: n.s,
        d: n.d,
        pass: k,
        user: passKind(k) === 'user',
        state: 'pending',
        played: false,
        midi: p.melody ? env.root + p.melody[i % p.melody.length] : null,
      });
      beat += n.d;
    });
    builtPasses = k + 1;
  }

  function judge(text, cls) {
    judgeEl.textContent = text;
    judgeEl.className = `rt-judge ${cls}`;
    judgeTimer = 0.9;
  }

  function tap() {
    if (!running) return;
    const now = rt + (performance.now() - frameAt) / 1000;
    let best = null;
    for (const n of notes) {
      if (!n.user || n.state !== 'pending') continue;
      const d = Math.abs(n.t - now);
      if (d <= WINDOW && (!best || d < Math.abs(best.t - now))) best = n;
    }
    tapBtn.classList.add('hit');
    setTimeout(() => tapBtn.classList.remove('hit'), 90);
    if (!best) {
      // Un toque fuera de tiempo durante "Ahora tú" cuenta como fallo (así tocar sin parar no da 100 %).
      const k = Math.floor((now - COUNT_IN) / passLen);
      if (now >= COUNT_IN && passKind(k) === 'user') {
        judged++;
        judge('Fuera de tiempo', 'meh');
      }
      return;
    }
    best.state = 'hit';
    hits++;
    judged++;
    const d = now - best.t;
    const ad = Math.abs(d);
    if (ad < 0.06) judge('¡Perfecto!', 'good');
    else if (ad < 0.13) judge(d < 0 ? 'Bien (un pelín antes)' : 'Bien (un pelín después)', 'good');
    else judge(d < 0 ? 'Casi (antes)' : 'Casi (después)', 'meh');
  }

  const onKey = (e) => {
    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault();
      tap();
    }
  };
  tapBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    tap();
  });
  window.addEventListener('keydown', onKey);

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 12;
    const cx = w * CURSOR;
    const view = w < 520 ? 5 : VIEW;
    const pps = w / view;
    const X = (t) => cx + (t - rt) * pps;
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 14);
    ctx.fill();
    // pulsos del metrónomo
    ctx.strokeStyle = 'rgba(255,255,255,0.09)';
    ctx.lineWidth = 1;
    const firstBeat = Math.floor((rt - CURSOR * view) / bd);
    for (let b = firstBeat; b < firstBeat + view / bd + 3; b++) {
      const x = X(b * bd);
      if (x < pad || x > w - pad) continue;
      ctx.beginPath();
      ctx.moveTo(x, pad);
      ctx.lineTo(x, h - pad);
      ctx.stroke();
    }
    // cabezal
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, pad);
    ctx.lineTo(cx, h - pad);
    ctx.stroke();
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.clip();
    for (const n of notes) {
      const x = X(n.t);
      if (x < -20 || x > w + 20) continue;
      const near = Math.abs(n.t - rt) < 0.12;
      let fill = n.user ? 'rgba(45,212,191,0.9)' : 'rgba(129,140,248,0.85)';
      if (n.state === 'hit') fill = '#4ade80';
      if (n.state === 'miss') fill = '#f87171';
      // el radio depende de la duración de la nota, para que las corcheas no se encimen
      const r = Math.max(10, Math.min(22, n.d * bd * pps * 0.46)) + (near ? 3 : 0);
      ctx.fillStyle = fill;
      ctx.beginPath();
      ctx.arc(x, h / 2, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0b1020';
      ctx.font = `700 ${r < 16 ? 12 : 15}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(n.s, x, h / 2 + 4);
    }
    ctx.restore();
  }

  const loop = createLoop((dt) => {
    rt += dt;
    frameAt = performance.now();
    running = true;
    // metrónomo
    while (beatIdx * bd <= rt) {
      const b = beatIdx;
      const inCount = b * bd < COUNT_IN;
      env.audio.click(b % 4 === 0);
      if (inCount) phaseEl.textContent = `${(b % 4) + 1}…`;
      beatIdx++;
    }
    // pases futuros
    while (builtPasses * passLen + COUNT_IN < rt + VIEW + 1) buildPass(builtPasses);
    // sonido de las notas de demostración
    for (const n of notes) {
      if (!n.user && !n.played && rt >= n.t) {
        n.played = true;
        env.audio.playTone(n.midi != null ? midiToFreq(n.midi) : 392, 0.25, { gain: 0.16 });
      }
      if (n.user && n.state === 'pending' && rt > n.t + WINDOW) {
        n.state = 'miss';
        judged++;
      }
    }
    if (notes.length > 80) notes = notes.filter((n) => n.t > rt - 3);
    // fase
    if (rt >= COUNT_IN) {
      const k = Math.floor((rt - COUNT_IN) / passLen);
      phaseEl.textContent = passKind(k) === 'demo' ? '🔊 Escucha el patrón' : '🎯 Ahora tú';
    }
    // micrófono como entrada
    if (useMic) {
      const s = env.audio.sample();
      if (s) {
        if (armed && s.level > 0.35) {
          armed = false;
          tap();
        } else if (!armed && s.level < 0.15) armed = true;
      }
    }
    judgeTimer = Math.max(0, judgeTimer - dt);
    if (judgeTimer === 0) judgeEl.textContent = '';
    if (judged > 0) scoreEl.textContent = `${Math.round((hits / judged) * 100)}%`;
    draw();
  });

  buildPass(0);
  phaseEl.textContent = 'Prepárate…';
  requestAnimationFrame(draw);

  return {
    start: () => loop.start(),
    pause() {
      loop.stop();
      running = false;
    },
    resume() {
      frameAt = performance.now();
      loop.start();
    },
    destroy() {
      loop.stop();
      running = false;
      window.removeEventListener('keydown', onKey);
      host.innerHTML = '';
    },
    score: () => (judged > 0 ? hits / judged : null),
  };
}
