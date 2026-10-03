import { dayInfo, stepLabel, TOTAL_DAYS, BADGE_DAYS } from '../data/challenge30.js';
import * as challenge from '../challengeState.js';
import * as storage from '../core/storage.js';
import * as audio from '../core/audio.js';
import { fmtMinutes } from '../core/timer.js';
import { startRun, go } from '../nav.js';
import { esc, toast } from '../ui.js';

const RULES = [
  '<b>Todo por la boca.</b> Inhala y exhala por la boca durante los ejercicios. Al terminar cada uno, vuelve a respirar normal por la nariz y suelta el aire que te quede.',
  '<b>Aliento completo.</b> Llena los pulmones de abajo hacia arriba en un solo movimiento suave de un segundo: primero la cintura (el ombligo se abre), luego el pecho, luego la parte alta.',
  '<b>Labios de silbido.</b> Al soltar el aire, labios como para silbar y la punta de la lengua apoyada tras los dientes de abajo. Los labios no vibran y las mejillas no se inflan.',
  '<b>Erguido y relajado.</b> De pie o sentado derecho. Relajado al inhalar; con el diafragma firme al exhalar. Haz solo la sesión del día: el crecimiento es gradual, sin forzar.',
  '<b>Seguridad primero.</b> No lo hagas manejando ni en aire con polvo. Para si te mareas. Si tu salud es frágil, consulta a tu médico antes de empezar.',
];

export function renderChallenge(root) {
  const c = challenge.state();
  if (!c.accepted) return renderIntro(root);

  const settings = storage.get().settings;
  const today = challenge.currentDay();
  const done = challenge.doneCount();
  const since = challenge.daysSinceLast();
  const finished = today === null;
  const info = today ? dayInfo(today) : null;

  const cells = Array.from({ length: TOTAL_DAYS }, (_, i) => {
    const n = i + 1;
    const d = c.completed[n];
    const cls = d ? 'done' : n === today ? 'today' : 'locked';
    const badge = BADGE_DAYS[n] ? `<span class="badge" title="${BADGE_DAYS[n]}">${d ? '🏅' : '🎖️'}</span>` : '';
    const stars = d ? `<small>${'★'.repeat(Math.max(1, Math.round(d.stars / dayInfo(n).exercises.length)))}</small>` : '';
    const href = d || n === today ? `href="#/challenge/day/${n}"` : 'aria-disabled="true" tabindex="-1"';
    return `<a class="day ${cls}" ${href} aria-label="Día ${n}${d ? ', completado' : n === today ? ', hoy' : ', bloqueado'}">${d ? '✓' : n}${stars}${badge}</a>`;
  }).join('');

  const calDone = !!settings.cal;
  const t0 = !!c.tests.inicial;
  const notice =
    since != null && since >= 2 && !finished
      ? `<div class="notice">Llevas ${since} días sin sesión. <b>No pasa nada: retomas justo donde quedaste</b>, en el día ${today}, sin reiniciar.</div>`
      : '';

  root.innerHTML = `
    <div class="page-head"><a class="back" href="#/" aria-label="Volver al inicio">←</a><h1>Desafío de 30 días</h1></div>
    <div class="card stack">
      <div class="row between"><b>${finished ? '¡Completaste el desafío! 🏅' : `Día ${today} de ${TOTAL_DAYS}`}</b><span class="chip">${done}/${TOTAL_DAYS}</span></div>
      <div class="progress-bar"><i style="width:${(done / TOTAL_DAYS) * 100}%"></i></div>
      ${notice}
    </div>
    ${
      finished
        ? `<div class="card stack" style="margin-top:12px"><p>Terminaste los 30 días. Puedes repetir cualquier sesión, o ver tu comparación final.</p><a class="btn primary" href="#/challenge/prueba/final">Ver prueba final</a></div>`
        : `<div class="card stack" style="margin-top:12px">
            <div class="row between wrap"><div><span class="chip">${info.phase}</span><h2 style="margin-top:6px">Hoy · Día ${today}</h2></div><span class="chip">${fmtMinutes(info.seconds)} · ${info.exercises.length} ejercicios</span></div>
            <a class="btn primary block" href="#/challenge/day/${today}">▶ Empezar el día ${today}</a>
          </div>`
    }
    <h2 class="section-title">Preparación (una sola vez)</h2>
    <ul class="steps-list">
      <li class="step-row"><span class="ok">${calDone ? '✓' : '○'}</span><div class="ex-body"><b>Calibrar el micrófono</b><span class="sub">Recomendado: mide tu silencio, tu soplo suave y tu soplo fuerte.</span></div><a class="btn ghost" style="min-height:40px" href="#/calibrar?from=challenge">${calDone ? 'Repetir' : 'Calibrar'}</a></li>
      <li class="step-row"><span class="ok">${t0 ? '✓' : '○'}</span><div class="ex-body"><b>Prueba inicial</b><span class="sub">Soplo suave, "sss" y Pinocho más largos. Se repite el día 30 para comparar.</span></div><a class="btn ghost" style="min-height:40px" href="#/challenge/prueba/inicial">${t0 ? 'Repetir' : 'Hacer'}</a></li>
    </ul>
    <h2 class="section-title">Tu calendario</h2>
    <div class="day-grid">${cells}</div>
    <div class="legend"><span>✓ hecho</span><span>🟣 hoy</span><span>🎖️ insignia (días 7, 14, 21, 30)</span></div>
    <details class="card" style="margin-top:20px"><summary><b>Las 5 reglas del método</b></summary><ol class="rules">${RULES.map((r) => `<li>${r}</li>`).join('')}</ol></details>
    <p class="muted" style="margin-top:14px;font-size:.85rem">Basado en el curso de 21 días de "El super poder pulmonar" (A. A. "Sandy" Adam). Los días 22 a 30 son una propuesta de la app: repaso en ciclo, integración con canto y prueba final.</p>
    <button class="btn danger" id="reset" style="margin-top:16px">Reiniciar el desafío</button>`;

  root.querySelector('#reset').addEventListener('click', () => {
    if (window.confirm('¿Reiniciar el desafío? Se borran los días completados y las pruebas. (Tus récords y progreso general se conservan.)')) {
      challenge.reset();
      go('#/challenge');
    }
  });
}

