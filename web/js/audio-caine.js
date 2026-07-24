// ============================================================
// audio-caine.js — Reproduce las líneas pregrabadas de Caine
// Los mp3 viven en web/audio_caine/ (ver herramientas/).
// Mientras no existan los mp3, muestra el subtítulo y espera
// un tiempo proporcional: la lógica del juego se puede probar
// SIN audio (modo silencioso para desarrollo).
// ============================================================

const RUTA = "audio_caine/";

// Subtítulos: mismo texto que herramientas/generar_voces_caine.js.
// Solo los necesarios para pantalla; agregar si hacen falta más.
export const SUBTITULOS = {
  "00_intro": "¡Bienvenido al CIRCO DIGITAL! Supera mis cinco salas, gana las cinco llaves, y el portal será tuyo. Comienza por la sala de Gangle. ¡Y sonríe!",
  gen_puerta_abierta: "¡Adelante, adelante! La puerta está abierta.",
  gen_fallo_1: "Mmm... no. Pero me encanta tu confianza. ¡Inténtalo de nuevo!",
  gen_fallo_2: "¡Incorrecto otra vez! No te preocupes, querido, el tiempo aquí sobra... literalmente.",
  gen_pulgar_confirmar: "¿Seguro, seguro? ¡Pulgar arriba para sellar el trato!",
  gen_sonrisa_recompensa: "¡Esa sonrisa! ¡ESA es la actitud! Tu recompensa, querido.",
  gen_abstraccion_sube: "Uy... te estás viendo un poquito raro, querido.",
  gen_abstraccion_baja: "¡Una sonrisa al día mantiene la abstracción en la lejanía!",
  gen_abstraccion_reset: "¡Nada que un buen reseteo no arregle! Otra vez, desde el principio.",
  s1_pregunta: "Gangle tenía 24 máscaras. Jax rompió la mitad y luego 4 más. ¿Cuántas quedan?",
  s2_pregunta: "¿Cuál es la fórmula química del agua?",
  s3_pregunta: "¿Cómo se le llama a un error en el código de un programa?",
  s4_pregunta: "¿Cómo se llama el 'cerebro' de una computadora?",
  s5_pregunta: "Aprendo, hablo contigo y adapto mis pistas. ¿Qué tipo de programa soy? Inteligencia... ¿qué?",
  "99_final": "¡Superaste mi juego! Tu premio: ¡UNA NUEVA AVENTURA MAÑANA! Aquí nadie se va de verdad~",
};

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
 */
export function caineDice(id) {
  const sub = document.getElementById("subtitulo-caine");
  const texto = SUBTITULOS[id] || "";
  if (sub) {
    sub.textContent = texto;
    sub.classList.add("visible");
  }

  return new Promise((resolver) => {
    if (audioActual) audioActual.pause();
    const audio = new Audio(`${RUTA}${id}.mp3`);
    audioActual = audio;

    const terminar = () => {
      if (sub) sub.classList.remove("visible");
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
