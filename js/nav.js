// Navegación mínima compartida entre vistas y el enrutador.

let pending = null;

export const go = (hash) => {
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange'));
  else location.hash = hash;
};

/** Prepara una tanda y navega a la pantalla de sesión. run: { steps, meta, onDone?(res) → hash|void, back }. */
export function startRun(run) {
  pending = run;
  go('#/run');
}

export const takeRun = () => pending;
export const setRun = (run) => (pending = run);
