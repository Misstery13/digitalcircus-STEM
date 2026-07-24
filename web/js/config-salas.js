// ============================================================
// config-salas.js — Fuente única de verdad de las 5 salas
// Cualquier cambio de contenido se hace AQUÍ, no en el HTML.
// Los nombres de audios corresponden a web/audio_caine/*.mp3
// (generados con herramientas/generar_voces_caine.js).
// ============================================================

export const SALAS = {
  1: {
    personaje: "Gangle",
    materia: "Matemáticas",
    emoji: "🎭",
    modelo: "", // el .glb tiene la escala rota (247723 unidades) y tapa la habitación
    tituloImg: "img/titulos/sala1_gangle.png",
    // Respuestas aceptadas (minúsculas, sin acentos). El validador normaliza.
    respuestas: ["ocho", "8"],
    audios: {
      pregunta: "s1_pregunta",
      pistas: ["s1_pista1", "s1_pista2"],
      caridad: "s1_caridad",
      acierto: "s1_acierto",
      llave: "s1_llave",
    },
    siguiente: "sala.html?id=2",
  },
  2: {
    personaje: "Ragatha",
    materia: "Ciencias",
    emoji: "🔬",
    modelo: "modelos/ragatha.glb",
    tituloImg: "img/titulos/sala2_ragatha.png",
    respuestas: ["h2o", "hache dos o", "agua h2o", "h dos o"],
    audios: {
      pregunta: "s2_pregunta",
      pistas: ["s2_pista1", "s2_pista2"],
      caridad: "s2_caridad",
      acierto: "s2_acierto",
      llave: "s2_llave_jax", // interludio de Jax: llave movida a Kinger
    },
    siguiente: "sala.html?id=3",
  },
  3: {
    personaje: "Kinger",
    materia: "Programación",
    emoji: "🐛",
    modelo: "modelos/tadc_-_kinger.glb",
    tituloImg: "img/titulos/sala3_kinger.png",
    respuestas: ["bug", "bog", "bag"], // variantes fonéticas del reconocedor
    audios: {
      pregunta: "s3_pregunta",
      pistas: ["s3_pista1", "s3_pista2"],
      caridad: "s3_caridad",
      acierto: "s3_acierto",
      llave: "s3_llave",
    },
    siguiente: "sala.html?id=4",
  },
  4: {
    personaje: "Zooble",
    materia: "Tecnología",
    emoji: "⚙️",
    modelo: "modelos/zooble.glb",
    tituloImg: "img/titulos/sala4_zooble.png",
    respuestas: ["cpu", "procesador", "el procesador", "c p u"],
    audios: {
      pregunta: "s4_pregunta",
      pistas: ["s4_pista1", "s4_pista2"],
      caridad: "s4_caridad",
      acierto: "s4_acierto",
      llave: "s4_llave_jax", // interludio de Jax: cartel cambiado
    },
    siguiente: "sala.html?id=5",
  },
  5: {
    personaje: "Pomni",
    materia: "Inteligencia Artificial",
    emoji: "🎩",
    modelo: "modelos/pomni_from_the_amazing_digital_circus.glb",
    tituloImg: "img/titulos/sala5_pomni.png",
    respuestas: ["artificial", "inteligencia artificial"],
    audios: {
      pregunta: "s5_pregunta",
      pistas: ["s5_pista1", "s5_pista2"],
      caridad: "s5_caridad",
      acierto: "s5_acierto", // ya manda al portal en el guion
      llave: null,
    },
    siguiente: "portal.html",
  },
};

// Contrato de animaciones (documento de diseño, sección 5).
// Los .glb de Diana DEBEN traer estos nombres exactos.
export const ANIMACIONES = {
  puerta: "puerta_abrir",
  recompensa: "recompensa_aparecer",
  portal: "portal_activar",
};

export const TOTAL_LLAVES = 5;
export const ABSTRACCION_MAX = 4;

// ============================================================
// TEXTOS — guion de Caine (documento de diseño §2 y §4).
// Respaldo visual: si el mp3 no existe, el texto igual se lee.
// La clave coincide con el nombre del audio.
// ============================================================

