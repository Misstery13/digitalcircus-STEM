// ============================================================
// sala.js — Máquina de estados de cada sala (secciones 2.2 y 2.3)
//
//   PUERTA → PREGUNTA → ESCUCHANDO → (fallo ×3 → CARIDAD)
//          → CONFIRMAR (pulgar) → SONRISA → LLAVE → siguiente
//
// Reglas implementadas del documento de diseño:
//   · fallo o pista → +1 abstracción (glitch CSS progresivo)
//   · sonrisa fuera de recompensa → −1 abstracción
//   · abstracción = 4 → reset suave de la sala
//   · 3 fallos → Caine regala la respuesta ("acto de caridad")
// ============================================================

import { SALAS, TEXTOS, ANIMACIONES, validarRespuesta } from "./config-salas.js";
import * as estado from "./estado.js";
import { caineDice as reproducirVoz } from "./audio-caine.js";
import { iniciarGestos, escucharRespuesta } from "./gestos.js";

const id = parseInt(new URLSearchParams(location.search).get("id") || "1", 10);
const sala = SALAS[id];
if (!sala) location.href = "index.html";

// ---- DOM ----
const visor = document.getElementById("visor3d");
const btnResponder = document.getElementById("btn-responder");
const indicacion = document.getElementById("indicacion");
const subtitulo = document.getElementById("subtitulo-caine");
const escena = document.getElementById("escena-sala");
const panelPregunta = document.getElementById("pregunta-fija");

const esperar = (ms) => new Promise((r) => setTimeout(r, Math.max(0, ms)));

// Rótulo: imagen de título si la sala la tiene, texto si no
const rotulo = document.getElementById("rotulo-sala");
if (sala.tituloImg) {
  rotulo.classList.add("con-imagen");
  rotulo.innerHTML =
    `<img class="titulo-imagen" src="${sala.tituloImg}" alt="Sala de ${sala.personaje} · ${sala.materia}">`;
} else {
  document.getElementById("nombre-personaje").textContent =
    `${sala.emoji} ${sala.personaje}`;
  document.getElementById("nombre-materia").textContent = sala.materia;
}

document.title = `Sala ${id} — ${sala.personaje} | Digital Circus STEM Escape`;
if (sala.modelo) visor.src = sala.modelo;
estado.pintarHUD();

// ---- Panel fijo del reto ----
// La pregunta se queda en pantalla toda la sala; las frases de
// Caine (pistas, fallos, aciertos) van aparte en el subtítulo.

function fijarPregunta(texto) {
  if (!panelPregunta || !texto) return;
  panelPregunta.querySelector(".texto").textContent = texto;
  panelPregunta.classList.add("visible");
}

function ocultarPregunta() {
  panelPregunta?.classList.remove("visible");
}

// ---- Realimentación visual (acierto / fallo) ----

function marcar(tipo) {
  if (!escena) return;
  escena.classList.remove("acierto", "fallo");
  void escena.offsetWidth; // reinicia la animación
  if (tipo) escena.classList.add(tipo);
  if (subtitulo) {
    subtitulo.classList.remove("es-acierto", "es-fallo");
    if (tipo === "acierto") subtitulo.classList.add("es-acierto");
    if (tipo === "fallo") subtitulo.classList.add("es-fallo");
  }
}

// ---- Voz de Caine ----
// audio-caine.js ya escribe el subtítulo leyendo de TEXTOS y espera
// un tiempo proporcional al texto cuando el mp3 aún no existe.
// Aquí solo se le pide que NO lo oculte al terminar, para que la
// frase se pueda leer hasta que Caine diga la siguiente.

async function caineDice(clave) {
  try {
    await reproducirVoz(clave, { ocultarAlFinal: false });
  } catch {
    console.warn(`Audio no disponible: ${clave}`);
  }
}

// ---- Máquina de estados ----
let fase = "PUERTA"; // PUERTA | PREGUNTA | ESCUCHANDO | PROCESANDO | CONFIRMAR | SONRISA | FIN
let fallos = 0;

function indicar(texto) {
  indicacion.textContent = texto;
}

function animar(nombre) {
  // model-viewer reproduce la animación por nombre (contrato con Blender)
  try {
    visor.animationName = nombre;
    visor.play({ repetitions: 1 });
  } catch {
    console.warn(`Animación "${nombre}" no encontrada en ${sala.modelo}`);
  }
}

async function abrirPuerta() {
  if (fase !== "PUERTA") return;
  fase = "PREGUNTA";
  escena?.classList.add("abierta");
  animar(ANIMACIONES.puerta);
  await caineDice("gen_puerta_abierta");
  await hacerPregunta();
}

