// Calibración del micrófono (silencio / soplo suave / soplo fuerte) y descubrimiento del rango vocal.

import * as audio from '../core/audio.js';
import * as storage from '../core/storage.js';
import { buildCalibration, percentile } from '../core/level.js';
import { midiName, pcName } from '../core/pitch.js';
import { createLoop } from '../core/loop.js';
import { go } from '../nav.js';
import { toast } from '../ui.js';

const backTo = (query) => (query.get('from') === 'challenge' ? '#/challenge' : '#/settings');

export function renderCalibrate(root, _p, query) {
  const back = backTo(query);
  const STEPS = [
    { key: 'silence', title: 'Silencio', text: 'Quédate quieto y en silencio unos segundos.', pct: 0.9 },
    { key: 'soft', title: 'Soplo suave', text: 'Aliento profundo y sopla lo más suave que puedas, como empañando un vidrio, a unos 10 cm del micrófono.', pct: 0.7 },
    { key: 'strong', title: 'Soplo fuerte', text: 'Aliento profundo y sopla con toda tu fuerza hacia el micrófono, sin tocarlo.', pct: 0.9 },
  ];
  const got = {};
  let idx = 0;
  let measuring = false;
  let samples = [];
  let t = 0;
  const DUR = 3;
  let loop = null;

  root.innerHTML = `
    <div class="page-head"><a class="back" href="${back}" aria-label="Volver">←</a><h1>Calibrar micrófono</h1></div>
    <div class="card stack">
      <p class="muted">Así la app entiende qué es "suave" y qué es "fuerte" para tu micrófono y tu soplo. Son tres mediciones de 3 segundos.</p>
      <div class="row between"><b class="cal-title"></b><span class="chip cal-n"></span></div>
      <p class="cal-text"></p>
      <div class="meter" aria-hidden="true"><i></i></div>
      <div class="center big-note cal-count">·</div>
      <button class="btn primary block" id="measure">Medir</button>
      <p class="hint muted cal-result"></p>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const meterI = $('.meter i');
  const btn = $('#measure');
  const countEl = $('.cal-count');

  function paintStep() {
    const s = STEPS[idx];
    $('.cal-title').textContent = s.title;
    $('.cal-n').textContent = `${idx + 1} de ${STEPS.length}`;
    $('.cal-text').textContent = s.text;
    countEl.textContent = '·';
    btn.textContent = 'Medir';
    btn.disabled = false;
  }

  function finish() {
    const cal = buildCalibration(got);
    const spread = cal.strongDb - cal.softDb;
    storage.updateSettings({ cal });
    audio.setCalibration(cal);
    $('.cal-result').textContent = spread < 6 ? 'Casi no hay diferencia entre tu soplo suave y fuerte. Acerca un poco el micrófono y repite si puedes.' : 'Calibración guardada. ¡Listo!';
    toast('Calibración guardada');
    btn.textContent = 'Terminar';
    btn.disabled = false;
    btn.onclick = () => go(back);
    idx = -1;
  }

  async function measure() {
    if (measuring) return;
    if (!(await audio.initMic())) {
      toast('No pude activar el micrófono. Revisa los permisos del navegador.');
      return;
    }
    measuring = true;
    btn.disabled = true;
    samples = [];
    t = 0;
    const s = STEPS[idx];
    loop = createLoop((dt) => {
      t += dt;
      const r = audio.sample();
      if (r) {
        samples.push(r.db);
        meterI.style.width = `${Math.max(0, Math.min(100, ((r.db + 80) / 70) * 100))}%`;
      }
      countEl.textContent = Math.max(0, Math.ceil(DUR - t));
      if (t >= DUR) {
        loop.stop();
        measuring = false;
        got[s.key] = percentile(samples, s.pct);
        meterI.style.width = '0%';
        idx++;
        if (idx < STEPS.length) paintStep();
        else finish();
      }
    });
    loop.start();
  }

  btn.addEventListener('click', () => {
    if (idx >= 0 && !btn.onclick) measure();
  });
  paintStep();
  return () => loop?.stop();
}

export function renderRange(root) {
  const STEPS = [
    { key: 'low', title: 'Tu nota más grave cómoda', text: 'Canta una "a" sostenida en la nota más grave que te salga cómoda, sin forzar, y mantenla.' },
    { key: 'high', title: 'Tu nota más aguda cómoda', text: 'Ahora una "a" en la nota más aguda que te salga cómoda, sin forzar ni gritar, y mantenla.' },
  ];
  const got = {};
  let idx = 0;
  let measuring = false;
  let midis = [];
  let t = 0;
  const DUR = 3;
  let loop = null;
  const cur = storage.get().settings.range;

  root.innerHTML = `
    <div class="page-head"><a class="back" href="#/settings" aria-label="Volver a ajustes">←</a><h1>Descubre tu rango</h1></div>
    <div class="card stack">
      <p class="muted">Los ejercicios de notas se acomodan a tu rango (con varios tonos, no solo Do mayor). Son dos mediciones de 3 segundos.</p>
      ${cur ? `<div class="notice info">Rango actual: <b>${midiName(cur.low)}</b> a <b>${midiName(cur.high)}</b></div>` : ''}
      <div class="row between"><b class="r-title"></b><span class="chip r-n"></span></div>
      <p class="r-text"></p>
      <div class="big-note r-note center">—</div>
      <button class="btn primary block" id="measure">Medir</button>
      <p class="hint muted r-result"></p>
    </div>`;
  const $ = (s) => root.querySelector(s);
  const btn = $('#measure');
  const noteEl = $('.r-note');

  function paintStep() {
    const s = STEPS[idx];
    $('.r-title').textContent = s.title;
    $('.r-n').textContent = `${idx + 1} de ${STEPS.length}`;
    $('.r-text').textContent = s.text;
    noteEl.textContent = '—';
    btn.textContent = 'Medir';
    btn.disabled = false;
  }

  async function measure() {
    if (measuring) return;
    if (!(await audio.initMic())) {
      toast('No pude activar el micrófono. Revisa los permisos del navegador.');
      return;
    }
    measuring = true;
    btn.disabled = true;
    midis = [];
    t = 0;
    audio.resetPitch();
    const s = STEPS[idx];
    loop = createLoop((dt) => {
      t += dt;
      const r = audio.sample({ pitch: true });
      if (r?.midi != null) {
        midis.push(r.midi);
        noteEl.textContent = midiName(r.midi);
      }
      if (t >= DUR) {
        loop.stop();
        measuring = false;
        if (midis.length < 8) {
          $('.r-result').textContent = 'No te oí bien. Canta más cerca del micrófono y vuelve a medir.';
          btn.disabled = false;
          return;
        }
        $('.r-result').textContent = '';
        const sorted = [...midis].sort((a, b) => a - b);
        got[s.key] = Math.round(sorted[sorted.length >> 1]);
        idx++;
        if (idx < STEPS.length) paintStep();
        else done();
      }
    });
    loop.start();
  }

  function done() {
    const low = Math.min(got.low, got.high);
    const high = Math.max(got.low, got.high);
    if (high - low < 7) {
      $('.r-result').textContent = `Tu rango medido (${midiName(low)} a ${midiName(high)}) es muy corto. Vuelve a intentarlo separando más la nota grave de la aguda.`;
      idx = 0;
      paintStep();
      return;
    }
    storage.updateSettings({ range: { low, high } });
    noteEl.textContent = `${pcName(low)} – ${pcName(high)}`;
    $('.r-title').textContent = 'Rango guardado';
    $('.r-n').textContent = '✓';
    $('.r-text').textContent = `De ${midiName(low)} a ${midiName(high)}. Los ejercicios con notas se centrarán ahí.`;
    btn.textContent = 'Terminar';
    btn.disabled = false;
    btn.onclick = () => go('#/settings');
    toast('Rango guardado');
  }

  btn.addEventListener('click', () => {
    if (!btn.onclick) measure();
  });
  paintStep();
  return () => loop?.stop();
}
