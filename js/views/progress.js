import * as storage from '../core/storage.js';
import * as challenge from '../challengeState.js';
import { CATEGORIES, CATEGORY_ORDER } from '../data/categories.js';
import { byCategory, EXERCISES } from '../data/exercises.js';
import { TOTAL_DAYS } from '../data/challenge30.js';
import { fmtMinutes } from '../core/timer.js';
import { midiName } from '../core/pitch.js';
import { starsText } from '../ui.js';

function spark(values) {
  if (values.length < 2) return '';
  const w = 300;
  const h = 60;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = Math.max(1e-6, max - min);
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * (w - 10) + 5},${h - 8 - ((v - min) / span) * (h - 16)}`).join(' ');
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--accent-2)" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

export function renderProgress(root) {
  const s = storage.get();
  const totalSecs = Object.values(s.days).reduce((t, d) => t + d.seconds, 0);
  const known = new Set(EXERCISES.map((e) => e.id)); // solo los ejercicios de las categorías (no los del desafío)
  const starred = Object.entries(s.progress).filter(([id, p]) => known.has(id) && p.stars > 0).length;
  const week = storage.lastDays(7);
  const maxW = Math.max(60, ...week.map((d) => d.seconds));
  const rec = (k, unit) => {
    const list = s.records[k] || [];
    if (!list.length) return '<p class="muted">Aún sin registros.</p>';
    const best = Math.max(...list.map((r) => r.value));
    const last = list[list.length - 1].value;
    return `<div class="row between"><span>Récord <b>${best}${unit}</b></span><span class="muted">Último ${last}${unit}</span></div>${spark(list.slice(-20).map((r) => r.value))}`;
  };

  const cats = CATEGORY_ORDER.map((id) => {
    const list = byCategory(id);
    const stars = list.reduce((t, e) => t + (s.progress[e.id]?.stars || 0), 0);
    const filled = list.length ? stars / (list.length * 3) : 0;
    return `<div class="line"><span>${CATEGORIES[id].emoji} ${CATEGORIES[id].title}</span><div class="progress-bar" title="${Math.round(filled * 100)}%"><i style="width:${filled * 100}%"></i></div></div>`;
  }).join('');

  root.innerHTML = `
    <div class="page-head"><h1>Tu progreso</h1></div>
    <div class="stat-grid">
      <div class="stat"><b>🔥 ${storage.streak()}</b><span>días de racha</span></div>
      <div class="stat"><b>${fmtMinutes(totalSecs)}</b><span>de práctica total</span></div>
      <div class="stat"><b>⭐ ${s.xp}</b><span>puntos XP</span></div>
      <div class="stat"><b>${starred}<small>/${EXERCISES.length}</small></b><span>ejercicios con estrella</span></div>
    </div>
    <h2 class="section-title">Esta semana</h2>
    <div class="card"><div class="week">${week.map((d) => `<div class="col"><div class="bar" style="height:${Math.max(4, (d.seconds / maxW) * 100)}%" title="${fmtMinutes(d.seconds)}"></div><span>${d.label}</span></div>`).join('')}</div></div>
    <h2 class="section-title">Desafío de 30 días</h2>
    <a class="card row between" href="#/challenge" style="text-decoration:none"><span>${challenge.doneCount()} de ${TOTAL_DAYS} días completados</span><span aria-hidden="true">→</span></a>
    <h2 class="section-title">Tus récords</h2>
    <div class="card stack">
      <div><h3>Pinocho <small>(número alcanzado)</small></h3>${rec('pinocho', '')}</div>
      <div><h3>"Sss" sostenido</h3>${rec('mpt_sss', ' s')}</div>
      <div><h3>Soplo suave</h3>${rec('mpt_soplo', ' s')}</div>
    </div>
    <h2 class="section-title">Tu rango vocal</h2>
    <div class="card">${s.settings.range ? `De <b>${midiName(s.settings.range.low)}</b> a <b>${midiName(s.settings.range.high)}</b> · <a href="#/rango">volver a medir</a>` : 'Aún no lo mediste. <a href="#/rango">Descubre tu rango</a> para que las notas se ajusten a tu voz.'}</div>
    <h2 class="section-title">Por categoría</h2>
    <div class="card cat-progress">${cats}</div>`;
}
