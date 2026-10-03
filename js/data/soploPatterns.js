// Patrones de respiración/soplo. Cada uno define su duración y la banda objetivo (0..1) a lo largo del tiempo.
// Inspirados en el método de "El super poder pulmonar" (A.A. "Sandy" Adam); las instrucciones están redactadas con palabras propias.

export const INHALE = 1.5; // aliento completo (~1 s) + margen
export const RECOVER = 5; // recuperar respiración normal entre repeticiones

const band = (c, tol = 0.17) => [Math.max(0, c - tol), Math.min(1, c + tol)];
const SILENT = [0, 0.1];
const lerp = (a, b, t) => a + (b - a) * t;
const tri = (t, d, lo, hi) => lerp(lo, hi, t < d / 2 ? t / (d / 2) : 1 - (t - d / 2) / (d / 2));
const seq = (levels, step, tol = 0.17) => (t) => band(levels[Math.floor(t / step) % levels.length], tol);

export const PATTERNS = {
  jadeante: {
    name: 'Jadeante profunda',
    kind: 'pant',
    dur: (o) => o.secs || 12,
    target: () => [0.3, 1],
    label: 'Jadea fuerte: dentro-fuera-dentro-fuera',
    how: 'Toma un aliento profundo y jadea: dentro-fuera-dentro-fuera, tan fuerte como si acabaras de correr una milla. Unas 10 repeticiones y para. (¿Y luego cómo quedas? Como quien corrió doce cuadras detrás de los perros de la vecina.)',
  },
  'jadeante-poco': {
    name: 'Jadeante poco profunda',
    kind: 'pant',
    dur: (o) => o.secs || 10,
    target: () => [0.15, 0.75],
    label: 'Jadea rápido, solo con la parte alta del pecho',
    how: 'Aliento corto que llena solo la mitad superior de los pulmones, y jadea rápido: dentro-fuera, como un perro contento. Unos 10 segundos.',
  },
  suave: {
    name: 'Respiración suave',
    kind: 'steady',
    dur: (o) => o.secs || 30,
    target: () => band(0.28, 0.2),
    label: 'Suelta el aire lo más suave y parejo que puedas',
    how: 'Aliento profundo y suelta el aire lo más gentilmente posible, sin aguantarlo, durante todo el tiempo. Al final expulsa el aire que quede.',
  },
  contenida: {
    name: 'Respiración contenida',
    kind: 'hold',
    dur: (o) => o.secs || 30,
    target: () => SILENT,
    label: 'Mantén el aire. Relaja el diafragma, no lo tenses',
    how: 'Aliento profundo y no lo sueltes. Relájate sin tensar el diafragma y mantén. Al terminar, sopla fuerte para vaciar los pulmones.',
  },
  mantenida: {
    name: 'Respiración mantenida',
    kind: 'hold',
    dur: (o) => o.secs || 60,
    target: () => SILENT,
    label: 'Mantén el aire, relajado. Un minuto o más',
    how: 'Aliento profundo y mantenlo relajado, sin tensar el diafragma, un minuto o más si estás cómodo. Para si te mareas.',
  },
  'contenida-forzada': {
    name: 'Contenida forzada',
    kind: 'hold',
    dur: (o) => o.secs || 10,
    target: () => SILENT,
    label: 'Aprieta hacia el estómago y cuenta despacio',
    how: 'Aliento profundo y aguántalo. Con las palmas justo bajo las costillas, aprieta hacia el estómago mientras empujas el aire hacia abajo. Cuenta despacio hasta el final; luego sopla fuerte y vacía.',
  },
  vigorosa: {
    name: 'Respiración vigorosa',
    kind: 'steady',
    dur: () => 5,
    target: (t) => (t < 3 ? band(0.88, 0.2) : null),
    label: 'Sopla con toda tu fuerza y vacía los pulmones',
    how: 'Aliento profundo, no lo mantengas: sopla con tanta fuerza como tengas hasta vaciar los pulmones por completo.',
  },
  poderosa: {
    name: 'Respiración poderosa',
    kind: 'steady',
    dur: () => 6,
    target: () => band(0.85, 0.2),
    label: (o) => `Sopla al centro de la hoja (a ${o.cm || 15} cm) contando hasta 6`,
    how: (o) => `Sostén una hoja A4 contra una pared lisa, con los labios a ${o.cm || 15} cm. Aliento fuerte y sopla al centro: deja que la hoja se mueva, pero intenta mantenerla pegada a la pared mientras cuentas despacio hasta seis.`,
  },
  crescendo: {
    name: 'Crescendo',
    kind: 'curve',
    dur: () => 8,
    target: (t, o, d) => band(lerp(0.15, 0.92, t / d), 0.2),
    label: 'De muy suave a lo más fuerte, poco a poco',
    how: 'Aliento fuerte. Empieza suave y aumenta poco a poco la velocidad del aire hasta soplar lo más fuerte posible. Vacía todo el aire.',
  },
  decrescendo: {
    name: 'Decrescendo',
    kind: 'curve',
    dur: () => 8,
    target: (t, o, d) => band(lerp(0.92, 0.12, t / d), 0.2),
    label: 'De lo más fuerte a muy suave, poco a poco',
    how: 'Aliento fuerte. Sopla vigorosamente y baja poco a poco la velocidad del aire hasta soplar lo más suave que puedas. Vacía todo el aire.',
  },
  'cresc-decresc': {
    name: 'Crescendo-decrescendo',
    kind: 'curve',
    dur: () => 12,
    target: (t, o, d) => band(tri(t, d, 0.12, 0.92), 0.2),
    label: 'Sube de suave a fuerte y vuelve a suave',
    how: 'Aliento profundo. Empieza muy suave, sube gradualmente hasta lo más fuerte y vuelve a bajar hasta lo más suave, todo en un solo aire.',
  },
  'decresc-cresc': {
    name: 'Decrescendo-crescendo',
    kind: 'curve',
    dur: () => 12,
    target: (t, o, d) => band(tri(t, d, 0.92, 0.12), 0.2),
    label: 'Baja de fuerte a suave y vuelve a subir',
    how: 'Toma mucho aire. Sopla fuerte, baja gradualmente hasta lo más suave y luego vuelve a subir hasta lo más fuerte, sin cortar el aire.',
  },
  'para-sopla-vigorosa': {
    name: 'Vigorosa para-sopla',
    kind: 'pulse',
    dur: () => 16,
    target: (t) => (t % 2 < 1 ? band(0.88, 0.2) : SILENT),
    label: (o, t) => (t % 2 < 1 ? 'SOPLA fuerte' : 'PARA'),
    how: 'Sopla lo más fuerte que puedas durante 1 segundo y para durante otro segundo, sin tomar más aire. Sigue sopla-para-sopla-para hasta vaciar los pulmones.',
  },
  'para-sopla-suave': {
    name: 'Suave para-sopla',
    kind: 'pulse',
    dur: () => 16,
    target: (t) => (t % 2 < 1 ? band(0.28, 0.2) : SILENT),
    label: (o, t) => (t % 2 < 1 ? 'SOPLA suave' : 'PARA'),
    how: 'Igual que el anterior pero suave: 1 segundo de soplo gentil y 1 segundo de pausa, sin tomar más aire, hasta vaciar.',
  },
  'para-respira-vigorosa': {
    name: 'Vigorosa para-respira',
    kind: 'pulse',
    dur: () => 16,
    target: (t) => (t % 2 < 1 ? band(0.88, 0.2) : null),
    label: (o, t) => (t % 2 < 1 ? 'SOPLA fuerte' : 'RESPIRA'),
    how: 'Interpretación de la app (el libro solo nombra este ejercicio): 1 segundo de soplo fuerte y, en la pausa de 1 segundo, un aliento corto por la boca. Repite.',
  },
  'para-respira-suave': {
    name: 'Suave para-respira',
    kind: 'pulse',
    dur: () => 16,
    target: (t) => (t % 2 < 1 ? band(0.28, 0.2) : null),
    label: (o, t) => (t % 2 < 1 ? 'SOPLA suave' : 'RESPIRA'),
    how: 'Interpretación de la app (el libro solo nombra este ejercicio): 1 segundo de soplo suave y, en la pausa de 1 segundo, un aliento corto por la boca. Repite.',
  },
  'suave-fuerte': {
    name: 'Suave-fuerte',
    kind: 'curve',
    dur: () => 14,
    target: seq([0.26, 0.88], 2, 0.2),
    label: 'Alterna suave y fuerte sin dejar de soplar',
    how: 'Aliento fuerte. Sopla suave y, sin dejar de soplar, sube a lo más fuerte; luego otra vez suave. Sigue suave-fuerte-suave-fuerte hasta vaciar el aire.',
  },
  'suave-medio-fuerte': {
    name: 'Suave-medio-fuerte',
    kind: 'curve',
    dur: () => 14,
    target: seq([0.2, 0.55, 0.9, 0.55], 1.75, 0.18),
    label: 'Suave → medio → fuerte → medio → suave, sin parar',
    how: 'Aliento fuerte. Empieza muy suave, sin parar sube un poco, luego a lo más fuerte, baja un poco y otra vez muy suave. Sigue suave-medio-fuerte-medio-suave hasta vaciar.',
  },
  bombeada: {
    name: 'Respiración bombeada',
    kind: 'curve',
    dur: () => 12,
    target: (t) => band(t % 3 > 2.4 ? 0.85 : 0.5, 0.17),
    label: 'Aire medio constante con acentos fuertes',
    how: 'Aliento fuerte. Sopla con aire medio y constante y, cada tanto, acentúa con vigor para volver al medio, como si bombearas el aire hacia fuera.',
  },
};
PATTERNS['mantenida-forzada'] = PATTERNS['contenida-forzada'];

export const patternHow = (p, o = {}) => (typeof p.how === 'function' ? p.how(o) : p.how);

/** Duración total de una serie: reps × (inhalar + acción + recuperar). */
export function soploTotal({ pattern, reps = 1, ...o }) {
  const p = PATTERNS[pattern];
  if (!p) throw new Error(`Patrón desconocido: ${pattern}`);
  return reps * (INHALE + p.dur(o) + RECOVER);
}
