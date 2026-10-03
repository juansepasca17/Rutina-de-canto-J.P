// Todos los ejercicios. Cada uno elige un motor de juego (mode) y sus parámetros.
// Motores: guia, soplo, aire, nota, camino, volumen, ritmo, contador, kodaly, graba.
// Los cues de `guia` son [fracción del tiempo, texto].

import { soploTotal } from './soploPatterns.js';

const seg = (notes, d, extra = {}) => notes.map((n) => ({ n, d, ...extra }));
const ESCALA = [0, 2, 4, 5, 7, 5, 4, 2, 0]; // 1-2-3-4-5-4-3-2-1

const soplo = (id, title, text, params, extra = false) => ({
  id,
  cat: 'respiracion',
  title,
  mode: 'soplo',
  fixed: true,
  dur: Math.ceil(soploTotal(params)),
  text,
  params,
  extra,
});

export const EXERCISES = [
  /* ---------------- Relajación ---------------- */
  {
    id: 'rel-cabeza', cat: 'relajacion', title: 'Rotación de cabeza', mode: 'guia', dur: 45,
    text: 'Mueve la cabeza hacia adelante y atrás, luego a los lados y termina con rotaciones. Todo en movimiento natural y lento, sin forzar el cuello.',
    params: { anim: 'cabeza', cues: [[0, 'Adelante y atrás, lento'], [0.33, 'Inclina a los lados'], [0.66, 'Rota la cabeza suavemente']] },
  },
  {
    id: 'rel-hombros', cat: 'relajacion', title: 'Hombros: elevar, soltar y rotar', mode: 'guia', dur: 45,
    text: 'Sube los hombros hacia las orejas y suéltalos de golpe. Después rótalos hacia atrás, en círculos grandes.',
    params: { anim: 'hombros', cues: [[0, 'Sube… y suelta'], [0.4, 'Rota hacia atrás'], [0.75, 'Rota hacia adelante']] },
  },
  {
    id: 'rel-mandibula', cat: 'relajacion', title: 'Masaje mandibular', mode: 'guia', dur: 45,
    text: 'Con las yemas de los dedos, masajea en círculos donde se articula la mandíbula (frente a las orejas) con la boca ligeramente abierta.',
    params: { anim: 'mandibula', cues: [[0, 'Círculos lentos en las articulaciones'], [0.5, 'Abre y cierra la boca suave']] },
  },
  {
    id: 'rel-suu', cat: 'relajacion', title: '"Suu de cristiano"', mode: 'guia', dur: 30,
    text: 'Estira las articulaciones tratando de tocar el techo, con las manos hacia arriba. Alarga todo el cuerpo y suelta.',
    params: { anim: 'estirar', cues: [[0, 'Estírate hacia el techo'], [0.6, 'Mantén… y suelta despacio']] },
  },
  {
    id: 'rel-munecas', cat: 'relajacion', title: 'Muñecas y pies', mode: 'guia', dur: 30, extra: true,
    text: 'Rota las muñecas en un sentido y en el otro; luego los tobillos. Sin prisa.',
    params: { anim: 'munecas', cues: [[0, 'Muñecas en círculos'], [0.5, 'Ahora los pies']] },
  },
  {
    id: 'rel-pucheros', cat: 'relajacion', title: 'Pucheros sostenidos: de moto a abeja', mode: 'camino', dur: 60,
    text: 'Haz puchero (labios juntos y hacia adelante) y suena notas en escala. Aumenta la presión poco a poco: empieza con sonido de moto y termina en sonido de abeja.',
    params: {
      syllable: 'brrr',
      patterns: [seg([0, 2, 4, 5, 7], 2.2).map((s, i) => ({ ...s, label: ['🏍️', '', '', '', '🐝'][i] }))],
    },
  },
  {
    id: 'rel-muecas', cat: 'relajacion', title: 'Muecas', mode: 'guia', dur: 30,
    text: 'Exagera todas las caras que puedas: boca enorme, sonrisa amplia, labios de pez, cejas arriba. Suelta toda la cara.',
    params: { anim: 'muecas', every: 1.6, cycle: [{ e: '😮' }, { e: '😁' }, { e: '😗' }, { e: '😬' }, { e: '🤪' }, { e: '😲' }], cues: [[0, 'Exagera cada gesto']] },
  },
  {
    id: 'rel-lengua', cat: 'relajacion', title: 'Lengua: pasear y rotar', mode: 'guia', dur: 30,
    text: 'Pasa la lengua por dentro de la boca, recorriendo dientes y mejillas, y rótala en círculos hacia un lado y hacia el otro.',
    params: { anim: 'lengua', cues: [[0, 'Recorre dientes y mejillas'], [0.5, 'Círculos al otro lado']] },
  },

  /* ---------------- Respiración (soplo) ---------------- */
  soplo('res-suave', 'Respiración suave', 'Aliento completo por la boca y suelta el aire lo más suave y parejo que puedas, unos 30 segundos (más o menos según tu capacidad de hoy).', { pattern: 'suave', reps: 2, secs: 25 }),
  soplo('res-contenida', 'Respiración contenida', 'Toma aire, mantenlo y relaja el diafragma sin tensarlo. Al final sopla fuerte para vaciar.', { pattern: 'contenida', reps: 2, secs: 25 }),
  soplo('res-jadeante', 'Jadeante profunda', 'Dentro-fuera-dentro-fuera, fuerte y rápido. ¿Cómo si la vecina hubiera comprado un par de perros y te tocara correr unas doce cuadras? Así quedas.', { pattern: 'jadeante', reps: 2, secs: 15 }),
  soplo('res-poderosa', 'Respiración poderosa', 'Sopla al centro de una hoja pegada a la pared, a 15 cm, y trata de mantenerla contra la pared mientras cuentas hasta seis. Si no tienes hoja, imagínala.', { pattern: 'poderosa', reps: 5, cm: 15 }),
  soplo('res-rapida', 'Rápida por la boca y la nariz', 'Respiración rápida y corta, de mitad de pulmón, con salida suave.', { pattern: 'jadeante-poco', reps: 2, secs: 10 }, true),
  soplo('res-crescendo', 'Crescendo y decrescendo', 'Un solo aire que sube de suave a fuerte y vuelve a bajar. Después prueba las combinaciones.', { pattern: 'cresc-decresc', reps: 3 }),
  soplo('res-pecho', 'Jadeante profunda al pecho', 'Como la jadeante, pero sintiendo cómo el aire llena y vacía el pecho. Good.', { pattern: 'jadeante', reps: 2, secs: 12 }),

  /* ---------------- Apoyo y control ---------------- */
  {
    id: 'apo-sss', cat: 'apoyo', title: '"Sss" con apoyo', mode: 'aire', dur: 95,
    text: 'Inhala por la nariz y siente cómo se expanden abdomen y costillas. Exhala lento en "sss" durante 20–30 segundos, con el abdomen activo (como para recibir un golpe, o cuando haces abdomen en el gym).',
    params: { style: 'sss', rounds: 3, hold: 25 },
  },
  {
    id: 'apo-nota', cat: 'apoyo', title: 'Nota sostenida en vocal y en escala', mode: 'nota', dur: 90,
    text: 'Una vocal en un mismo tono, cómodo para ti, sostenida y pareja. Después sube por notas de la escala manteniendo cada una.',
    params: { targets: [0, 0, 2, 4, 5, 7], holdSecs: 4, syllable: 'a' },
  },
  {
    id: 'apo-escala', cat: 'apoyo', title: 'Escalas lentas en legato', mode: 'camino', dur: 120,
    text: 'Una escala 1-2-3-4-5-4-3-2-1 (do, re, mi, fa, sol…) en "ng" o "oo", muy lenta y ligada. Estabilidad ante todo.',
    params: { syllable: 'ng / oo', patterns: [seg(ESCALA, 2.2)] },
  },

  /* ---------------- Resonancia ---------------- */
  {
    id: 'res-mmm', cat: 'resonancia', title: 'Mmm sostenida en escala', mode: 'camino', dur: 90,
    text: 'Con los labios cerrados y suaves, "mmm" sintiendo el zumbido en la cara, subiendo y bajando la escala.',
    params: { syllable: 'mmm', patterns: [seg(ESCALA, 1.8)] },
  },
  {
    id: 'res-sirenas', cat: 'resonancia', title: 'Sirenas', mode: 'camino', dur: 90,
    text: 'Desliza la voz de una nota grave a una aguda y vuelve, sin saltos, como una sirena. Sigue la línea sin cortarla.',
    params: { syllable: 'ng / oo', tol: 150, patterns: [[{ n: [0, 7], d: 3 }, { n: [7, 0], d: 3 }], [{ n: [0, 9], d: 3.5 }, { n: [9, 0], d: 3.5 }]] },
  },
  {
    id: 'res-letras', cat: 'resonancia', title: 'Letras y ubicación del sonido', mode: 'nota', dur: 60, extra: true,
    text: 'Cambia el color con la posición: "eng" con la nariz, voz de niño, "oo" redonda… Mantén la misma nota y nota cómo cambia la resonancia.',
    params: { targets: [0, 0, 0, 0], holdSecs: 3, syllable: 'eng · niño · oo · a' },
  },

  /* ---------------- Proyección del sonido ---------------- */
  {
    id: 'pro-frases', cat: 'proyeccion', title: 'Frases: el bosque de Pinocho', mode: 'contador', dur: 90,
    text: 'Respira y di: "En el bosque de Pinocho todos cuentan hasta ocho: pin uno, pin dos, pin tres…" hasta que te alcance el aire. Cada día debes llegar más lejos; es la prueba de que respiras mejor. Después repite el alfabeto.',
    params: { kind: 'pinocho' },
  },
  {
    id: 'pro-volumen', cat: 'proyeccion', title: 'Volumen: piano, 5 metros y 10 metros', mode: 'volumen', dur: 90,
    text: 'Levanta la cabeza para que el sonido salga entero. Imagina enviar tu voz a 5 metros con fuerza y claridad; luego a 10. Después habla bajito (piano), como al oído de alguien, sin dejar de apoyar el aire: solo cambia el volumen.',
    params: {
      patterns: [
        [{ v: 0.3, d: 3, label: 'piano' }, { v: 0.6, d: 3, label: '5 m' }, { v: 0.9, d: 3, label: '10 m' }, { v: 0.6, d: 3, label: '5 m' }, { v: 0.3, d: 3, label: 'piano' }],
      ],
    },
  },
  {
    id: 'pro-vela', cat: 'proyeccion', title: 'Ejercicio con vela', mode: 'aire', dur: 90, extra: true,
    text: 'Acerca los labios a 3–4 cm de la llama y di "uuu" prolongado. El aire debe salir muy despacio: la práctica está en no apagarla. Si sopla fuerte, se apaga.',
    params: { style: 'vela' },
  },

  /* ---------------- Fonación ---------------- */
  {
    id: 'fon-trino', cat: 'fonacion', title: 'Trino de labios en nota y escala', mode: 'camino', dur: 90,
    text: 'Vibra los labios ("brrr") sosteniendo una nota y luego en escala, como imitando el sonido de un piano.',
    params: { syllable: 'brrr', tol: 80, patterns: [seg(ESCALA, 1.6)] },
  },
  {
    id: 'fon-anchoa', cat: 'fonacion', title: 'Anchoa: apertura vocal', mode: 'guia', dur: 60,
    text: 'Abre la boca y el espacio interno como al inicio de un bostezo (sin buscar el sonido grave). Siente la apertura sin bloquear la salida del sonido.',
    params: { anim: 'anchoa', cues: [[0, 'Abre como al inicio de un bostezo'], [0.4, 'Mantén el espacio abierto'], [0.75, 'Suelta y repite']] },
  },
  {
    id: 'fon-cuello', cat: 'fonacion', title: 'Vocales con cuello relajado', mode: 'nota', dur: 60, extra: true,
    text: 'Vocales tipo "ah" con apertura, con el cuello relajado para que no bloquee la salida del sonido.',
    params: { targets: [0, 2, 4, 2], holdSecs: 3, syllable: 'ah' },
  },

  /* ---------------- Afinación ---------------- */
  {
    id: 'afi-homog', cat: 'afinacion', title: 'Homogeneidad', mode: 'nota', dur: 90,
    text: 'Que la voz no cambie bruscamente de color ni de volumen al subir. Copia cada tono y sostenlo igual de pareja, subiendo por semitonos.',
    params: { targets: [0, 1, 2, 3, 4, 5, 4, 3, 2, 1], holdSecs: 3, syllable: 'a' },
  },
  {
    id: 'afi-nota', cat: 'afinacion', title: 'Afinar con la nota', mode: 'nota', dur: 90,
    text: 'Escucha la nota de referencia y encuéntrala con tu voz. La bolita te muestra si estás alto, bajo o justo en el centro.',
    params: { targets: [0, 4, 7, 2, 5, 9], holdSecs: 3, syllable: 'a' },
  },
  {
    id: 'afi-graves', cat: 'afinacion', title: 'Notas graves: el bostezo', mode: 'camino', dur: 75,
    text: 'Baja de nota en nota con una posición de laringe baja, como un bostezo, y suelta más aire. Ayúdate de referencias para "sentir" el pecho o la garganta.',
    params: { syllable: 'ah (bostezo)', patterns: [seg([0, -2, -4, -5, -7, -5, -4, -2, 0], 2.2)], dir: -1 },
  },
  {
    id: 'afi-agudas', cat: 'afinacion', title: 'Notas altas: sirenas y voz de cabeza', mode: 'camino', dur: 75,
    text: 'Coloca el sonido en el resonador de la cara (voz de cabeza), suelta menos aire y más controlado. Imagina la voz de un niño o un "OMG".',
    params: { syllable: 'oo / OMG', tol: 150, patterns: [[{ n: [0, 9], d: 3 }, { n: [9, 0], d: 3 }], [{ n: [0, 12], d: 3.5 }, { n: [12, 0], d: 3.5 }]] },
  },
  {
    id: 'afi-interv', cat: 'afinacion', title: 'Intervalos: Do – Fa – Do', mode: 'camino', dur: 90,
    text: 'Saltos entre intervalos, como Do – Fa – Do. La app cambia el intervalo en cada ronda (no solo mayores) para que el oído se acostumbre a todos.',
    params: { syllable: 'a', patterns: [[0, 5, 0], [0, 7, 0], [0, 3, 0], [0, 4, 0], [0, 9, 0], [0, -5, 0]].map((p) => seg(p, 2)) },
  },
  {
    id: 'afi-tema', cat: 'afinacion', title: 'Afinar un tema o estándar', mode: 'graba', dur: 120,
    text: 'Elige una canción y aplica las recomendaciones: aísla la melodía, cántala sobre la tónica, aísla las frases difíciles y cántala sobre una grabación. Al final, grábate y compara.',
    params: {
      tips: [
        'Aísla la melodía: toca las notas de la voz en un piano o guitarra.',
        'Canta la melodía sobre la tónica (una nota de fondo constante).',
        'Aísla las frases "difíciles" y repítelas lento.',
        'Canta sobre una grabación de la canción.',
        'Entona bien la escala antes de tomar escena.',
      ],
      ref: [0, 2, 4, 5, 7],
    },
  },

  /* ---------------- Ritmo y solfeo ---------------- */
  {
    id: 'rit-silabas', cat: 'ritmo', title: 'Paso 1: ritmo con sílabas', mode: 'ritmo', dur: 90,
    text: 'Toma una partitura simple y empieza por el acento, con sílabas simples (ta ta, da da) sobre una sola nota cómoda, como Do o La. Toca la pantalla, o di la sílaba, en cada golpe.',
    params: { step: 1, bpm: 72, pattern: [{ d: 1, s: 'ta' }, { d: 1, s: 'ta' }, { d: 0.5, s: 'ti' }, { d: 0.5, s: 'ti' }, { d: 1, s: 'ta' }, { d: 2, s: 'ta-a' }] },
  },
  {
    id: 'rit-nombres', cat: 'ritmo', title: 'Paso 2: decir el nombre de las notas', mode: 'ritmo', dur: 90,
    text: 'Con el mismo ritmo, di los nombres de las notas (do, re, mi…) sobre la misma nota cómoda.',
    params: { step: 2, bpm: 72, pattern: [{ d: 1, s: 'do' }, { d: 1, s: 're' }, { d: 0.5, s: 'mi' }, { d: 0.5, s: 'mi' }, { d: 1, s: 'fa' }, { d: 2, s: 'sol' }] },
  },
  {
    id: 'rit-cantar', cat: 'ritmo', title: 'Paso 3: cantar la nota con su ritmo', mode: 'ritmo', dur: 120,
    text: 'Ahora canta las notas con su altura y su ritmo. Puedes apoyarte en un piano o una guitarra.',
    params: { step: 3, bpm: 72, melody: [0, 2, 4, 4, 5, 7], pattern: [{ d: 1, s: 'do' }, { d: 1, s: 're' }, { d: 0.5, s: 'mi' }, { d: 0.5, s: 'mi' }, { d: 1, s: 'fa' }, { d: 2, s: 'sol' }] },
  },

  /* ---------------- Articulación ---------------- */
  {
    id: 'art-vocales', cat: 'articulacion', title: 'Vocales: lengua y labios', mode: 'guia', dur: 60,
    text: 'Pronuncia bien las vocales cuidando la posición de la lengua y de los labios: a (abierta), e, i (sonrisa), o y u (labios redondos).',
    params: {
      anim: 'ciclo', every: 3.2,
      cycle: [
        { e: '😮', big: 'A', s: 'Boca abierta, lengua plana abajo' },
        { e: '😁', big: 'E', s: 'Labios algo estirados, punta de la lengua atrás de los dientes de abajo' },
        { e: '😬', big: 'I', s: 'Sonrisa, lengua alta y adelante' },
        { e: '😯', big: 'O', s: 'Labios en óvalo, lengua relajada' },
        { e: '😙', big: 'U', s: 'Labios pequeños y redondos, lengua atrás' },
      ],
      cues: [[0, 'Repite cada vocal exagerando la forma']],
    },
  },
  {
    id: 'art-pk', cat: 'articulacion', title: 'Explosivas p y k: control del aire', mode: 'aire', dur: 60,
    text: 'Controla el aire en las letras explosivas: "pa pa pa" y "ka ka ka", claras y sin escupir de más. La llama salta con cada explosiva.',
    params: { style: 'plosivas', goal: 30 },
  },
  {
    id: 'art-lapiz', cat: 'articulacion', title: 'Lápiz en la boca', mode: 'guia', dur: 90,
    text: 'Muerde suavemente un lápiz (de lado, por detrás de los dientes) y lee en voz alta. Al quitarlo, tu dicción será más clara.',
    params: {
      anim: 'ciclo', every: 8,
      cycle: [
        { e: '✏️', t: 'Tres tristes tigres tragaban trigo en un trigal.' },
        { e: '✏️', t: 'Pablito clavó un clavito. ¿Qué clavito clavó Pablito?' },
        { e: '✏️', t: 'Poco a poco Paco empaca poca ropa en pocas copas.' },
        { e: '✏️', t: 'El cielo está enladrillado, ¿quién lo desenladrillará?' },
      ],
      cues: [[0, 'Lápiz entre los dientes. Lee con claridad']],
    },
  },

  /* ---------------- Visión musical (Kodály) ---------------- */
  {
    id: 'kod-escalera', cat: 'kodaly', title: 'Escalera y señas de mano', mode: 'kodaly', dur: 120,
    text: 'Canta cada nota de la escala mientras haces su seña de mano (método Kodály). Ver la nota en el espacio ayuda a simplificarla y a que tu voz suene como la nota que quieres cantar.',
    params: { kind: 'escalera' },
  },
  {
    id: 'kod-quiz', cat: 'kodaly', title: 'Quiz: ¿qué nota es?', mode: 'kodaly', dur: 90,
    text: 'Escucha una nota después de oír el Do y adivina cuál es. Al responder verás su seña de mano.',
    params: { kind: 'quiz' },
  },
];

export const byId = (id) => EXERCISES.find((e) => e.id === id);
export const byCategory = (cat) => EXERCISES.filter((e) => e.cat === cat);

/** Duración efectiva en segundos (los ejercicios fijos, como el soplo, no escalan). */
export const effectiveDur = (ex, speed = 1) => (ex.fixed ? ex.dur : Math.max(20, Math.round((ex.dur * speed) / 5) * 5));
