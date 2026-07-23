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
    modelo: "modelos/sala1_gangle.glb",
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
    modelo: "modelos/sala2_ragatha.glb",
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
    modelo: "modelos/sala3_kinger.glb",
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
    modelo: "modelos/sala4_zooble.glb",
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
    modelo: "modelos/sala5_pomni.glb",
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