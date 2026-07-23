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

import { SALAS, ANIMACIONES, validarRespuesta } from "./config-salas.js";
import * as estado from "./estado.js";
import { caineDice } from "./audio-caine.js";
import { iniciarGestos, escucharRespuesta } from "./gestos.js";

const id = parseInt(new URLSearchParams(location.search).get("id") || "1", 10);
const sala = SALAS[id];
if (!sala) location.href = "index.html";

// ---- DOM ----
const visor = document.getElementById("visor3d");
const btnResponder = document.getElementById("btn-responder");
const indicacion = document.getElementById("indicacion");

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

// ---- Máquina de estados ----
let fase = "PUERTA"; // PUERTA | PREGUNTA | ESCUCHANDO | CONFIRMAR | SONRISA | FIN
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
  document.getElementById("escena-sala")?.classList.add("abierta");
  animar(ANIMACIONES.puerta);
  await caineDice("gen_puerta_abierta");
  await hacerPregunta();
}

async function hacerPregunta() {
  fase = "PREGUNTA";
  await caineDice(sala.audios.pregunta);
  fase = "ESCUCHANDO";
  indicar("🎤 Di tu respuesta en voz alta (o toca «Responder»)");
}

async function procesarRespuesta(dicho) {
  if (fase !== "ESCUCHANDO" || !dicho) return;

  if (validarRespuesta(dicho, sala)) {
    fase = "CONFIRMAR";
    await caineDice(sala.audios.acierto);
    indicar("👍 Pulgar arriba para sellar el trato");
    return;
  }

  // ---- Fallo ----
  fallos++;
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
    indicar("🎤 Repite la respuesta en voz alta");
    return; // sigue en ESCUCHANDO; ahora sí acertará
  }

  await caineDice(fallos === 1 ? "gen_fallo_1" : "gen_fallo_2");
  await caineDice(sala.audios.pistas[Math.min(fallos - 1, 1)]);
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
    animar(ANIMACIONES.recompensa);
    await caineDice("gen_sonrisa_recompensa");
    estado.darLlave(id);
    estado.pintarHUD(id);
    if (sala.audios.llave) await caineDice(sala.audios.llave);
    indicar("➡️ Pasando a la siguiente sala...");
    setTimeout(() => (location.href = sala.siguiente), 2000);
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
    indicar("Sin cámara: usa los botones de abajo");
    document.getElementById("modo-botones").hidden = false;
  }
}

// Botones de respaldo (desarrollo sin cámara / demo de emergencia)
document.getElementById("btn-iniciar").addEventListener("click", iniciar);
btnResponder.addEventListener("click", async () => {
  const dicho = await escucharRespuesta();
  procesarRespuesta(dicho);
});
document.getElementById("btn-mano")?.addEventListener("click", abrirPuerta);
document.getElementById("btn-pulgar")?.addEventListener("click", confirmarConPulgar);
document.getElementById("btn-sonrisa")?.addEventListener("click", sonrisaDetectada);

// Entrada por texto de emergencia (Enter en el campo)
document.getElementById("respuesta-texto")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") procesarRespuesta(e.target.value);
});