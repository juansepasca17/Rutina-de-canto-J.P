import { GROUPS, CATEGORIES } from '../data/categories.js';
import { stepsForCategory, stepsForFull, totalSeconds } from '../data/routines.js';
import { TOTAL_DAYS } from '../data/challenge30.js';
import * as storage from '../core/storage.js';
import * as challenge from '../challengeState.js';
import { fmtMinutes } from '../core/timer.js';
import { starsHtml } from '../ui.js';

export function renderHome(root) {
  const s = storage.get();
  const { settings } = s;
  const streak = storage.streak();
  const day = challenge.currentDay();
  const done = challenge.doneCount();
  const accepted = s.challenge.accepted;

  const heroTitle = !accepted ? 'Desafío de 30 días' : day ? `Día ${day} de ${TOTAL_DAYS}` : '¡Desafío completado!';
  const heroSub = !accepted ? 'Súper poder pulmonar · unos 5 minutos al día' : day ? 'Súper poder pulmonar · tu sesión de hoy te espera' : 'Ya tienes tu súper poder pulmonar 🏅';
  const heroCta = !accepted ? 'Conocer el desafío' : day ? `Empezar día ${day}` : 'Ver mi calendario';

  const groups = GROUPS.map((g) => {
    const cards = g.cats
      .map((id) => {
        const c = CATEGORIES[id];
        const steps = stepsForCategory(id, settings);
        const secs = totalSeconds(steps, settings.speed);
        const stars = steps.reduce((t, e) => t + (s.progress[e.id]?.stars || 0), 0);
        const pct = steps.length ? stars / (steps.length * 3) : 0;
        const filled = pct >= 0.85 ? 3 : pct >= 0.5 ? 2 : pct > 0 ? 1 : 0;
        return `<a class="cat-card" href="#/cat/${id}" style="--h:${c.hue}">
          <span class="emoji" aria-hidden="true">${c.emoji}</span>
          <h3>${c.title}</h3>
          <div class="meta"><span>${steps.length} ejercicios · ${fmtMinutes(secs)}</span><span class="stars" aria-label="${filled} de 3 estrellas">${starsHtml(filled)}</span></div>
        </a>`;
      })
      .join('');
    return `<h2 class="section-title">${g.title}</h2><div class="cats">${cards}</div>`;
  }).join('');

  const fullSecs = totalSeconds(stepsForFull(settings), settings.speed);

  root.innerHTML = `
    <div class="brand">
      <div><h1>Vocalia</h1><p>Tu rutina vocal, por categorías</p></div>
      <div class="pills"><span class="pill" title="Días seguidos practicando">🔥 ${streak}</span><span class="pill" title="Puntos de experiencia">⭐ ${s.xp}</span></div>
    </div>
    <a class="hero" href="#/challenge">
      <span class="chip">🔥 Desafío</span>
      <h2>${heroTitle}</h2>
      <p class="sub">${heroSub}</p>
      <div class="progress-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${TOTAL_DAYS}" aria-valuenow="${done}"><i style="width:${(done / TOTAL_DAYS) * 100}%"></i></div>
      <div class="row between"><small style="color:rgba(255,255,255,.8)">${done} de ${TOTAL_DAYS} días</small><span class="btn" style="min-height:40px">${heroCta} →</span></div>
    </a>
    <a class="card full-card" href="#/cat/full">
      <span class="emoji">🎼</span>
      <div class="grow"><h3>Rutina completa</h3><small>Todas las categorías, en orden · ${fmtMinutes(fullSecs)}</small></div>
      <span aria-hidden="true">→</span>
    </a>
    ${groups}
    <p class="tip-card card">🎧 Para los juegos con tu voz usa audífonos si puedes: así la nota de referencia no se cuela en el micrófono. En <b>Ajustes</b> puedes calibrar el micrófono y elegir tu tonalidad.</p>`;
}
