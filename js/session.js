// Ejecutor de tandas: corre los ejercicios uno tras otro con "prepárate", timer, pausa, saltar/volver, ±15 s y estrellas.

import * as audio from './core/audio.js';
import * as storage from './core/storage.js';
import { Countdown, fmtTime, fmtMinutes } from './core/timer.js';
import { createLoop } from './core/loop.js';
import { CATEGORIES } from './data/categories.js';
import { effectiveDur } from './data/exercises.js';
import { toast } from './ui.js';

const NEEDS_MIC = new Set(['soplo', 'aire', 'nota', 'camino', 'volumen', 'ritmo', 'contador', 'kodaly', 'graba']);
const LOADERS = {
  guia: () => import('./games/guia.js'),
  soplo: () => import('./games/soplo.js'),
  aire: () => import('./games/aire.js'),
  nota: () => import('./games/nota.js'),
  camino: () => import('./games/camino.js'),
  volumen: () => import('./games/volumen.js'),
  ritmo: () => import('./games/ritmo.js'),
  contador: () => import('./games/contador.js'),
  kodaly: () => import('./games/kodaly.js'),
  graba: () => import('./games/graba.js'),
};
const READY_SECS = 4;
const RESULT_SECS = 2.6;
const RING = 2 * Math.PI * 19.5;

export const starsFor = (ex, score) => (score == null ? (ex.mode === 'guia' ? 3 : 2) : score >= 0.85 ? 3 : score >= 0.6 ? 2 : 1);
const starText = (n) => '★'.repeat(n) + '☆'.repeat(3 - n);
const praise = (n) => (n === 3 ? '¡Excelente!' : n === 2 ? 'Bien hecho' : 'Sigue practicando');

/**
 * steps: ejercicios a correr. meta: { title, catLabel?, onComplete?(summary) }.
 * Devuelve una promesa que se resuelve al salir ({ summary|null }).
 */
export function runSession(root, opts) {
  const handle = {
    aborted: false,
    stop: null,
    /** Cierra la tanda desde fuera (por ejemplo, al navegar con el botón "atrás"). */
    abort() {
      handle.aborted = true;
      handle.stop?.();
    },
  };
  handle.done = start(root, opts, handle);
  return handle;
}