function renderIntro(root) {
  root.innerHTML = `
    <div class="page-head"><a class="back" href="#/" aria-label="Volver al inicio">←</a><h1>Desafío de 30 días</h1></div>
    <div class="hero" style="display:block">
      <span class="chip">🔥 Súper poder pulmonar</span>
      <h2 style="margin-top:8px">Un mes de aire, cinco minutos al día</h2>
      <p class="sub" style="margin-top:8px">Una sesión diaria de respiración por la boca, con tu micrófono midiendo qué tan parejo y controlado soplas. Los <b>días 1 a 21</b> siguen el curso del libro "El super poder pulmonar", escrito para instrumentistas de metal y aquí aplicado al canto. Los <b>días 22 a 30</b> lo consolidan y lo integran con tu voz, y el <b>día 30</b> es la prueba final para comparar con el día 1.</p>
    </div>
    <div class="card stack" style="margin-top:14px">
      <h2>Léelo primero</h2>
      <ol class="rules">${RULES.map((r) => `<li>${r}</li>`).join('')}</ol>
      <label class="switch"><input type="checkbox" id="ok" /> <span>Lo leí y lo entendí</span></label>
      <button class="btn primary block" id="accept" disabled>Aceptar el reto</button>
    </div>
    <p class="muted" style="margin-top:14px;font-size:.85rem">Las instrucciones están redactadas con palabras propias a partir del libro de A. A. "Sandy" Adam.</p>`;
  const ok = root.querySelector('#ok');
  const btn = root.querySelector('#accept');
  ok.addEventListener('change', () => (btn.disabled = !ok.checked));
  btn.addEventListener('click', () => {
    challenge.accept();
    toast('¡Reto aceptado! Primero calibra el micrófono y haz la prueba inicial.');
    go('#/challenge');
  });
}

export function renderDay(root, [nStr]) {
  const n = Number(nStr);
  const today = challenge.currentDay();
  if (!challenge.state().accepted) return go('#/challenge');
  if (!(n >= 1 && n <= TOTAL_DAYS) || (today !== null && n > today)) {
    root.innerHTML = `<div class="page-head"><a class="back" href="#/challenge">←</a><h1>Día bloqueado</h1></div><div class="card"><p>Ese día se desbloquea al completar el anterior. Tu día actual es el <b>${today}</b>.</p></div>`;
    return;
  }
  const info = dayInfo(n);
  const done = challenge.state().completed[n];
  root.innerHTML = `
    <div class="page-head"><a class="back" href="#/challenge" aria-label="Volver al desafío">←</a><h1>Día ${n}</h1></div>
    <div class="card stack">
      <div class="row wrap"><span class="chip">${info.phase}</span><span class="chip">${fmtMinutes(info.seconds)}</span>${info.badge ? `<span class="chip">🎖️ ${info.badge}</span>` : ''}${done ? '<span class="chip">✓ hecho</span>' : ''}</div>
      ${info.isReview ? '<p class="muted">Repaso de una sesión del libro, para afianzar el control del aire.</p>' : ''}
      ${info.isIntegration ? '<p class="muted">Hoy llevas el soplo a tu voz: notas largas y crescendo cantado, con un solo aire.</p>' : ''}
      ${info.isFinal ? '<p class="muted">Un calentamiento corto y después la <b>prueba final</b>: la compararás con la del día 1.</p>' : ''}
      <ul class="steps-list">${info.exercises.map((e, i) => `<li class="step-row"><span class="ex-num">${i + 1}</span><div class="ex-body"><b>${esc(stepLabel(e))}</b></div></li>`).join('')}</ul>
      <div class="notice">Todo por la boca, de pie o sentado derecho. <b>Para si te mareas.</b> Las retenciones nunca pasan de 1 minuto.</div>
    </div>
    <div class="sticky-cta"><button class="btn primary" id="go">▶ ${done ? 'Repetir' : 'Empezar'} el día ${n}</button></div>`;
  root.querySelector('#go').addEventListener('click', () => {
    startRun({
      steps: info.exercises,
      meta: { title: `Desafío · Día ${n}`, catLabel: `Desafío · Día ${n} de ${TOTAL_DAYS}`, onComplete: (sum) => challenge.markComplete(n, sum) },
      back: '#/challenge',
      onDone: (res) => (res.summary === 'done' ? (n === TOTAL_DAYS ? '#/challenge/prueba/final' : '#/challenge') : undefined),
    });
  });
}

