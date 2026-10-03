// Motor "volumen": el mismo camino de objetivos, pero sobre el volumen de la voz.
import { mount as mountCamino } from './camino.js';

export function mount(host, ex, env) {
  return mountCamino(host, { ...ex, params: { ...ex.params, axis: 'volume' } }, env);
}
