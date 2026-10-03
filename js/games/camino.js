// Motor "camino": una ruta que se desplaza hacia ti (tipo Guitar Hero).
//  · axis 'pitch'  → escalas, sirenas, trinos, intervalos. Primero escuchas la ruta, luego la cantas. Cada ronda cambia de tonalidad.
//  · axis 'volume' → objetivos de volumen (piano / 5 m / 10 m / crescendo). Solo se canta.

import { createLoop, fitCanvas } from '../core/loop.js';
import { midiToFreq, foldToTarget, pcName } from '../core/pitch.js';

const SHIFTS = [0, 1, 2, 3, 2, 1, 0, -1, -2, -1];
const VIEW = 8; // segundos visibles
const CURSOR = 0.27; // posición horizontal del cursor
const VOL_TOL = 0.17;

function normalize(pattern, axis) {
  let t = 0;
  return pattern.map((s) => {
    const rest = !!s.rest;
    const raw = axis === 'volume' ? s.v : s.n;
    const [a, b] = Array.isArray(raw) ? raw : [raw, raw];
    const seg = { rest, a, b, glide: Array.isArray(raw) && a !== b, d: s.d, t0: t, t1: t + s.d, label: s.label || '', hit: 0, tot: 0 };
    t += s.d;
    return seg;
  });
}