async function start(root, { steps, meta = {} }, handle) {
  const settings = storage.get().settings;
  let micOK = false;
  if (settings.micOn && steps.some((s) => NEEDS_MIC.has(s.mode))) {
    micOK = await audio.initMic();
    if (!micOK) toast('No pude activar el micrófono. Sigues en modo guiado, sin medición.');
  }
  if (handle.aborted) return { summary: null };

  return new Promise((resolve) => {
    document.body.classList.add('in-session');
    root.innerHTML = `<section class="session">
      <header class="s-top">
        <button class="icon-btn" data-a="exit" aria-label="Salir de la tanda">✕</button>
        <div class="s-segs" aria-hidden="true"></div>
        <div class="s-total" title="Tiempo restante de la tanda"></div>
      </header>
      <div class="s-title"><span class="s-cat"></span><h2 class="s-name"></h2></div>
      <div class="s-stage"><div class="s-game"></div><div class="s-overlay" hidden></div></div>
      <div class="s-info">
        <div class="s-ring"><svg viewBox="0 0 44 44" aria-hidden="true"><circle class="bg" cx="22" cy="22" r="19.5"/><circle class="fg" cx="22" cy="22" r="19.5"/></svg><span class="s-secs">0</span></div>
        <p class="s-text"></p>
      </div>
      <footer class="s-controls">
        <button class="ctl" data-a="minus" aria-label="Quitar 15 segundos">−15</button>
        <button class="ctl" data-a="back" aria-label="Ejercicio anterior">⏮</button>
        <button class="ctl main" data-a="pause" aria-label="Pausar">⏸</button>
        <button class="ctl" data-a="skip" aria-label="Siguiente ejercicio">⏭</button>
        <button class="ctl" data-a="plus" aria-label="Añadir 15 segundos">+15</button>
      </footer>
    </section>`;
    const $ = (s) => root.querySelector(s);
    const segsEl = $('.s-segs');
    const totalEl = $('.s-total');
    const catEl = $('.s-cat');
    const nameEl = $('.s-name');
    const gameHost = $('.s-game');
    const overlay = $('.s-overlay');
    const ringFg = $('.s-ring .fg');
    const secsEl = $('.s-secs');
    const textEl = $('.s-text');
    const pauseBtn = $('[data-a="pause"]');
    ringFg.style.strokeDasharray = RING;

    segsEl.innerHTML = steps.map(() => '<i><b></b></i>').join('');
    const segFills = [...segsEl.querySelectorAll('b')];

    const results = [];
    const startedAt = performance.now();
    let i = 0;
    let phase = 'ready'; // ready | run | result | summary
    let paused = false;
    let cd = null;
    let ex = null;
    let game = null;
    let envRef = null;
    let complete = false;
    let readyLeft = READY_SECS;
    let resultLeft = 0;
    let runSeconds = 0;
    let alive = true;
    let loadToken = 0;
    let wakeLock = null;
    let offClick = () => {};

    const durOf = (e) => effectiveDur(e, settings.speed);
    const remainingTotal = () => {
      let t = phase === 'run' || phase === 'ready' ? (cd ? cd.left : durOf(ex)) : 0;
      for (let k = i + 1; k < steps.length; k++) t += durOf(steps[k]);
      return t;
    };

    async function acquireWake() {
      try {
        wakeLock = await navigator.wakeLock?.request('screen');
      } catch {
        wakeLock = null;
      }
    }
    const onVisible = () => document.visibilityState === 'visible' && alive && acquireWake();
    document.addEventListener('visibilitychange', onVisible);
    acquireWake();

    function paintSegs() {
      segFills.forEach((b, k) => {
        const seg = b.parentElement;
        seg.className = k < i ? (results[k]?.skipped ? 'skipped' : 'done') : k === i ? 'now' : '';
        b.style.width = k < i ? '100%' : k === i && cd ? `${Math.round(cd.progress * 100)}%` : '0%';
      });
    }

    async function loadExercise(index) {
      const token = ++loadToken;
      i = index;
      ex = steps[i];
      phase = 'ready';
      paused = false;
      complete = false;
      runSeconds = 0;
      readyLeft = READY_SECS;
      const total = ex.fixed ? ex.dur + 1.5 : durOf(ex);
      cd = new Countdown(total);
      catEl.textContent = meta.catLabel || CATEGORIES[ex.cat]?.title || '';
      nameEl.innerHTML = `${ex.title}${ex.extra ? ' <span class="chip">Extra</span>' : ''}`;
      textEl.textContent = ex.text;
      pauseBtn.textContent = '⏸';
      $('[data-a="minus"]').disabled = $('[data-a="plus"]').disabled = !!ex.fixed;
      overlay.hidden = false;
      overlay.className = 's-overlay ready';
      overlay.innerHTML = `<div class="ov-num">${READY_SECS}</div><div class="ov-label">Prepárate</div><button class="btn ghost" data-a="go">Empezar ya</button>`;
      gameHost.innerHTML = '';
      game = null;
      paintSegs();
      totalEl.textContent = fmtTime(remainingTotal());
      secsEl.textContent = Math.round(total);
      ringFg.style.strokeDashoffset = 0;

      const mod = await LOADERS[ex.mode]();
      if (token !== loadToken || !alive) return;
      const mic = micOK && NEEDS_MIC.has(ex.mode);
      envRef = {
        audio,
        storage,
        mic,
        root: storage.keyRoot(settings),
        range: settings.range,
        progress: () => (cd ? cd.progress : 0),
        complete: () => (complete = true),
        onValue: meta.onValue,
      };
      game = mod.mount(gameHost, ex, envRef);
    }

    function begin() {
      if (phase !== 'ready' || !game) return;
      phase = 'run';
      overlay.hidden = true;
      cd.start(performance.now());
      game.start();
      audio.beep(1040, 0.12);
    }

    function showResult(stars, score, skipped) {
      phase = 'result';
      resultLeft = RESULT_SECS;
      overlay.hidden = false;
      overlay.className = 's-overlay result';
      overlay.innerHTML = skipped
        ? `<div class="ov-label">Ejercicio saltado</div>`
        : `<div class="ov-stars s${stars}">${starText(stars)}</div><div class="ov-label">${praise(stars)}</div>${score != null ? `<div class="ov-sub">${Math.round(score * 100)}% en objetivo</div>` : ''}${i < steps.length - 1 ? '<button class="btn ghost" data-a="next">Siguiente</button>' : ''}`;
      if (!skipped) audio.chime();
    }

    function finishExercise(skipped = false) {
      if (!game || phase === 'result') return;
      game.finish?.();
      const score = skipped ? null : game.score();
      const stars = skipped ? 0 : starsFor(ex, score);
      game.destroy();
      game = null;
      results[i] = { ex, stars, score, skipped, seconds: runSeconds };
      if (!skipped) {
        storage.recordExercise(ex.id, stars, score);
        storage.addSeconds(runSeconds, stars * 10);
      } else if (runSeconds > 0) storage.addSeconds(runSeconds, 0);
      paintSegs();
      showResult(stars, score, skipped);
    }

    function next() {
      if (i + 1 < steps.length) loadExercise(i + 1);
      else showSummary();
    }

    function showSummary() {
      phase = 'summary';
      const done = results.filter((r) => r && !r.skipped);
      const stars = done.reduce((s, r) => s + r.stars, 0);
      const seconds = Math.round((performance.now() - startedAt) / 1000);
      const completed = done.length >= Math.ceil(steps.length * 0.7);
      if (done.length) storage.addSession();
      const summary = { steps: steps.length, done: done.length, stars, maxStars: steps.length * 3, seconds, completed, results };
      if (completed) meta.onComplete?.(summary);
      const streak = storage.streak();
      const xp = done.reduce((s, r) => s + r.stars * 10, 0);
      root.querySelector('.session').innerHTML = `<div class="summary">
        <div class="sum-emoji">${completed ? '🎉' : '👍'}</div>
        <h2>${completed ? '¡Tanda completada!' : 'Buen intento'}</h2>
        <p class="sum-title">${meta.title || ''}</p>
        <div class="sum-stats">
          <div><b>${stars}<small>/${steps.length * 3}</small></b><span>estrellas ★</span></div>
          <div><b>${fmtMinutes(seconds)}</b><span>de práctica</span></div>
          <div><b>+${xp}</b><span>XP</span></div>
          <div><b>${streak}</b><span>${streak === 1 ? 'día' : 'días'} de racha 🔥</span></div>
        </div>
        <ul class="sum-list">${steps.map((s, k) => `<li><span>${s.title}</span><em class="${results[k]?.skipped || !results[k] ? 'sk' : ''}">${results[k] && !results[k].skipped ? starText(results[k].stars) : 'saltado'}</em></li>`).join('')}</ul>
        <div class="sum-actions">${meta.onComplete && completed ? '<button class="btn primary" data-a="finish">Ver mi progreso</button>' : '<button class="btn primary" data-a="finish">Volver</button>'}<button class="btn ghost" data-a="again">Repetir la tanda</button></div>
      </div>`;
      root.querySelector('.s-controls')?.remove();
      audio.chime();
    }

    function teardown(payload) {
      if (!alive) return;
      alive = false;
      loop.stop();
      loadToken++;
      game?.destroy();
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('keydown', onKey);
      offClick();
      try {
        wakeLock?.release();
      } catch {
        /* sin wake lock */
      }
      document.body.classList.remove('in-session');
      resolve(payload);
    }

    function togglePause() {
      if (phase !== 'run' && phase !== 'ready') return;
      paused = !paused;
      pauseBtn.textContent = paused ? '▶' : '⏸';
      pauseBtn.setAttribute('aria-label', paused ? 'Reanudar' : 'Pausar');
      if (phase === 'run') {
        if (paused) {
          cd.pause();
          game?.pause();
          overlay.hidden = false;
          overlay.className = 's-overlay paused';
          overlay.innerHTML = '<div class="ov-label">En pausa</div><button class="btn primary" data-a="pause">Reanudar</button>';
        } else {
          cd.resume(performance.now());
          game?.resume();
          overlay.hidden = true;
        }
      }
    }

    const loop = createLoop((dt, now) => {
      if (!alive) return;
      if (phase === 'ready') {
        if (paused || !game) return;
        readyLeft -= dt;
        const n = Math.max(0, Math.ceil(readyLeft));
        const num = overlay.querySelector('.ov-num');
        if (num && num.textContent !== String(n)) {
          num.textContent = n;
          if (n > 0) audio.beep(660, 0.06);
        }
        if (readyLeft <= 0) begin();
      } else if (phase === 'run') {
        if (paused) return;
        const step = cd.update(now);
        runSeconds += step;
        secsEl.textContent = Math.ceil(cd.left);
        ringFg.style.strokeDashoffset = RING * cd.progress;
        totalEl.textContent = fmtTime(remainingTotal());
        paintSegs();
        if (cd.done || complete) finishExercise(false);
      } else if (phase === 'result') {
        resultLeft -= dt;
        if (resultLeft <= 0) next();
      }
    });

    const onKey = (e) => {
      if (e.key === 'p' || e.key === 'P') togglePause();
    };
    document.addEventListener('keydown', onKey);

    const onClick = (e) => {
      const b = e.target.closest('[data-a]');
      if (!b || !alive) return;
      const a = b.dataset.a;
      if (a === 'exit') {
        if (phase === 'summary' || window.confirm('¿Salir de la tanda? Lo que ya terminaste queda guardado.')) teardown({ summary: null });
      } else if (a === 'finish') {
        teardown({ summary: 'done' });
      } else if (a === 'again') {
        teardown({ summary: 'again' });
      } else if (a === 'go') begin();
      else if (a === 'pause') togglePause();
      else if (a === 'skip') {
        if (phase === 'result') next();
        else if ((phase === 'run' || phase === 'ready') && game) finishExercise(true);
      } else if (a === 'next') next();
      else if (a === 'back') {
        if (phase === 'result') return;
        if (i > 0) {
          game?.destroy();
          game = null;
          loadExercise(i - 1);
        } else if (phase === 'run') {
          game?.destroy();
          game = null;
          loadExercise(0);
        }
      } else if (a === 'plus' && phase === 'run' && !ex.fixed) cd.add(15);
      else if (a === 'minus' && phase === 'run' && !ex.fixed) cd.add(-15);
    };
    root.addEventListener('click', onClick);
    offClick = () => root.removeEventListener('click', onClick);
    handle.stop = () => teardown({ summary: null });

    loadExercise(0).then(() => alive && loop.start());
  });
}
