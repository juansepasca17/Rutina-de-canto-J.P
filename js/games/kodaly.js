// Motor "kodaly": escalera con señas de mano (Curwen/Kodály), cantada con detección de tono, y quiz de oído.

import { mount as mountNota } from './nota.js';
import { createLoop } from '../core/loop.js';

export const DEGREES = [
  { name: 'Do', off: 0, sign: '✊', desc: 'Puño cerrado' },
  { name: 'Re', off: 2, sign: '↗️✋', desc: 'Mano abierta, inclinada hacia arriba' },
  { name: 'Mi', off: 4, sign: '➡️✋', desc: 'Mano plana, palma hacia abajo' },
  { name: 'Fa', off: 5, sign: '👎', desc: 'Pulgar hacia abajo' },
  { name: 'Sol', off: 7, sign: '🤝', desc: 'Mano plana de canto, como un saludo' },
  { name: 'La', off: 9, sign: '↘️✋', desc: 'Mano relajada, dedos colgando' },
  { name: 'Si', off: 11, sign: '☝️', desc: 'Índice apuntando hacia arriba' },
];
const degreeOf = (off) => DEGREES.find((d) => d.off === ((off % 12) + 12) % 12) || DEGREES[0];

function ladder(active) {
  return `<div class="kd-ladder">${[...DEGREES].reverse().map((d) => `<div class="kd-step ${d === active ? 'on' : ''}" style="--i:${d.off}"><b>${d.name}</b><span>${d.sign}</span></div>`).join('')}</div>`;
}

function mountEscalera(host, ex, env) {
  host.innerHTML = `<div class="g-kodaly">
    <div class="kd-side"><div class="kd-sign"><span class="kd-emoji">✊</span><b class="kd-name">Do</b><small class="kd-desc">Puño cerrado</small></div><div class="kd-ladder-wrap"></div></div>
    <div class="kd-nota"></div>
  </div>`;
  const signEl = host.querySelector('.kd-sign');
  const wrap = host.querySelector('.kd-ladder-wrap');
  const show = (off) => {
    const d = degreeOf(off);
    signEl.querySelector('.kd-emoji').textContent = d.sign;
    signEl.querySelector('.kd-name').textContent = d.name;
    signEl.querySelector('.kd-desc').textContent = d.desc;
    wrap.innerHTML = ladder(d);
  };
  show(0);
  const notaEx = { ...ex, params: { targets: [0, 2, 4, 5, 7, 9, 11, 12, 11, 9, 7, 5, 4, 2, 0], holdSecs: 2.5, syllable: 'la' } };
  const api = mountNota(host.querySelector('.kd-nota'), notaEx, { ...env, onTarget: (t) => show(t.degree) });
  return {
    ...api,
    destroy() {
      api.destroy();
      host.innerHTML = '';
    },
  };
}

function mountQuiz(host, ex, env) {
  host.innerHTML = `<div class="g-kodaly quiz">
    <div class="qz-top"><span class="qz-q">Escucha…</span><span class="qz-score"></span></div>
    <div class="qz-feedback"></div>
    <div class="qz-opts"></div>
    <div class="qz-actions"><button type="button" class="btn ghost qz-again">🔊 Repetir</button></div>
  </div>`;
  const qEl = host.querySelector('.qz-q');
  const scoreEl = host.querySelector('.qz-score');
  const fbEl = host.querySelector('.qz-feedback');
  const optsEl = host.querySelector('.qz-opts');
  let answered = 0;
  let correct = 0;
  let target = null;
  let locked = true;
  let timer = 0;
  let waitT = 0;
  let pending = null; // 'ask' | 'next'
  let mounted = true;

  const play = () => {
    env.audio.playMidi(env.root, 0.8);
    setTimeout(() => mounted && target && env.audio.playMidi(env.root + target.off, 1.1), 1000);
  };

  function ask() {
    const pool = DEGREES.filter((d) => d.off !== 0 || Math.random() < 0.15);
    target = pool[Math.floor(Math.random() * pool.length)];
    const others = DEGREES.filter((d) => d !== target).sort(() => Math.random() - 0.5).slice(0, 3);
    const opts = [target, ...others].sort((a, b) => a.off - b.off);
    optsEl.innerHTML = opts.map((d) => `<button type="button" class="btn opt" data-name="${d.name}">${d.name}</button>`).join('');
    fbEl.innerHTML = '';
    qEl.textContent = 'Primero suena el Do… ¿qué nota es la segunda?';
    locked = false;
    play();
  }

  optsEl.addEventListener('click', (e) => {
    const b = e.target.closest('.opt');
    if (!b || locked) return;
    locked = true;
    answered++;
    const ok = b.dataset.name === target.name;
    if (ok) correct++;
    b.classList.add(ok ? 'right' : 'wrong');
    optsEl.querySelectorAll('.opt').forEach((o) => o.dataset.name === target.name && o.classList.add('right'));
    fbEl.innerHTML = `<span class="kd-emoji">${target.sign}</span><b>${ok ? '¡Sí!' : 'Era'} ${target.name}</b><small>${target.desc}</small>`;
    scoreEl.textContent = `${correct}/${answered}`;
    env.audio.playMidi(env.root + target.off, 0.5);
    waitT = 0;
    pending = 'next';
  });
  host.querySelector('.qz-again').addEventListener('click', () => target && play());

  const loop = createLoop((dt) => {
    if (pending === 'next') {
      waitT += dt;
      if (waitT > 2.4) {
        pending = null;
        ask();
      }
    }
    timer += dt;
  });

  return {
    start() {
      if (!target) ask();
      loop.start();
    },
    pause: () => loop.stop(),
    resume: () => loop.start(),
    destroy() {
      mounted = false;
      loop.stop();
      host.innerHTML = '';
    },
    score: () => (answered > 0 ? correct / answered : null),
  };
}

export function mount(host, ex, env) {
  return ex.params.kind === 'quiz' ? mountQuiz(host, ex, env) : mountEscalera(host, ex, env);
}
