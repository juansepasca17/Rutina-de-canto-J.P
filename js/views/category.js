import { CATEGORIES, CATEGORY_ORDER } from '../data/categories.js';
import { byCategory, byId, effectiveDur } from '../data/exercises.js';
import { stepsForCategory, stepsForFull, totalSeconds } from '../data/routines.js';
import * as storage from '../core/storage.js';
import { fmtMinutes, fmtTime } from '../core/timer.js';
import { startRun } from '../nav.js';
import { MODE_LABEL, starsHtml, esc } from '../ui.js';

export function renderCategory(root, [id]) {
  const isFull = id === 'full';
  if (!isFull && !CATEGORIES[id]) {
    root.innerHTML = '<p>No encontré esa categoría. <a href="#/">Volver</a></p>';
    return;
  }
  const s = storage.get();
  const { settings } = s;

  function paint() {
    const steps = isFull ? stepsForFull(settings) : stepsForCategory(id, settings);
    const secs = totalSeconds(steps, settings.speed);
    const c = isFull ? { title: 'Rutina completa', emoji: '🎼', hue: 250, blurb: 'Todas las categorías una tras otra, en el orden de tu Word.' } : CATEGORIES[id];
    const hasExtras = (isFull ? CATEGORY_ORDER.flatMap(byCategory) : byCategory(id)).some((e) => e.extra);

    const row = (e, n, dim) => `<li class="ex-item ${dim ? 'off' : ''}">
        <span class="ex-num">${n}</span>
        <div class="ex-body"><b>${esc(e.title)} ${e.extra ? '<span class="chip">Extra</span>' : ''}</b>
          <span class="sub">${MODE_LABEL[e.mode].icon} ${MODE_LABEL[e.mode].text} · ${fmtTime(effectiveDur(e, settings.speed))}</span></div>
        <span class="ex-stars" aria-label="${s.progress[e.id]?.stars || 0} de 3 estrellas">${starsHtml(s.progress[e.id]?.stars || 0)}</span>
        ${dim ? '' : `<button class="ex-play" data-solo="${e.id}" aria-label="Practicar solo ${esc(e.title)}">▶</button>`}
      </li>`;

    let list;
    if (isFull) {
      list = CATEGORY_ORDER.map((cid) => {
        const st = stepsForCategory(cid, settings);
        return `<h2 class="section-title">${CATEGORIES[cid].emoji} ${CATEGORIES[cid].title} · ${fmtMinutes(totalSeconds(st, settings.speed))}</h2><ul class="ex-list">${st.map((e, i) => row(e, i + 1, false)).join('')}</ul>`;
      }).join('');
    } else {
      const all = byCategory(id);
      list = `<ul class="ex-list">${all.map((e, i) => row(e, i + 1, settings.includeExtras === false && e.extra)).join('')}</ul>`;
    }

    root.innerHTML = `
      <div class="page-head"><a class="back" href="#/" aria-label="Volver al inicio">←</a><h1>${c.title}</h1></div>
      <div class="cat-hero" style="--h:${c.hue}">
        <div class="emoji" aria-hidden="true">${c.emoji}</div>
        <p>${c.blurb}</p>
        <div class="row wrap"><span class="chip">${steps.length} ejercicios</span><span class="chip">${fmtMinutes(secs)}</span></div>
      </div>
      ${hasExtras ? `<label class="switch card" style="margin-top:12px"><input type="checkbox" id="extras" ${settings.includeExtras !== false ? 'checked' : ''} /> <span>Incluir los ejercicios <b>Extra</b> en la tanda</span></label>` : ''}
      <h2 class="section-title">Ejercicios, uno tras otro</h2>
      ${list}
      <div class="sticky-cta"><button class="btn primary" id="start">▶ Empezar ${isFull ? 'la rutina completa' : 'la tanda'} · ${fmtMinutes(secs)}</button></div>`;
  }

  paint();

  root.addEventListener('click', (e) => {
    const solo = e.target.closest('[data-solo]');
    if (solo) {
      const ex = byId(solo.dataset.solo);
      startRun({ steps: [ex], meta: { title: ex.title }, back: `#/cat/${id}` });
      return;
    }
    if (e.target.closest('#start')) {
      const steps = isFull ? stepsForFull(settings) : stepsForCategory(id, settings);
      startRun({ steps, meta: { title: isFull ? 'Rutina completa' : CATEGORIES[id].title }, back: `#/cat/${id}` });
    }
  });
  root.addEventListener('change', (e) => {
    if (e.target.id === 'extras') {
      storage.updateSettings({ includeExtras: e.target.checked });
      paint();
    }
  });
}
