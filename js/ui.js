// Utilidades de interfaz.

export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export const starsText = (n, max = 3) => '★'.repeat(n) + '☆'.repeat(Math.max(0, max - n));

/** Estrellas para pantalla: las ganadas brillan y las que faltan quedan tenues. */
export const starsHtml = (n, max = 3) => '★'.repeat(n) + `<span class="st-off">${'★'.repeat(Math.max(0, max - n))}</span>`;

let toastTimer = 0;
export function toast(message, ms = 3600) {
  let el = document.querySelector('.toast');
  if (!el) {
    el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export const MODE_LABEL = {
  guia: { icon: '🧘', text: 'Guiado' },
  soplo: { icon: '🫁', text: 'Soplo medido' },
  aire: { icon: '🕯️', text: 'Control del aire' },
  nota: { icon: '🎯', text: 'Afina la nota' },
  camino: { icon: '🛣️', text: 'Sigue la ruta' },
  volumen: { icon: '🔊', text: 'Volumen' },
  ritmo: { icon: '🥁', text: 'Ritmo' },
  contador: { icon: '⏱️', text: 'Récord' },
  kodaly: { icon: '🖐️', text: 'Kodály' },
  graba: { icon: '🎙️', text: 'Grábate' },
};
