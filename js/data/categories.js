// Categorías = tandas. El orden sigue el Word de Juan Sebastián.

export const CATEGORIES = {
  relajacion: { title: 'Relajación', emoji: '🧘', hue: 265, blurb: 'Suelta cuello, hombros, mandíbula y lengua antes de cantar.' },
  respiracion: { title: 'Respiración', emoji: '🫁', hue: 190, blurb: 'Suave, contenida, jadeante, poderosa y crescendo. Con soplo medido.' },
  apoyo: { title: 'Apoyo y control', emoji: '💪', hue: 215, blurb: 'El "sss", la nota sostenida y las escalas lentas en legato.' },
  resonancia: { title: 'Resonancia', emoji: '🔔', hue: 300, blurb: 'Mmm en escala, sirenas y ubicación del sonido.' },
  proyeccion: { title: 'Proyección del sonido', emoji: '📣', hue: 25, blurb: 'Frases, volumen a 5 y 10 metros, y la vela que no se apaga.' },
  fonacion: { title: 'Fonación', emoji: '🎙️', hue: 340, blurb: 'Trino de labios, apertura vocal y cuello relajado.' },
  afinacion: { title: 'Afinación', emoji: '🎯', hue: 150, blurb: 'Homogeneidad, graves, agudos, intervalos y afinar un tema.' },
  ritmo: { title: 'Ritmo y solfeo', emoji: '🥁', hue: 45, blurb: 'De las sílabas "ta ta" a cantar las notas con su ritmo.' },
  articulacion: { title: 'Articulación', emoji: '👄', hue: 10, blurb: 'Vocales, explosivas p/k y el lápiz en la boca.' },
  kodaly: { title: 'Visión musical (Kodály)', emoji: '🖐️', hue: 170, blurb: 'Señas de mano y simplificación de notas para ver la música.' },
};

export const GROUPS = [
  { id: 'calentamiento', title: 'Calentamiento vocal', cats: ['relajacion', 'respiracion', 'apoyo', 'resonancia', 'proyeccion', 'fonacion'] },
  { id: 'tecnica', title: 'Técnica', cats: ['afinacion', 'ritmo'] },
  { id: 'mas', title: 'También me agrada', cats: ['articulacion', 'kodaly'] },
];

export const CATEGORY_ORDER = GROUPS.flatMap((g) => g.cats);
