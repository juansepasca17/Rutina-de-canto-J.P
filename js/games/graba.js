// Motor "graba": recomendaciones para afinar un tema + grabarte y compararte con una referencia.

import { createLoop } from '../core/loop.js';

const REC_SECS = 20;

export function mount(host, ex, env) {
  const p = ex.params;
  const tips = p.tips || [];
  const stream = env.audio.getStream();
  const canRecord = env.mic && !!stream && typeof MediaRecorder !== 'undefined';

  host.innerHTML = `<div class="g-graba">
    <ol class="gb-tips">${tips.map((t) => `<li>${t}</li>`).join('')}</ol>
    <div class="gb-steps">
      <button type="button" class="btn ghost" data-act="ref">1 · Escuchar referencia</button>
      <button type="button" class="btn" data-act="rec" ${canRecord ? '' : 'disabled'}>2 · Grabarme ${REC_SECS} s</button>
      <button type="button" class="btn ghost" data-act="play" disabled>3 · Escuchar mi grabación</button>
    </div>
    <div class="gb-bar" hidden><i></i></div>
    <p class="gb-status">${canRecord ? 'Escucha la referencia, grábate cantando encima y compárate.' : env.mic ? 'Tu navegador no permite grabar aquí: usa las recomendaciones y cántalo por tu cuenta.' : 'Sin micrófono: usa las recomendaciones y cántalo por tu cuenta.'}</p>
    <div class="gb-rate"><span>¿Cómo te sonó?</span>
      <button type="button" data-rate="0.4" aria-label="Regular">😕</button>
      <button type="button" data-rate="0.75" aria-label="Bien">🙂</button>
      <button type="button" data-rate="1" aria-label="Excelente">🤩</button>
    </div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const bar = $('.gb-bar');
  const barI = $('.gb-bar i');
  const status = $('.gb-status');
  const recBtn = $('[data-act="rec"]');
  const playBtn = $('[data-act="play"]');

  let rating = null;
  let recorder = null;
  let chunks = [];
  let url = null;
  let audioEl = null;
  let recT = 0;
  let recording = false;
  let refTimers = [];

  const stopRef = () => {
    refTimers.forEach(clearTimeout);
    refTimers = [];
  };

  function playRef() {
    stopRef();
    status.textContent = '🔊 Referencia…';
    p.ref.forEach((off, i) => {
      refTimers.push(setTimeout(() => env.audio.playMidi(env.root + off, 0.55), i * 600));
    });
    refTimers.push(setTimeout(() => (status.textContent = 'Ahora grábate cantando la melodía.'), p.ref.length * 600));
  }

  function startRec() {
    chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      if (url) URL.revokeObjectURL(url);
      url = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
      audioEl = new Audio(url);
      playBtn.disabled = false;
      status.textContent = 'Listo. Escúchate y compara con la referencia.';
    };
    recorder.start();
    recording = true;
    recT = 0;
    bar.hidden = false;
    recBtn.textContent = '■ Detener';
    status.textContent = '🔴 Grabando…';
  }

  function stopRec() {
    if (recorder && recorder.state !== 'inactive') recorder.stop();
    recording = false;
    bar.hidden = true;
    recBtn.textContent = `2 · Grabarme ${REC_SECS} s`;
  }

  host.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.act === 'ref') playRef();
    else if (b.dataset.act === 'rec') (recording ? stopRec : startRec)();
    else if (b.dataset.act === 'play' && audioEl) {
      audioEl.currentTime = 0;
      audioEl.play();
    } else if (b.dataset.rate) {
      rating = Number(b.dataset.rate);
      host.querySelectorAll('[data-rate]').forEach((x) => x.classList.toggle('on', x === b));
      status.textContent = 'Anotado. ¡Sigue así!';
    }
  });

  const loop = createLoop((dt) => {
    if (recording) {
      recT += dt;
      barI.style.width = `${Math.min(100, (recT / REC_SECS) * 100)}%`;
      if (recT >= REC_SECS) stopRec();
    }
  });

  return {
    start: () => loop.start(),
    pause() {
      loop.stop();
      stopRef();
      audioEl?.pause();
    },
    resume: () => loop.start(),
    destroy() {
      loop.stop();
      stopRef();
      if (recording) stopRec();
      audioEl?.pause();
      if (url) URL.revokeObjectURL(url);
      host.innerHTML = '';
    },
    score: () => rating,
  };
}