async function hacerPregunta() {
  fase = "PREGUNTA";
  marcar(null);
  fijarPregunta(TEXTOS[sala.audios.pregunta]);
  await caineDice(sala.audios.pregunta);
  fase = "ESCUCHANDO";
  indicar("🎤 Di tu respuesta en voz alta (o toca «Responder»)");
}

async function procesarRespuesta(dicho) {
  if (fase !== "ESCUCHANDO" || !dicho) return;
  fase = "PROCESANDO"; // bloquea respuestas mientras Caine habla

  if (validarRespuesta(dicho, sala)) {
    marcar("acierto");
    await caineDice(sala.audios.acierto);
    fase = "CONFIRMAR";
    indicar("👍 Pulgar arriba para sellar el trato");
    return;
  }

  // ---- Fallo ----
  fallos++;
  marcar("fallo");
  const abstraido = estado.subirAbstraccion();
  estado.pintarHUD();

  if (abstraido) {
    // Game over suave: reset de la sala (sección 2.2)
    await caineDice("gen_abstraccion_reset");
    estado.resetAbstraccion();
    estado.pintarHUD();
    fallos = 0;
    await hacerPregunta();
    return;
  }

  if (fallos >= 3) {
    // Acto de caridad: Caine regala la respuesta (sección 2.3)
    await caineDice(sala.audios.caridad);
    fase = "ESCUCHANDO";
    indicar("🎤 Repite la respuesta en voz alta");
    return;
  }

  await caineDice(fallos === 1 ? "gen_fallo_1" : "gen_fallo_2");
  await caineDice(sala.audios.pistas[Math.min(fallos - 1, 1)]);
  fase = "ESCUCHANDO";
  indicar("🎤 Inténtalo de nuevo");
}

async function confirmarConPulgar() {
  if (fase !== "CONFIRMAR") return;
  fase = "SONRISA";
  await caineDice("gen_pulgar_confirmar");
  indicar("😄 ¡Sonríe a la cámara para tu recompensa!");
}

async function sonrisaDetectada() {
  if (fase === "SONRISA") {
    fase = "FIN";
    marcar("acierto");
    ocultarPregunta();
    animar(ANIMACIONES.recompensa);
    await caineDice("gen_sonrisa_recompensa");
    estado.darLlave(id);
    estado.pintarHUD(id);
    if (sala.audios.llave) await caineDice(sala.audios.llave);
    indicar("➡️ Pasando a la siguiente sala...");
    await esperar(1200);
    location.href = sala.siguiente;
  } else if (fase === "ESCUCHANDO" || fase === "PREGUNTA") {
    // Sonrisa como defensa: −1 abstracción (sección 2.2)
    if (estado.abstraccion() > 0) {
      estado.bajarAbstraccion();
      estado.pintarHUD();
      caineDice("gen_abstraccion_baja");
    }
  }
}

// ---- Arranque ----
async function iniciar() {
  document.getElementById("btn-iniciar").hidden = true;
  btnResponder.hidden = false;
  indicar("🖐 Muestra tu mano abierta para tocar la puerta");

  const video = document.getElementById("camara");
  try {
    await iniciarGestos(video, {
      manoAbierta: abrirPuerta,
      pulgarArriba: confirmarConPulgar,
      sonrisa: sonrisaDetectada,
    });
  } catch (e) {
    console.warn("Sin cámara — modo botones:", e);
    document.body.classList.add("sin-camara");
    indicar("Sin cámara: usa los botones de abajo");
    document.getElementById("modo-botones").hidden = false;
  }
}

// Botones de respaldo (desarrollo sin cámara / demo de emergencia)
document.getElementById("btn-iniciar").addEventListener("click", iniciar);
btnResponder.addEventListener("click", async () => {
  if (fase !== "ESCUCHANDO") return;
  indicar("🎤 Escuchando...");
  try {
    const dicho = await escucharRespuesta();
    console.log("Reconocido:", dicho);
    if (!dicho) {
      indicar("No te escuché. Inténtalo otra vez o escribe abajo.");
      return;
    }
    procesarRespuesta(dicho);
  } catch (e) {
    console.warn("Voz no disponible:", e);
    indicar("La voz no está disponible. Escribe tu respuesta abajo.");
  }
});
document.getElementById("btn-mano")?.addEventListener("click", abrirPuerta);
document.getElementById("btn-pulgar")?.addEventListener("click", confirmarConPulgar);
document.getElementById("btn-sonrisa")?.addEventListener("click", sonrisaDetectada);

// Entrada por texto de emergencia (Enter en el campo)
document.getElementById("respuesta-texto")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    procesarRespuesta(e.target.value);
    e.target.value = "";
  }
});