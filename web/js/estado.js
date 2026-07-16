// ============================================================
// estado.js — Llaves + abstracción (sessionStorage)
// El estado sobrevive entre páginas de la misma sesión,
// tal como pide la sección 5 del documento de diseño.
// ============================================================

import { ABSTRACCION_MAX } from "./config-salas.js";

const K_LLAVES = "dc_llaves";        // JSON array de ids de sala: [1,2,...]
const K_ABSTRACCION = "dc_abstraccion"; // int 0..4

// ---- Llaves ----

export function llaves() {
  try {
    return JSON.parse(sessionStorage.getItem(K_LLAVES)) || [];
  } catch {
    return [];
  }
}

export function tieneLlave(idSala) {
  return llaves().includes(idSala);
}

export function darLlave(idSala) {
  const l = llaves();
  if (!l.includes(idSala)) {
    l.push(idSala);
    sessionStorage.setItem(K_LLAVES, JSON.stringify(l));
  }
  return l.length;
}

// ---- Abstracción ----

export function abstraccion() {
  return parseInt(sessionStorage.getItem(K_ABSTRACCION) || "0", 10);
}

/** +1 abstracción. Devuelve true si el usuario "se abstrajo" (llegó al máximo). */
export function subirAbstraccion() {
  const n = Math.min(abstraccion() + 1, ABSTRACCION_MAX);
  sessionStorage.setItem(K_ABSTRACCION, String(n));
  aplicarGlitch();
  return n >= ABSTRACCION_MAX;
}

export function bajarAbstraccion() {
  const n = Math.max(abstraccion() - 1, 0);
  sessionStorage.setItem(K_ABSTRACCION, String(n));
  aplicarGlitch();
  return n;
}

export function resetAbstraccion() {
  sessionStorage.setItem(K_ABSTRACCION, "0");
  aplicarGlitch();
}

// ---- Efecto visual (CSS por nivel, sin tocar los modelos 3D) ----

export function aplicarGlitch() {
  document.body.dataset.abstraccion = String(abstraccion());
}

// ---- HUD compartido (llaves + barra de abstracción) ----

export function pintarHUD() {
  const contLlaves = document.getElementById("hud-llaves");
  if (contLlaves) {
    const n = llaves().length;
    contLlaves.innerHTML = Array.from({ length: 5 }, (_, i) =>
      `<span class="llave ${i < n ? "ganada" : ""}">🗝</span>`
    ).join("");
  }
  const barra = document.getElementById("hud-abstraccion");
  if (barra) {
    barra.style.setProperty("--nivel", abstraccion());
    barra.setAttribute("aria-valuenow", String(abstraccion()));
  }
  aplicarGlitch();
}
