// Arranque y enrutador (hash) de Vocalia.

import * as storage from './core/storage.js';
import * as audio from './core/audio.js';
import { runSession } from './session.js';
import { go, startRun, takeRun } from './nav.js';
import { renderHome } from './views/home.js';
import { renderCategory } from './views/category.js';
import { renderChallenge, renderDay, renderTest } from './views/challenge.js';
import { renderCalibrate, renderRange } from './views/mic.js';
import { renderProgress } from './views/progress.js';
import { renderSettings } from './views/settings.js';

const view = document.getElementById('view');
let cleanup = null;

function renderRun(root) {
  const run = takeRun();
  if (!run) return go('#/');
  let aborted = false;
  let current = null;
  const launch = () => {
    current = runSession(root, run);
    current.done.then((res) => {
      if (aborted) return;
      if (res.summary === 'again') return launch();
      const dest = run.onDone?.(res);
      go(dest || run.back || '#/');
    });
  };
  launch();
  return () => {
    aborted = true;
    current?.abort();
  };
}

const ROUTES = [
  [/^\/$/, renderHome, 'home'],
  [/^\/cat\/([\w-]+)$/, renderCategory, 'home'],
  [/^\/challenge$/, renderChallenge, 'challenge'],
  [/^\/challenge\/day\/(\d+)$/, renderDay, 'challenge'],
  [/^\/challenge\/prueba\/(inicial|final)$/, renderTest, 'challenge'],
  [/^\/calibrar$/, renderCalibrate, 'settings'],
  [/^\/rango$/, renderRange, 'settings'],
  [/^\/progress$/, renderProgress, 'progress'],
  [/^\/settings$/, renderSettings, 'settings'],
  [/^\/run$/, renderRun, 'home'],
];

function route() {
  const [path, qs = ''] = (location.hash.slice(1) || '/').split('?');
  const query = new URLSearchParams(qs);
  if (typeof cleanup === 'function') {
    try {
      cleanup();
    } catch (err) {
      console.warn(err);
    }
  }
  cleanup = null;
  for (const [re, render, tab] of ROUTES) {
    const m = path.match(re);
    if (!m) continue;
    view.replaceChildren();
    const el = document.createElement('div');
    el.className = 'view';
    view.appendChild(el);
    document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
    window.scrollTo(0, 0);
    try {
      cleanup = render(el, m.slice(1), query);
    } catch (err) {
      console.error(err);
      el.innerHTML = '<div class="card"><p>Algo salió mal al abrir esta pantalla. <a href="#/">Volver al inicio</a></p></div>';
    }
    return;
  }
  go('#/');
}

function boot() {
  // Solo para pruebas automáticas con la ventana oculta (?debug=1&timerraf=1): rAF se pausa en pestañas ocultas.
  if (audio.isDebug() && new URLSearchParams(location.search).has('timerraf')) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  const { settings } = storage.load();
  audio.setSound(settings.sound);
  audio.setCalibration(settings.cal);
  window.addEventListener('hashchange', route);
  route();
  if (audio.isDebug()) window.vocalia = { audio, storage, go, startRun };
  // En la app de escritorio (host virtual vocalia.example) los archivos ya están en disco: no hace falta service worker.
  else if ('serviceWorker' in navigator && location.protocol.startsWith('http') && location.hostname !== 'vocalia.example') navigator.serviceWorker.register('sw.js').catch(() => {});
}

boot();
