import * as storage from '../core/storage.js';
import * as audio from '../core/audio.js';
import { NOTE_NAMES, midiName } from '../core/pitch.js';
import { createLoop } from '../core/loop.js';
import { go } from '../nav.js';
import { toast } from '../ui.js';

export function renderSettings(root) {
  const settings = storage.get().settings;
  let loop = null;

  function paint() {
    const st = storage.get().settings;
    root.innerHTML = `
      <div class="page-head"><h1>Ajustes</h1></div>
      <div class="card">
        <div class="field"><span class="lab">Tonalidad base</span>
          <div class="tonics" role="group" aria-label="Tonalidad base">${NOTE_NAMES.map((n, i) => `<button type="button" data-tonic="${i}" class="${st.tonic === i ? 'on' : ''}">${n}</button>`).join('')}</div>
          <p class="hint">La nota "casa" de los ejercicios. Cada ronda se mueve unos semitonos para que no sea siempre la misma escala.</p></div>
        <div class="field"><span class="lab">Registro de tu voz</span>
          <div class="seg" role="group"><button type="button" data-oct="3" class="${st.octave === 3 ? 'on' : ''}">Grave</button><button type="button" data-oct="4" class="${st.octave === 4 ? 'on' : ''}">Agudo</button></div>
          <p class="hint">Solo define dónde suena la referencia. Puedes cantar en cualquier octava: la app compara por nota. ${st.range ? `Tu rango medido (${midiName(st.range.low)}–${midiName(st.range.high)}) tiene prioridad.` : ''}</p>
          <a class="btn ghost" style="margin-top:8px;min-height:42px" href="#/rango">${st.range ? 'Volver a medir mi rango' : 'Descubrir mi rango'}</a></div>
        <div class="field"><span class="lab">Duración de los ejercicios</span>
          <div class="seg" role="group"><button type="button" data-speed="0.7" class="${st.speed === 0.7 ? 'on' : ''}">Corta ×0,7</button><button type="button" data-speed="1" class="${st.speed === 1 ? 'on' : ''}">Normal</button><button type="button" data-speed="1.5" class="${st.speed === 1.5 ? 'on' : ''}">Larga ×1,5</button></div>
          <p class="hint">No cambia los ejercicios de soplo ni el desafío, que tienen su duración fija.</p></div>
        <div class="field"><label class="switch"><input type="checkbox" id="mic" ${st.micOn ? 'checked' : ''} /> <span><b>Usar el micrófono</b> en los minijuegos</span></label>
          <p class="hint">Sin micrófono los ejercicios funcionan como guías cronometradas, sin medición.</p></div>
        <div class="field"><label class="switch"><input type="checkbox" id="sound" ${st.sound ? 'checked' : ''} /> <span><b>Sonidos</b> (referencias, metrónomo y avisos)</span></label></div>
        <div class="field"><span class="lab">Micrófono</span>
          <div class="meter"><i id="live"></i></div>
          <div class="row wrap" style="margin-top:10px"><button class="btn ghost" style="min-height:42px" id="test">🎤 Probar el micrófono</button><a class="btn ghost" style="min-height:42px" href="#/calibrar">${st.cal ? 'Volver a calibrar' : 'Calibrar'}</a></div>
          <p class="hint">${st.cal ? 'Calibrado.' : 'Sin calibrar: se usan valores por defecto.'} Se recomienda calibrar una vez por dispositivo.</p></div>
      </div>
      <h2 class="section-title">Datos</h2>
      <div class="card stack">
        <button class="btn danger" id="reset">Borrar todo mi progreso</button>
        <p class="hint muted">Borra rachas, estrellas, récords y el desafío. Los ajustes se conservan.</p>
      </div>
      <h2 class="section-title">Acerca de</h2>
      <div class="card"><p class="muted" style="font-size:.9rem">Vocalia organiza la rutina vocal de <b>Juan Sebastián Pascagaza Rivera</b> por categorías, con timer y minijuegos. El desafío de 30 días se basa en el curso de "El super poder pulmonar" de A. A. "Sandy" Adam; las instrucciones están redactadas con palabras propias.</p></div>`;
  }

  paint();

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.tonic != null) {
      storage.updateSettings({ tonic: Number(b.dataset.tonic) });
      audio.playMidi(60 + Number(b.dataset.tonic), 0.6);
      paint();
    } else if (b.dataset.oct != null) {
      storage.updateSettings({ octave: Number(b.dataset.oct) });
      paint();
    } else if (b.dataset.speed != null) {
      storage.updateSettings({ speed: Number(b.dataset.speed) });
      paint();
    } else if (b.id === 'test') {
      if (!(await audio.initMic())) return toast('No pude activar el micrófono. Revisa los permisos del navegador.');
      loop?.stop();
      const live = root.querySelector('#live');
      loop = createLoop(() => {
        const s = audio.sample();
        if (s && live) live.style.width = `${Math.round(s.level * 100)}%`;
      });
      loop.start();
      b.textContent = '🎤 Habla o sopla…';
    } else if (b.id === 'reset') {
      if (window.confirm('¿Borrar todo tu progreso? Esto no se puede deshacer.')) {
        const keep = { ...storage.get().settings };
        storage.reset();
        storage.updateSettings(keep);
        toast('Progreso borrado');
        go('#/settings');
      }
    }
  });

  root.addEventListener('change', (e) => {
    if (e.target.id === 'mic') storage.updateSettings({ micOn: e.target.checked });
    if (e.target.id === 'sound') {
      storage.updateSettings({ sound: e.target.checked });
      audio.setSound(e.target.checked);
    }
  });

  return () => loop?.stop();
}
