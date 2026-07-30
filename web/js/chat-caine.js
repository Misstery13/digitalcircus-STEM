// ============================================================
// chat-caine.js — Panel de chat con Caine (solo index.html)
// Se abre al hacer click en Caine. El mensaje viaja a la función
// serverless de Vercel (OpenRouter + Fish Audio); la respuesta
// se muestra como texto y se reproduce con su voz.
// ============================================================

import { atenuarMusica } from "./musica.js";
import { escucharRespuesta } from "./voz.js";

// Ruta relativa: Vercel sirve la función serverless en /api/caine-chat
// del mismo dominio que la página, tanto en producción como en preview.
const ENDPOINT = "/api/caine-chat";

const panel = document.getElementById("chat-caine");
const lista = document.getElementById("chat-mensajes");
const form = document.getElementById("chat-form");
const input = document.getElementById("chat-input");
const btnCerrar = document.getElementById("chat-cerrar");
const btnMic = document.getElementById("chat-mic");
const escenaC = document.getElementById("caine-escena");
const botonEnviar = form?.querySelector("button[type=submit]");

let enviando = false;

function agregarMensaje(texto, quien) {
  const p = document.createElement("p");
  p.className = `chat-msg ${quien}`;
  p.textContent = texto;
  lista.appendChild(p);
  lista.scrollTop = lista.scrollHeight;
  return p;
}

async function enviarMensaje(mensaje) {
  agregarMensaje(mensaje, "usuario");
  enviando = true;
  botonEnviar.disabled = true;
  const pensando = agregarMensaje("…", "caine pensando");

  try {
    const resp = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mensaje }),
    });
    const datos = await resp.json();
    pensando.remove();
    if (!resp.ok) throw new Error(datos.error || "Error");
    agregarMensaje(datos.texto, "caine");
    const voz = new Audio(`data:audio/mp3;base64,${datos.audio}`);
    atenuarMusica(true);
    voz.addEventListener("ended", () => atenuarMusica(false));
    voz.play().catch(() => atenuarMusica(false));
  } catch {
    pensando.remove();
    agregarMensaje("Uy, se me cruzaron los cables. Intenta de nuevo, querido.", "caine");
  } finally {
    enviando = false;
    botonEnviar.disabled = false;
  }
}

escenaC?.addEventListener("click", () => {
  panel.classList.add("abierto");
  panel.setAttribute("aria-hidden", "false");
});
btnCerrar?.addEventListener("click", () => {
  panel.classList.remove("abierto");
  panel.setAttribute("aria-hidden", "true");
});
form?.addEventListener("submit", (e) => {
  e.preventDefault();
  const mensaje = input.value.trim();
  if (!mensaje || enviando) return;
  input.value = "";
  enviarMensaje(mensaje);
});

btnMic?.addEventListener("click", async () => {
  if (enviando) return;
  btnMic.disabled = true;
  btnMic.classList.add("escuchando");
  btnMic.textContent = "🔴";
  try {
    const dicho = await escucharRespuesta();
    if (dicho) enviarMensaje(dicho);
  } finally {
    btnMic.disabled = false;
    btnMic.classList.remove("escuchando");
    btnMic.textContent = "🎤";
  }
});
