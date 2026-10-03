// Motor "soplo": series de respiración guiadas (inhala → acción → recupera) con curva objetivo medida por el micrófono.
// Sin micrófono funciona igual como guion cronometrado.

import { createLoop, fitCanvas } from '../core/loop.js';
import { PATTERNS, INHALE, RECOVER, patternHow } from '../data/soploPatterns.js';

const PHASE_TEXT = {
  inhala: ['INHALA', 'Aliento completo por la boca: cintura → pecho → arriba, en 1 segundo.'],
  recupera: ['RECUPERA', 'Respira normal por la nariz y suelta el aire que te quede.'],
};

export function mount(host, ex, env) {
  const { pattern, reps = 1, ...opts } = ex.params;
  const pat = PATTERNS[pattern];
  const actDur = pat.dur(opts);
  const total = reps * (INHALE + actDur + RECOVER);
  const useMic = env.mic;

  host.innerHTML = `<div class="g-soplo">
    <div class="sp-head"><span class="sp-rep"></span><span class="sp-phase"></span></div>
    <div class="sp-main">
      <div class="sp-balloon"><div class="sp-balloon-fill"></div><span class="sp-count"></span></div>
      <canvas class="sp-canvas"></canvas>
    </div>
    <p class="sp-hint"></p>
    <div class="sp-foot"><div class="sp-meter"><i></i></div><span class="sp-score"></span></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const repEl = $('.sp-rep');
  const phaseEl = $('.sp-phase');
  const balloon = $('.sp-balloon');
  const fill = $('.sp-balloon-fill');
  const countEl = $('.sp-count');
  const canvas = $('.sp-canvas');
  const hintEl = $('.sp-hint');
  const meterEl = $('.sp-meter i');
  const scoreEl = $('.sp-score');

  let t = 0; // tiempo interno
  let level = 0;
  let hits = 0;
  let scored = 0;
  let lastPhaseKey = '';
  let done = false;
  let trace = []; // muestras del nivel durante la acción: [t, level]
  const isHold = pat.kind === 'hold';

  const phaseAt = (time) => {
    const per = INHALE + actDur + RECOVER;
    const rep = Math.min(reps - 1, Math.floor(time / per));
    const local = time - rep * per;
    if (local < INHALE) return { rep, name: 'inhala', local, dur: INHALE };
    if (local < INHALE + actDur) return { rep, name: 'accion', local: local - INHALE, dur: actDur };
    return { rep, name: 'recupera', local: local - INHALE - actDur, dur: RECOVER };
  };

  const labelOf = (local) => {
    const l = typeof pat.label === 'function' ? pat.label(opts, local) : pat.label;
    return l;
  };

  function draw(ph) {
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    const pad = 14;
    const X = (tt) => pad + (tt / actDur) * (w - pad * 2);
    const Y = (v) => h - pad - v * (h - pad * 2);
    // fondo de la zona de juego
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 14);
    ctx.fill();
    if (pat.kind !== 'hold') {
      // banda objetivo
      const steps = Math.max(24, Math.floor((w - pad * 2) / 4));
      ctx.fillStyle = 'rgba(45,212,191,0.22)';
      let open = false;
      for (let i = 0; i <= steps; i++) {
        const tt = (i / steps) * actDur;
        const b = pat.target(Math.min(tt, actDur - 1e-6), opts, actDur);
        if (b) {
          if (!open) {
            ctx.beginPath();
            ctx.moveTo(X(tt), Y(b[1]));
            open = { pts: [[tt, b[0]]] };
          } else {
            ctx.lineTo(X(tt), Y(b[1]));
            open.pts.push([tt, b[0]]);
          }
        } else if (open) {
          for (let k = open.pts.length - 1; k >= 0; k--) ctx.lineTo(X(open.pts[k][0]), Y(open.pts[k][1]));
          ctx.closePath();
          ctx.fill();
          open = false;
        }
      }
      if (open) {
        for (let k = open.pts.length - 1; k >= 0; k--) ctx.lineTo(X(open.pts[k][0]), Y(open.pts[k][1]));
        ctx.closePath();
        ctx.fill();
      }
    }
    // trazo del usuario
    if (useMic && trace.length > 1) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      trace.forEach(([tt, v], i) => (i ? ctx.lineTo(X(tt), Y(v)) : ctx.moveTo(X(tt), Y(v))));
      ctx.stroke();
    }
    // cabezal
    if (ph.name === 'accion') {
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(X(ph.local), pad);
      ctx.lineTo(X(ph.local), h - pad);
      ctx.stroke();
      if (useMic) {
        ctx.fillStyle = '#ffd166';
        ctx.beginPath();
        ctx.arc(X(ph.local), Y(level), 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function setPhase(ph) {
    const key = `${ph.rep}:${ph.name}`;
    if (key === lastPhaseKey) return;
    lastPhaseKey = key;
    repEl.textContent = `Repetición ${ph.rep + 1} de ${reps}`;
    host.dataset.phase = ph.name;
    if (ph.name === 'accion') {
      phaseEl.textContent = isHold ? 'MANTÉN' : pat.kind === 'pant' ? 'JADEA' : 'SOPLA';
      hintEl.textContent = labelOf(0);
      trace = [];
      env.audio.beep(1040, 0.12);
    } else {
      const [name, hint] = PHASE_TEXT[ph.name];
      phaseEl.textContent = name;
      hintEl.textContent = hint;
      env.audio.beep(ph.name === 'inhala' ? 660 : 440, 0.1);
    }
    canvas.hidden = ph.name !== 'accion' || isHold;
    balloon.hidden = !(ph.name !== 'accion' || isHold);
  }

  const loop = createLoop((dt) => {
    if (done) return;
    t += dt;
    if (t >= total) {
      done = true;
      loop.stop();
      env.complete();
      return;
    }
    const ph = phaseAt(t);
    setPhase(ph);

    const s = useMic ? env.audio.sample() : null;
    level = s ? level + (s.level - level) * 0.4 : 0;
    meterEl.style.width = `${Math.round(level * 100)}%`;
    meterEl.parentElement.hidden = !useMic;

    if (ph.name === 'accion') {
      if (useMic) {
        trace.push([ph.local, level]);
        const band = pat.target(ph.local, opts, actDur);
        if (band) {
          scored += dt;
          const ok = pat.kind === 'pant' ? level >= band[0] : level >= band[0] - 0.02 && level <= band[1] + 0.02;
          if (ok) hits += dt;
        }
        scoreEl.textContent = scored > 0 ? `${Math.round((hits / scored) * 100)}%` : '';
      }
      hintEl.textContent = labelOf(ph.local);
      if (isHold) {
        countEl.textContent = Math.max(0, Math.ceil(actDur - ph.local));
        fill.style.transform = 'scale(1)';
      } else {
        draw(ph);
      }
    } else {
      const f = ph.local / ph.dur;
      countEl.textContent = ph.name === 'recupera' ? Math.max(0, Math.ceil(ph.dur - ph.local)) : '';
      fill.style.transform = `scale(${ph.name === 'inhala' ? 0.35 + 0.65 * f : 1 - 0.6 * Math.min(1, f * 2)})`;
    }
  });

  // fija texto inicial
  setPhase(phaseAt(0));

  return {
    start() {
      loop.start();
    },
    pause() {
      loop.stop();
    },
    resume() {
      loop.start();
    },
    destroy() {
      loop.stop();
      host.innerHTML = '';
    },
    score: () => (useMic && scored > 0 ? hits / scored : null),
    describe: () => patternHow(pat, opts),
  };
}
