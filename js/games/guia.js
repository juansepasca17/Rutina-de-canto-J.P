// Motor "guia": ilustración animada + cues por tiempo. Sin micrófono.

import { createLoop } from '../core/loop.js';

const svg = (inner) => `<svg viewBox="0 0 200 200" class="anim-svg" aria-hidden="true">${inner}</svg>`;

const ANIMS = {
  cabeza: () =>
    svg(`<path d="M40 190 Q100 140 160 190" class="a-body"/>
    <rect x="90" y="120" width="20" height="26" rx="8" class="a-body"/>
    <g class="a-head-orbit"><circle cx="100" cy="90" r="38" class="a-skin"/><circle cx="88" cy="86" r="4" class="a-ink"/><circle cx="112" cy="86" r="4" class="a-ink"/><path d="M88 106 Q100 114 112 106" class="a-line"/></g>`),
  hombros: () =>
    svg(`<circle cx="100" cy="62" r="26" class="a-skin"/><circle cx="91" cy="58" r="3" class="a-ink"/><circle cx="109" cy="58" r="3" class="a-ink"/>
    <rect x="92" y="84" width="16" height="18" rx="6" class="a-body"/>
    <g class="a-shoulder-l"><circle cx="58" cy="118" r="24" class="a-body"/></g><g class="a-shoulder-r"><circle cx="142" cy="118" r="24" class="a-body"/></g>
    <rect x="58" y="112" width="84" height="76" rx="26" class="a-body-soft"/>`),
  mandibula: () =>
    svg(`<circle cx="100" cy="100" r="62" class="a-skin"/><circle cx="80" cy="88" r="5" class="a-ink"/><circle cx="120" cy="88" r="5" class="a-ink"/>
    <g class="a-jaw"><path d="M78 124 Q100 140 122 124" class="a-line"/></g>
    <g class="a-hand-l"><circle cx="46" cy="112" r="15" class="a-hand"/></g><g class="a-hand-r"><circle cx="154" cy="112" r="15" class="a-hand"/></g>`),
  estirar: () =>
    svg(`<circle cx="100" cy="46" r="20" class="a-skin"/><rect x="86" y="70" width="28" height="70" rx="12" class="a-body"/>
    <line x1="92" y1="140" x2="84" y2="190" class="a-limb"/><line x1="108" y1="140" x2="116" y2="190" class="a-limb"/>
    <g class="a-arm-l"><line x1="90" y1="78" x2="90" y2="132" class="a-limb"/></g><g class="a-arm-r"><line x1="110" y1="78" x2="110" y2="132" class="a-limb"/></g>`),
  munecas: () => `<div class="anim-emoji-row"><span class="anim-emoji spin">🤚</span><span class="anim-emoji spin rev">🦶</span></div>`,
  lengua: () =>
    svg(`<ellipse cx="100" cy="100" rx="66" ry="46" class="a-mouth"/><g class="a-tongue-orbit"><circle cx="100" cy="100" r="17" class="a-tongue"/></g>`),
  anchoa: () =>
    svg(`<ellipse cx="100" cy="100" rx="52" ry="14" class="a-mouth a-yawn"/><text x="100" y="178" text-anchor="middle" class="a-ah">Ahh…</text>`),
  ciclo: () => '',
  pulso: () => `<div class="anim-pulse"></div>`,
};

export function mount(host, ex, env) {
  const p = ex.params || {};
  const anim = (ANIMS[p.anim] || ANIMS.pulso)();
  host.innerHTML = `<div class="g-guia">
    <div class="g-anim ${p.anim === 'ciclo' ? 'is-cycle' : ''}">${anim}<div class="g-cycle" aria-live="polite"></div></div>
    <div class="g-cue" aria-live="polite"></div>
  </div>`;
  const cueEl = host.querySelector('.g-cue');
  const cycleEl = host.querySelector('.g-cycle');
  const cues = p.cues || [];
  const cycle = p.cycle || [];
  const every = p.every || 2;
  let t = 0;
  let cueIdx = -1;
  let cycIdx = -1;

  const pop = (el) => {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  };

  const showCycle = (i) => {
    const c = cycle[i % cycle.length];
    cycleEl.innerHTML = `${c.e ? `<span class="cyc-emoji">${c.e}</span>` : ''}${c.big ? `<span class="cyc-big">${c.big}</span>` : ''}${c.t ? `<span class="cyc-text">${c.t}</span>` : ''}${c.s ? `<span class="cyc-sub">${c.s}</span>` : ''}`;
    pop(cycleEl);
  };

  const loop = createLoop((dt) => {
    t += dt;
    const f = env.progress();
    let ci = -1;
    cues.forEach((c, k) => {
      if (f >= c[0]) ci = k;
    });
    if (ci !== cueIdx) {
      cueIdx = ci;
      cueEl.textContent = ci >= 0 ? cues[ci][1] : '';
      pop(cueEl);
    }
    if (cycle.length) {
      const i = Math.floor(t / every);
      if (i !== cycIdx) {
        cycIdx = i;
        showCycle(i);
      }
    }
  });

  return {
    start() {
      host.classList.remove('paused');
      loop.start();
    },
    pause() {
      host.classList.add('paused');
      loop.stop();
    },
    resume() {
      host.classList.remove('paused');
      loop.start();
    },
    destroy() {
      loop.stop();
      host.innerHTML = '';
    },
    score: () => null,
  };
}
