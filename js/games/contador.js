// Motor "contador": cronómetro de fonación con récord.
//  · kind 'pinocho' → mides cuánto aire te dura diciendo "pin uno, pin dos…" y registras hasta qué número llegaste.
//  · kind 'mpt'     → tiempo máximo de un sonido sostenido ("sss" o soplo suave).
// Con micrófono el cronómetro arranca y para solo (al detectar sonido/silencio); sin micrófono usas los botones.

import { createLoop } from '../core/loop.js';

const START_LEVEL = 0.15;
const STOP_LEVEL = 0.08;
const STOP_AFTER = 0.8;

const fmt = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;

export function mount(host, ex, env) {
  const p = ex.params;
  const kind = p.kind;
  const recKey = kind === 'pinocho' ? 'pinocho' : p.key || 'mpt_sss';
  const useMic = env.mic;
  const prevBest = env.storage.bestRecord(recKey);
  const unit = kind === 'pinocho' ? '' : ' s';
  const label = kind === 'pinocho' ? 'Pinocho' : p.sound === 'soplo' ? 'Soplo suave' : '"Sss"';

  host.innerHTML = `<div class="g-contador">
    <div class="ct-title">${label}</div>
    <div class="ct-time">0:00.0</div>
    <div class="ct-status"></div>
    <div class="ct-ask" hidden>
      <span>${kind === 'pinocho' ? '¿Hasta qué número llegaste?' : ''}</span>
      <div class="ct-stepper"><button type="button" data-d="-1" aria-label="menos">−</button><output>0</output><button type="button" data-d="1" aria-label="más">+</button></div>
      <button type="button" class="btn ct-save">Guardar intento</button>
    </div>
    <div class="ct-actions"></div>
    <div class="ct-list"></div>
    <div class="ct-best"></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const timeEl = $('.ct-time');
  const statusEl = $('.ct-status');
  const askEl = $('.ct-ask');
  const outEl = $('.ct-stepper output');
  const actionsEl = $('.ct-actions');
  const listEl = $('.ct-list');
  const bestEl = $('.ct-best');

  let state = 'idle'; // idle | waiting | timing | ask
  let elapsed = 0;
  let above = 0;
  let below = 0;
  let count = 0;
  let pendingSecs = 0;
  const attempts = [];
  let saved = false;

  const best = () => attempts.reduce((m, a) => Math.max(m, a), 0);

  function renderBest() {
    listEl.innerHTML = attempts.map((a) => `<span class="chip">${kind === 'pinocho' ? a : `${a.toFixed(1)} s`}</span>`).join('');
    const b = best();
    bestEl.textContent = `Tu récord: ${prevBest ? (kind === 'pinocho' ? prevBest : `${prevBest.toFixed(1)} s`) : '—'}${b ? ` · Hoy: ${kind === 'pinocho' ? b : `${b.toFixed(1)} s`}` : ''}`;
  }

  function buttons() {
    const btn = (id, text, cls = '') => `<button type="button" class="btn ${cls}" data-act="${id}">${text}</button>`;
    if (state === 'idle') actionsEl.innerHTML = btn('start', useMic ? 'Empezar intento' : 'Empezar intento (ya)');
    else if (state === 'waiting') actionsEl.innerHTML = btn('go', 'Ya empecé', 'ghost') + btn('cancel', 'Cancelar', 'ghost');
    else if (state === 'timing') actionsEl.innerHTML = btn('stop', 'Ya paré', 'primary');
    else actionsEl.innerHTML = '';
    askEl.hidden = state !== 'ask';
  }

  function setState(next) {
    state = next;
    elapsed = next === 'timing' ? elapsed : 0;
    above = below = 0;
    statusEl.textContent = {
      idle: kind === 'pinocho' ? 'Respira y di: "En el bosque de Pinocho todos cuentan hasta ocho: pin uno, pin dos…"' : p.sound === 'soplo' ? 'Aliento completo y suelta el aire lo más suave y largo que puedas.' : 'Inhala y sostén un "sss" el mayor tiempo posible.',
      waiting: useMic ? 'Hazlo cuando quieras: el cronómetro arranca cuando te oiga…' : 'Empieza y pulsa "Ya empecé".',
      timing: useMic ? 'Midiendo… se detiene cuando haya silencio.' : 'Midiendo… pulsa "Ya paré" al terminar.',
      ask: 'Listo. Cuéntame cómo te fue.',
    }[next];
    buttons();
  }

  function endAttempt(secs) {
    if (kind === 'pinocho') {
      pendingSecs = secs;
      count = Math.max(0, Math.round(secs / 1.1));
      outEl.textContent = count;
      setState('ask');
    } else {
      attempts.push(Math.round(secs * 10) / 10);
      renderBest();
      setState('idle');
      timeEl.textContent = fmt(secs);
    }
  }

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'start') setState(useMic ? 'waiting' : 'timing');
    else if (b.dataset.act === 'go') setState('timing');
    else if (b.dataset.act === 'cancel') setState('idle');
    else if (b.dataset.act === 'stop') endAttempt(elapsed);
    else if (b.dataset.d) {
      count = Math.max(0, count + Number(b.dataset.d));
      outEl.textContent = count;
    } else if (b.classList.contains('ct-save')) {
      attempts.push(count);
      renderBest();
      setState('idle');
    }
  });

  const loop = createLoop((dt) => {
    const s = useMic ? env.audio.sample() : null;
    if (state === 'waiting' && s) {
      above = s.level > START_LEVEL ? above + dt : 0;
      if (above >= 0.15) {
        elapsed = above;
        setState('timing');
        elapsed = above;
      }
    } else if (state === 'timing') {
      elapsed += dt;
      if (s) {
        below = s.level < STOP_LEVEL ? below + dt : 0;
        if (below >= STOP_AFTER && elapsed > 1.5) endAttempt(Math.max(0, elapsed - STOP_AFTER));
      }
    }
    if (state === 'waiting') timeEl.textContent = '0:00.0';
    if (state === 'timing') timeEl.textContent = fmt(elapsed);
  });

  setState('idle');
  renderBest();

  function persist() {
    if (saved) return;
    if (state === 'timing') endAttempt(elapsed);
    if (state === 'ask') {
      attempts.push(count);
      state = 'idle';
    }
    const b = best();
    if (b > 0) {
      env.storage.addRecord(recKey, b);
      env.onValue?.(b);
    }
    saved = true;
  }

  return {
    start: () => loop.start(),
    pause: () => loop.stop(),
    resume: () => loop.start(),
    finish: persist,
    destroy() {
      loop.stop();
      host.innerHTML = '';
    },
    value: best,
    score() {
      const b = best();
      if (!b) return null;
      return prevBest > 0 ? Math.min(1, b / prevBest) : 1;
    },
  };
}