const TESTS = [
  { key: 'soplo', title: 'Soplo suave más largo', unit: 's', params: { kind: 'mpt', sound: 'soplo', key: 'mpt_soplo' } },
  { key: 'sss', title: '"Sss" más largo', unit: 's', params: { kind: 'mpt', sound: 'sss', key: 'mpt_sss' } },
  { key: 'pinocho', title: 'Pinocho: hasta qué número llegas', unit: '', params: { kind: 'pinocho' } },
];

export function renderTest(root, [which]) {
  const label = which === 'inicial' ? 'Prueba inicial' : 'Prueba final';
  const values = {};
  let idx = 0;
  let api = null;

  const head = `<div class="page-head"><a class="back" href="#/challenge" aria-label="Volver al desafío">←</a><h1>${label}</h1></div>`;

  function intro() {
    root.innerHTML = `${head}<div class="card stack">
      <p>Tres mediciones cortas. ${which === 'inicial' ? 'Las repetirás el día 30 para ver cuánto mejoraste.' : 'Las compararemos con tu prueba inicial.'}</p>
      <ol class="rules"><li>Soplo suave más largo</li><li>"Sss" más largo</li><li>Pinocho: hasta qué número llegas en un aire</li></ol>
      <div class="notice info">Descansa un poco entre intentos, respira normal y para si te mareas. Con micrófono el cronómetro arranca y se detiene solo.</div>
      <button class="btn primary block" id="begin">Empezar</button></div>`;
    root.querySelector('#begin').addEventListener('click', async () => {
      const mic = await audio.initMic();
      if (!mic) toast('Sin micrófono: usarás los botones para iniciar y parar el cronómetro.');
      step(mic);
    });
  }

  async function step(mic) {
    const t = TESTS[idx];
    root.innerHTML = `${head}<div class="card stack">
      <div class="row between"><b>Prueba ${idx + 1} de ${TESTS.length}</b><span class="chip">${t.title}</span></div>
      <div class="s-stage" style="min-height:300px"><div class="s-game" id="host"></div></div>
      <div class="row wrap" style="justify-content:center"><button class="btn primary" id="save">Guardar y seguir</button><button class="btn ghost" id="skip">Saltar esta</button></div></div>`;
    const mod = await import('../games/contador.js');
    const ex = { params: t.params };
    api = mod.mount(root.querySelector('#host'), ex, {
      audio,
      storage,
      mic,
      root: storage.keyRoot(),
      progress: () => 0,
      complete: () => {},
    });
    api.start();
    const next = (keep) => {
      if (keep) {
        api.finish();
        values[t.key] = api.value();
      }
      api.destroy();
      idx++;
      idx < TESTS.length ? step(mic) : results();
    };
    root.querySelector('#save').addEventListener('click', () => next(true));
    root.querySelector('#skip').addEventListener('click', () => next(false));
  }

  function results() {
    challenge.saveTest(which, values);
    const tests = challenge.state().tests;
    const base = tests.inicial;
    const rows = TESTS.map((t) => {
      const v = values[t.key];
      const b = base?.[t.key];
      let delta = '';
      if (which === 'final' && v != null && b != null) {
        const d = Math.round((v - b) * 10) / 10;
        delta = `<span class="${d >= 0 ? 'up' : 'down'}">${d >= 0 ? '▲ +' : '▼ '}${d}${t.unit ? ' ' + t.unit : ''}</span>`;
      }
      const fmt = (x) => (x == null ? '—' : `${x}${t.unit ? ' ' + t.unit : ''}`);
      return `<b>${t.title}</b><span>${which === 'final' ? fmt(b) : ''}</span><span>${fmt(v)} ${delta}</span>`;
    }).join('');
    root.innerHTML = `${head}<div class="card stack">
      <div class="center" style="font-size:3rem">${which === 'final' ? '🏅' : '✅'}</div>
      <h2 class="center">${which === 'final' ? 'Súper poder pulmonar' : 'Prueba inicial guardada'}</h2>
      <div class="kv">${which === 'final' ? '<span class="h"></span><span class="h">Día 1</span><span class="h">Día 30</span>' : ''}${rows}</div>
      ${which === 'final' && !base ? '<p class="muted">No hiciste la prueba inicial, así que no hay comparación. ¡Igual terminaste el reto!</p>' : ''}
      <a class="btn primary block" href="#/challenge">Volver al desafío</a></div>`;
  }

  intro();
  return () => api?.destroy();
}
