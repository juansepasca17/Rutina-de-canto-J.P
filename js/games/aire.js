// Motor "aire": control del soplo/voz sostenida con el micrófono.
//  · vela: la llama titila con tu soplo; si soplas fuerte se apaga.
//  · sss: rondas de "sss" sostenido, con banda objetivo y traza del nivel.
//  · plosivas: cada "pa"/"ka" hace saltar la llama; cuenta explosiones.

import { createLoop, fitCanvas } from '../core/loop.js';

const BAND = [0.12, 0.55];

export function mount(host, ex, env) {
  const p = ex.params || {};
  const style = p.style || 'vela';
  const useMic = env.mic;

  host.innerHTML = `<div class="g-aire">
    <div class="ai-top"><span class="ai-title"></span><span class="ai-value"></span></div>
    <canvas class="ai-canvas"></canvas>
    <p class="ai-hint"></p>
    <div class="ai-foot"><div class="sp-meter"><i></i></div><span class="ai-score"></span></div>
  </div>`;
  const $ = (s) => host.querySelector(s);
  const canvas = $('.ai-canvas');
  const titleEl = $('.ai-title');
  const valueEl = $('.ai-value');
  const hintEl = $('.ai-hint');
  const meterEl = $('.sp-meter i');
  const scoreEl = $('.ai-score');
  meterEl.parentElement.hidden = !useMic;

  let t = 0;
  let level = 0;
  let hit = 0;
  let scored = 0;

  /* ---- estado de la vela ---- */
  let lit = true;
  let outT = 0;
  let strongT = 0;
  let flick = 0;
  /* ---- estado de sss ---- */
  const rounds = p.rounds || 3;
  const hold = p.hold || 25;
  const REST = 5;
  const INH = 1.5;
  const trace = [];
  let sssRound = 0;
  let sssPhase = 'inhala';
  let sssT = 0;
  let best = 0;
  let cur = 0;
  /* ---- plosivas ---- */
  let bursts = 0;
  let armed = true;
  let kick = 0;
  const goal = p.goal || 30;
  let syl = 0;
  let sylT = 0;

  titleEl.textContent = { vela: '🕯️ La vela', sss: '🐍 "Sss" con apoyo', plosivas: '💨 Explosivas p / k' }[style];
  hintEl.textContent = { vela: 'Di "uuu" muy despacio. Mantén la llama viva sin apagarla.', sss: '', plosivas: 'Repite "pa pa pa" y "ka ka ka": cada explosiva hace saltar la llama.' }[style];

  function drawCandle(ctx, w, h, flameSize, wobble) {
    const cx = w / 2;
    const baseY = h - 28;
    const bodyH = Math.min(120, h * 0.42);
    // cuerpo
    const g = ctx.createLinearGradient(cx - 22, 0, cx + 22, 0);
    g.addColorStop(0, '#f6e7c8');
    g.addColorStop(1, '#d9c39a');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.roundRect(cx - 22, baseY - bodyH, 44, bodyH, 6);
    ctx.fill();
    // mecha
    ctx.strokeStyle = '#3a2f2a';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx, baseY - bodyH);
    ctx.lineTo(cx, baseY - bodyH - 14);
    ctx.stroke();
    const top = baseY - bodyH - 14;
    if (flameSize > 0.02) {
      const fh = 20 + flameSize * 62;
      const fw = 13 + flameSize * 8;
      const lean = wobble * 18;
      const grad = ctx.createRadialGradient(cx + lean * 0.3, top - fh * 0.3, 2, cx + lean * 0.3, top - fh * 0.35, fh * 0.7);
      grad.addColorStop(0, '#fffbe6');
      grad.addColorStop(0.35, '#ffd166');
      grad.addColorStop(1, 'rgba(255,120,40,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.bezierCurveTo(cx - fw, top - fh * 0.3, cx - fw * 0.6 + lean * 0.4, top - fh * 0.8, cx + lean, top - fh);
      ctx.bezierCurveTo(cx + fw * 0.6 + lean * 0.4, top - fh * 0.8, cx + fw, top - fh * 0.3, cx, top);
      ctx.fill();
    } else {
      ctx.strokeStyle = 'rgba(200,200,220,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, top);
      ctx.bezierCurveTo(cx - 10, top - 20, cx + 12, top - 34, cx, top - 56);
      ctx.stroke();
    }
    // banda de referencia a un lado
    const bx = w - 46;
    const bh = h - 56;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.beginPath();
    ctx.roundRect(bx, 20, 16, bh, 8);
    ctx.fill();
    ctx.fillStyle = 'rgba(45,212,191,0.35)';
    ctx.fillRect(bx, 20 + bh * (1 - BAND[1]), 16, bh * (BAND[1] - BAND[0]));
    ctx.fillStyle = '#ffd166';
    const ly = 20 + bh * (1 - level);
    ctx.beginPath();
    ctx.arc(bx + 8, ly, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  function stepVela(dt, ctx, w, h) {
    flick += dt * (8 + level * 20);
    if (!lit) {
      outT += dt;
      if (outT > 1.6) {
        lit = true;
        outT = 0;
        strongT = 0;
        hintEl.textContent = 'La encendimos de nuevo. Más despacio…';
      }
    } else if (useMic) {
      if (level > 0.62) strongT += dt;
      else strongT = Math.max(0, strongT - dt * 2);
      if (strongT > 0.22) {
        lit = false;
        outT = 0;
        hintEl.textContent = '¡Se apagó! Sopla mucho más suave.';
        env.audio.beep(300, 0.2);
      }
    }
    if (lit && useMic) {
      scored += dt;
      if (level >= BAND[0] && level <= BAND[1]) hit += dt;
    }
    const size = lit ? (useMic ? Math.max(0.05, 0.55 - level * 0.35) * 1.2 : 0.5 + Math.sin(t * 2) * 0.05) : 0;
    const wobble = lit ? Math.sin(flick) * Math.min(1, level * 1.6) : 0;
    drawCandle(ctx, w, h, size, wobble);
    valueEl.textContent = lit ? (useMic ? '' : 'Sigue la guía') : 'Apagada';
  }

  function stepPlosivas(dt, ctx, w, h) {
    kick = Math.max(0, kick - dt * 3);
    if (useMic) {
      if (armed && level > 0.42) {
        bursts++;
        armed = false;
        kick = 1;
      } else if (!armed && level < 0.18) armed = true;
    }
    sylT += dt;
    if (sylT > 0.55) {
      sylT = 0;
      syl++;
    }
    const seqs = ['pa', 'pa', 'pa', 'ka', 'ka', 'ka'];
    drawCandle(ctx, w, h, 0.55 + kick * 0.5, (Math.random() - 0.5) * kick);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = '700 44px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(seqs[syl % seqs.length], w / 2, 56);
    valueEl.textContent = useMic ? `${bursts} / ${goal}` : 'Sigue el ritmo';
  }

  function stepSss(dt, ctx, w, h) {
    sssT += dt;
    if (sssPhase === 'inhala' && sssT >= INH) {
      sssPhase = 'sss';
      sssT = 0;
      cur = 0;
      env.audio.beep(1040, 0.12);
    } else if (sssPhase === 'sss' && sssT >= hold) {
      sssPhase = 'descansa';
      sssT = 0;
      best = Math.max(best, cur);
      env.audio.beep(440, 0.1);
    } else if (sssPhase === 'descansa' && sssT >= REST) {
      sssRound = (sssRound + 1) % rounds;
      sssPhase = 'inhala';
      sssT = 0;
      trace.length = 0;
    }
    if (sssPhase === 'sss') {
      cur = sssT;
      if (useMic) {
        scored += dt;
        if (level >= BAND[0] && level <= BAND[1]) hit += dt;
      }
    }
    trace.push(sssPhase === 'sss' ? level : null);
    if (trace.length > 480) trace.shift();

    const pad = 14;
    const Y = (v) => h - pad - v * (h - pad * 2 - 24);
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, w - pad * 2, h - pad * 2, 14);
    ctx.fill();
    ctx.fillStyle = 'rgba(45,212,191,0.22)';
    ctx.fillRect(pad, Y(BAND[1]), w - pad * 2, Y(BAND[0]) - Y(BAND[1]));
    if (useMic) {
      ctx.strokeStyle = '#ffd166';
      ctx.lineWidth = 3;
      ctx.beginPath();
      let pen = false;
      trace.forEach((v, i) => {
        if (v == null) {
          pen = false;
          return;
        }
        const x = pad + (i / 480) * (w - pad * 2);
        if (!pen) ctx.moveTo(x, Y(v));
        else ctx.lineTo(x, Y(v));
        pen = true;
      });
      ctx.stroke();
    }
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '700 40px system-ui, sans-serif';
    const label = sssPhase === 'inhala' ? 'Inhala' : sssPhase === 'sss' ? 'SSSSS' : 'Descansa';
    ctx.fillText(label, w / 2, 62);
    valueEl.textContent = `Ronda ${sssRound + 1}/${rounds} · ${sssPhase === 'sss' ? Math.floor(cur) : Math.floor(best)} s`;
    hintEl.textContent = sssPhase === 'sss' ? 'Abdomen activo, costillas abiertas. Sostén el "sss" parejo.' : sssPhase === 'inhala' ? 'Nariz: siente cómo se expanden abdomen y costillas.' : 'Suelta el aire que quede y respira normal.';
  }

  const loop = createLoop((dt) => {
    t += dt;
    const s = useMic ? env.audio.sample() : null;
    level = s ? level + (s.level - level) * 0.4 : 0;
    meterEl.style.width = `${Math.round(level * 100)}%`;
    const { ctx, w, h } = fitCanvas(canvas);
    ctx.clearRect(0, 0, w, h);
    if (style === 'vela') stepVela(dt, ctx, w, h);
    else if (style === 'plosivas') stepPlosivas(dt, ctx, w, h);
    else stepSss(dt, ctx, w, h);
    if (style !== 'plosivas' && scored > 0) scoreEl.textContent = `${Math.round((hit / scored) * 100)}%`;
    if (style === 'plosivas' && useMic) scoreEl.textContent = `${Math.min(100, Math.round((bursts / goal) * 100))}%`;
  });

  return {
    start: () => loop.start(),
    pause: () => loop.stop(),
    resume: () => loop.start(),
    destroy() {
      loop.stop();
      host.innerHTML = '';
    },
    score() {
      if (!useMic) return null;
      if (style === 'plosivas') return Math.min(1, bursts / goal);
      return scored > 0 ? hit / scored : null;
    },
  };
}