export function mount(host, ex, env) {
  const p = ex.params;
  const axis = p.axis || 'pitch';
  const useMic = env.mic;
  const root = env.root;
  const tolCents = p.tol || 50;

  host.innerHTML = `<div class="g-camino">
    <div class="cm-top"><span class="cm-phase"></span><span class="cm-info"></span></div>
    <canvas class="cm-canvas"></canvas>
    <p class="cm-hint"></p>
    <div class="cm-foot"><span class="cm-syl"></span><span class="cm-score"></span></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const canvas = $('.cm-canvas');
  const phaseEl = $('.cm-phase');
  const infoEl = $('.cm-info');
  const hintEl = $('.cm-hint');
  const sylEl = $('.cm-syl');
  const scoreEl = $('.cm-score');
  sylEl.textContent = p.syllable ? `Sílaba: ${p.syllable}` : '';

  let round = 0;
  let shiftIdx = 0;
  let phase = axis === 'pitch' ? 'listen' : 'sing';
  let pt = 0;
  let segs = [];
  let total = 0;
  let history = [];
  let played = 0;
  let hit = 0;
  let tot = 0;
  let clock = 0;
  let userVal = null;
  let curTone = null;
  const guide = axis === 'pitch' && !useMic;

  const shift = () => (axis === 'pitch' ? SHIFTS[shiftIdx % SHIFTS.length] : 0);
  const midiOf = (seg, which) => root + shift() + (which === 'a' ? seg.a : seg.b);

  function fits(sh) {
    const r = env.range;
    if (!r || axis !== 'pitch') return true;
    const all = segs.filter((s) => !s.rest).flatMap((s) => [s.a, s.b]);
    return root + sh + Math.min(...all) >= r.low - 3 && root + sh + Math.max(...all) <= r.high + 3;
  }

  function loadRound() {
    segs = normalize(p.patterns[round % p.patterns.length], axis);
    total = segs[segs.length - 1].t1;
    if (axis === 'pitch') {
      for (let i = 0; i < SHIFTS.length && !fits(shift()); i++) shiftIdx++;
    }
    history = [];
    played = 0;
    env.audio.resetPitch();
  }

  function startPhase(name) {
    phase = name;
    pt = 0;
    played = 0;
    curTone?.stop();
    if (name === 'listen') {
      phaseEl.textContent = '🔊 Escucha';
      hintEl.textContent = 'Primero escucha la ruta completa…';
    } else {
      phaseEl.textContent = useMic ? '🎤 Canta' : '🎤 Canta junto';
      hintEl.textContent = axis === 'volume' ? 'Mantén tu voz sobre la barra: sube y baja el volumen sin cambiar la nota.' : 'Sigue la ruta. La octava es libre: canta en la que te quede cómoda.';
    }
  }

  const lead = () => (phase === 'listen' ? 0.8 : 2);
  const segAt = (tau) => segs.find((s) => tau >= s.t0 && tau < s.t1);

  function targetVal(seg, tau) {
    const f = seg.d > 0 ? (tau - seg.t0) / seg.d : 0;
    return seg.a + (seg.b - seg.a) * f;
  }

  function draw() {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 12;
    const tau = pt - lead();
    const cx = w * CURSOR;
    const pps = w / VIEW;
    const X = (time) => cx + (time - tau) * pps;
    const real = segs.filter((s) => !s.rest);
    let Y;
    let thick;
    if (axis === 'pitch') {
      const vals = real.flatMap((s) => [midiOf(s, 'a'), midiOf(s, 'b')]);
      const lo = Math.min(...vals);
      const hi = Math.max(...vals);
      const c = (lo + hi) / 2;
      const half = Math.max((hi - lo) / 2 + 3, 6);
      const perSemi = (h / 2 - pad) / half;
      Y = (m) => h / 2 - (m - c) * perSemi;
      thick = Math.max(14, (tolCents / 100) * 2 * perSemi);
    } else {
      Y = (v) => h - pad - v * (h - pad * 2);
      thick = VOL_TOL * 2 * (h - pad * 2);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 14);
    ctx.fill();
    // línea del cursor
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, pad);
    ctx.lineTo(cx, h - pad);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, w - pad * 2, h - pad * 2);
    ctx.clip();
    for (const s of real) {
      const x0 = X(s.t0);
      const x1 = X(s.t1);
      if (x1 < pad || x0 > w - pad) continue;
      const va = axis === 'pitch' ? midiOf(s, 'a') : s.a;
      const vb = axis === 'pitch' ? midiOf(s, 'b') : s.b;
      const active = tau >= s.t0 && tau < s.t1;
      const passed = tau >= s.t1;
      let color = phase === 'listen' ? 'rgba(129,140,248,0.75)' : 'rgba(45,212,191,0.55)';
      if (active && phase === 'sing') color = 'rgba(45,212,191,0.95)';
      if (passed && phase === 'sing' && useMic && s.tot > 0) color = s.hit / s.tot >= 0.6 ? 'rgba(74,222,128,0.8)' : 'rgba(248,113,113,0.7)';
      ctx.strokeStyle = color;
      ctx.lineWidth = thick;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0 + thick / 2, Y(va));
      ctx.lineTo(x1 - thick / 2 > x0 + thick / 2 ? x1 - thick / 2 : x0 + thick / 2, Y(vb));
      ctx.stroke();
      const label = s.label || (axis === 'pitch' && !s.glide ? pcName(va) : '');
      if (label) {
        ctx.fillStyle = 'rgba(255,255,255,0.95)';
        ctx.font = '700 15px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(label, (x0 + x1) / 2, Y(Math.max(va, vb)) - thick / 2 - 6);
      }
    }
    // trazo del usuario
    if (phase === 'sing' && useMic) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      let pen = false;
      for (const [tt, v] of history) {
        if (v == null) {
          pen = false;
          continue;
        }
        const x = X(tt);
        if (x < pad) {
          pen = false;
          continue;
        }
        const y = Y(v);
        if (!pen) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        pen = true;
      }
      ctx.stroke();
      if (userVal != null) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(cx, Y(userVal), 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function playSegs(tau) {
    while (played < segs.length && tau >= segs[played].t0) {
      const s = segs[played++];
      if (s.rest) continue;
      if (axis !== 'pitch') continue;
      const fa = midiToFreq(midiOf(s, 'a'));
      const fb = midiToFreq(midiOf(s, 'b'));
      curTone = s.glide ? env.audio.playGlide(fa, fb, s.d) : env.audio.playTone(fa, s.d * 0.95);
    }
  }

  const loop = createLoop((dt) => {
    clock += dt;
    pt += dt;
    const tau = pt - lead();

    if (phase === 'listen' || guide) playSegs(tau);

    if (phase === 'sing') {
      const s = useMic ? env.audio.sample({ pitch: axis === 'pitch' }) : null;
      userVal = null;
      const seg = segAt(tau);
      if (s) {
        if (axis === 'pitch') {
          if (s.midi != null) {
            const ref = seg && !seg.rest ? midiOf(seg, 'a') + (midiOf(seg, 'b') - midiOf(seg, 'a')) * ((tau - seg.t0) / seg.d) : (root + shift());
            userVal = foldToTarget(s.midi, ref);
          }
        } else userVal = s.level;
        history.push([tau, userVal]);
        if (history.length > 600) history.shift();
        if (seg && !seg.rest) {
          const want = axis === 'pitch' ? midiOf(seg, 'a') + (midiOf(seg, 'b') - midiOf(seg, 'a')) * ((tau - seg.t0) / seg.d) : targetVal(seg, tau);
          seg.tot += dt;
          tot += dt;
          const ok = userVal != null && (axis === 'pitch' ? Math.abs(userVal - want) * 100 <= (seg.glide ? Math.max(tolCents, 120) : tolCents) : Math.abs(userVal - want) <= VOL_TOL);
          if (ok) {
            seg.hit += dt;
            hit += dt;
          }
        }
      }
    }

    if (tau > total + 0.5) {
      if (phase === 'listen') startPhase('sing');
      else {
        round++;
        if (axis === 'pitch') shiftIdx++;
        loadRound();
        startPhase(axis === 'pitch' ? 'listen' : 'sing');
      }
    }

    infoEl.textContent = `Ronda ${round + 1}`;
    if (useMic && tot > 0) scoreEl.textContent = `${Math.round((hit / tot) * 100)}%`;
    draw();
  });

  loadRound();
  startPhase(phase);
  // Deja el primer fotograma listo antes de empezar
  requestAnimationFrame(draw);

  return {
    start: () => loop.start(),
    pause() {
      loop.stop();
      curTone?.stop();
    },
    resume: () => loop.start(),
    destroy() {
      loop.stop();
      curTone?.stop();
      host.innerHTML = '';
    },
    score: () => (useMic && tot > 0 ? hit / tot : null),
  };
}