export const TEXTOS = {
  // ---- Genéricos ----
  gen_puerta_abierta: "¡Adelante, adelante! Que la puerta no muerde... casi nunca.",
  gen_fallo_1: "Uy... te estás viendo un poquito raro, querido. Yo que tú pensaba mejor la próxima.",
  gen_fallo_2: "¿Otra vez? Ay, querido. Toma otra pista, va de mi cuenta.",
  gen_pulgar_confirmar: "¡Trato sellado! Un pulgar arriba vale más que mil palabras.",
  gen_sonrisa_recompensa: "¡ESA SONRISA! Aquí una buena actitud lo es TODO. Tu recompensa, querido.",
  gen_abstraccion_reset: "¡Nada que un buen reseteo no arregle! Otra vez, desde el principio.",
  gen_abstraccion_baja: "¡Una sonrisa al día mantiene la abstracción en la lejanía!",

  // ---- Sala 1 · Gangle · Matemáticas ----
  s1_pregunta: "La pobre Gangle tenía 24 máscaras de comedia. Jax le rompió la mitad — qué sorpresa — y luego rompió 4 más. ¿Cuántas máscaras le quedan?",
  s1_pista1: "Primero la mitad, luego la resta, querido.",
  s1_pista2: "La mitad de 24 es 12. Y ahora, ¿12 menos 4...?",
  s1_caridad: "Está bien, está bien. Hoy me siento generoso: son OCHO. Dilo en voz alta y hagamos como que lo sabías.",
  s1_acierto: "¡OCHO máscaras! Suficientes para que Gangle llore detrás de todas ellas. ¡Pulgar arriba para sellar el trato!",
  s1_llave: "¡La primera llave es tuya! Solo faltan cuatro. Nada, un paseo.",

  // ---- Sala 2 · Ragatha · Ciencias ----
  s2_pregunta: "Ragatha, siempre tan atenta, quiere ofrecerte un té. Lástima que aquí el agua sea digital. Dime: ¿cuál es la fórmula química del agua?",
  s2_pista1: "Dos átomos de un gas muy ligero y uno de otro sin el cual no respiras.",
  s2_pista2: "Hidrógeno... por dos... más un Oxígeno...",
  s2_caridad: "Acto de caridad: es H2O. Repítelo conmigo y fingimos que nada de esto pasó.",
  s2_acierto: "¡H-2-O! ¡Correcto! Aunque aquí el agua es mentira y el té también, ¡LA CIENCIA ES LA CIENCIA!",
  s2_llave_jax: "Malas noticias, querido: Jax «reorganizó» las llaves. La tuya ahora está en la fortaleza de Kinger. ¿Que por qué lo dejo hacer eso? ¡Porque es DIVERTIDO!",

  // ---- Sala 3 · Kinger · Programación ----
  s3_pregunta: "Kinger colecciona insectos... y sin saberlo, también colecciona lo que más odian los programadores. Dime: ¿cómo se le llama a un error en el código de un programa?",
  s3_pista1: "Es una palabra en inglés que significa... insecto. Mira alrededor de esta sala, querido.",
  s3_pista2: "Empieza con B y Kinger tiene frascos LLENOS de ellos.",
  s3_caridad: "Te lo regalo: BUG. Dilo bonito, que Kinger nos mira.",
  s3_acierto: "¡BUG! ¡Exacto! Los programadores los aplastan y Kinger los colecciona. ¡Cada quien con sus hobbies!",
  s3_llave: "¡Tercera llave! Vamos por la mitad. O por la mitad de la mitad. No soy bueno con las fracciones.",

  // ---- Sala 4 · Zooble · Tecnología ----
  s4_pregunta: "Zooble se desarma y se arma como cualquier buen hardware. Hablando de eso: ¿cómo se llama el «cerebro» de una computadora, la unidad central de procesamiento?",
  s4_pista1: "Son tres letras. La primera es C.",
  s4_pista2: "Central... Processing... ¿Unit?",
  s4_caridad: "Caridad número cuatro: CPU. Tres letras, querido, TRES.",
  s4_acierto: "¡CPU! ¡El cerebro de la máquina! No es que aquí alguno tengamos uno de verdad, pero ¡DETALLES!",
  s4_llave_jax: "Jax cambió el cartel de la última sala. Ignóralo. O no. Las decisiones son parte de la aventura~",

  // ---- Sala 5 · Pomni · Inteligencia Artificial ----
  s5_pregunta: "Última pregunta, y es sobre MÍ. Pomni no deja de preguntarse QUÉ soy. Ayúdala: aprendo de tus respuestas, hablo contigo y adapto mis pistas. ¿Qué tipo de programa soy? Inteligencia... ¿qué?",
  s5_pista1: "Lo contrario de natural.",
  s5_pista2: "Está en el nombre de esta sala, querido. Literalmente.",
  s5_caridad: "ARTIFICIAL. Ahí está. Dilo tú, que suena mejor.",
  s5_acierto: "¡INTELIGENCIA ARTIFICIAL! Como yo: encantador, brillante y ligeramente omnipotente. ¡Tienes las CINCO llaves! Corre a la cámara del portal, tu salida espera... jejeje.",
};

/** Normaliza texto de voz: minúsculas, sin acentos, sin signos. */
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim();
}

/** true si la respuesta del usuario coincide con alguna aceptada. */
export function validarRespuesta(dicho, sala) {
  const limpio = normalizar(dicho);
  return sala.respuestas.some(
    (r) => limpio === normalizar(r) || limpio.includes(normalizar(r))
  );
}