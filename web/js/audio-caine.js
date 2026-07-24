// ============================================================
// audio-caine.js — Reproduce las líneas pregrabadas de Caine
// Los mp3 viven en web/audio_caine/ (ver herramientas/).
// Mientras no existan los mp3, muestra el subtítulo y espera
// un tiempo proporcional: la lógica del juego se puede probar
// SIN audio (modo silencioso para desarrollo).
//
// Fuente de textos: config-salas.js (TEXTOS) es la referencia.
// SUBTITULOS queda solo como respaldo para claves que no estén
// allí, para no tener dos guiones que se desincronicen.
// ============================================================

import { TEXTOS } from "./config-salas.js";

const RUTA = "audio_caine/";

// Respaldo: claves fuera del guion de salas (portada, final).
export const SUBTITULOS = {
  "00_intro": "¡Bienvenido al CIRCO DIGITAL! Supera mis cinco salas, gana las cinco llaves, y el portal será tuyo. Comienza por la sala de Gangle. ¡Y sonríe!",
  "99_final": "¡Superaste mi juego! Tu premio: ¡UNA NUEVA AVENTURA MAÑANA! Aquí nadie se va de verdad~",
  gen_abstraccion_sube: "Uy... te estás viendo un poquito raro, querido.",
};

/** Texto de una línea: primero el guion de salas, luego el respaldo. */
export function textoDe(id) {
  return TEXTOS[id] || SUBTITULOS[id] || "";
}

let audioActual = null;

// ---- Animación de habla ----------------------------------------
// Leemos la amplitud del mp3 en tiempo real y la exponemos como un
// número 0..1. La portada la usa para que Caine "late" al hablar:
// da lectura de personaje vivo sin necesitar rig facial.

let contextoAudio = null;
let analizador = null;
let suscriptores = [];
let bucleActivo = false;

/** Registra un callback que recibe la intensidad de voz (0..1). */
export function alHablar(callback) {
  suscriptores.push(callback);
}

function emitir(valor) {
  for (const cb of suscriptores) cb(valor);
}

function conectarAnalisis(audio) {
  try {
    if (!contextoAudio) {
      contextoAudio = new (window.AudioContext || window.webkitAudioContext)();
      analizador = contextoAudio.createAnalyser();
      analizador.fftSize = 256;
      analizador.connect(contextoAudio.destination);
    }
    if (contextoAudio.state === "suspended") contextoAudio.resume();
    const fuente = contextoAudio.createMediaElementSource(audio);
    fuente.connect(analizador);
    arrancarBucle();
    return true;
  } catch {
    return false; // sin Web Audio: se usa el bamboleo simulado
  }
}

function arrancarBucle() {
  if (bucleActivo) return;
  bucleActivo = true;
  const datos = new Uint8Array(analizador.frequencyBinCount);
  (function medir() {
    analizador.getByteFrequencyData(datos);
    let suma = 0;
    for (const v of datos) suma += v;
    emitir(Math.min(suma / datos.length / 90, 1));
    requestAnimationFrame(medir);
  })();
}

/** Bamboleo simulado cuando no hay mp3 (modo silencioso). */
function simularHabla(duracionMs) {
  const fin = performance.now() + duracionMs;
  (function paso() {
    const ahora = performance.now();
    if (ahora > fin) return emitir(0);
    emitir(0.35 + Math.sin(ahora / 90) * 0.3);
    requestAnimationFrame(paso);
  })();
}

/**
 * Reproduce una línea de Caine y muestra su subtítulo.
 * Devuelve una Promise que resuelve al terminar el audio
 * (o tras una pausa estimada si el mp3 aún no existe).
 * @param {string} id
 * @param {Object} opciones
 *   ocultarAlFinal — ocultar el subtítulo al terminar (por defecto sí)
 *   sinSubtitulo   — no tocar el subtítulo: el texto ya se muestra
 *                    en otro sitio, como el panel del reto
 */
export function caineDice(id, { ocultarAlFinal = true, sinSubtitulo = false } = {}) {
  const sub = sinSubtitulo ? null : document.getElementById("subtitulo-caine");
  const texto = textoDe(id);
  if (sub) {
    sub.textContent = texto;
    sub.classList.add("visible");
  }

  return new Promise((resolver) => {
    if (audioActual) audioActual.pause();
    const audio = new Audio(`${RUTA}${id}.mp3`);
    audioActual = audio;

    const terminar = () => {
      if (sub && ocultarAlFinal) sub.classList.remove("visible");
      emitir(0);
      resolver();
    };

    const estimado = Math.max(1800, texto.length * 55);

    audio.onended = terminar;
    audio.onerror = () => {
      // mp3 no existe todavía → modo silencioso de desarrollo
      simularHabla(estimado);
      setTimeout(terminar, estimado);
    };
    audio.play()
      .then(() => conectarAnalisis(audio))
      .catch(() => {
        // Autoplay bloqueado (falta interacción del usuario)
        simularHabla(estimado);
        setTimeout(terminar, estimado);
      });
  });
}