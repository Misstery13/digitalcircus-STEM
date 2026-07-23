// ============================================================
// estado.js — Llaves + abstracción (sessionStorage)
// El estado sobrevive entre páginas de la misma sesión,
// tal como pide la sección 5 del documento de diseño.
// ============================================================

import { ABSTRACCION_MAX } from "./config-salas.js";

const K_LLAVES = "dc_llaves";
const K_ABSTRACCION = "dc_abstraccion";
const TOTAL_SALAS = 5;

// ---- Llaves ----

export function llaves() {
  try {
    const l = JSON.parse(sessionStorage.getItem(K_LLAVES));
    return Array.isArray(l) ? l.map(Number) : [];
  } catch {
    return [];
  }
}

export function tieneLlave(idSala) {
  return llaves().includes(Number(idSala));
}

export function darLlave(idSala) {
  const id = Number(idSala);
  const l = llaves();
  if (!l.includes(id)) {
    l.push(id);
    sessionStorage.setItem(K_LLAVES, JSON.stringify(l));
  }
  return l.length;
}

export function totalLlaves() {
  return llaves().length;
}

export function todasLasLlaves() {
  return llaves().length >= TOTAL_SALAS;
}

// ---- Abstracción ----

export function abstraccion() {
  return parseInt(sessionStorage.getItem(K_ABSTRACCION) || "0", 10);
}

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

// ---- Reinicio total (demo y pruebas) ----

export function resetTodo() {
  sessionStorage.removeItem(K_LLAVES);
  sessionStorage.setItem(K_ABSTRACCION, "0");
  pintarHUD();
}

// ---- Efecto visual (CSS por nivel, sin tocar los modelos 3D) ----

export function aplicarGlitch() {
  document.body.dataset.abstraccion = String(abstraccion());
}

// ---- HUD compartido (llaves + barra de abstracción) ----

export function pintarHUD(idNueva = null) {
  const contLlaves = document.getElementById("hud-llaves");
  if (contLlaves) {
    const ganadas = llaves();
    contLlaves.innerHTML = Array.from({ length: TOTAL_SALAS }, (_, i) => {
      const id = i + 1;
      const tiene = ganadas.includes(id);
      const nueva = tiene && id === Number(idNueva) ? " nueva" : "";
      const estado = tiene ? "obtenida" : "pendiente";
      return `<span class="llave ${tiene ? "ganada" : ""}${nueva}" role="img" aria-label="Llave de la sala ${id}: ${estado}">🗝</span>`;
    }).join("");
    contLlaves.setAttribute("aria-label", `${ganadas.length} de ${TOTAL_SALAS} llaves obtenidas`);
  }

  const barra = document.getElementById("hud-abstraccion");
  if (barra) {
    barra.style.setProperty("--nivel", abstraccion());
    barra.style.setProperty("--nivel-max", ABSTRACCION_MAX);
    barra.setAttribute("aria-valuenow", String(abstraccion()));
    barra.setAttribute("aria-valuemax", String(ABSTRACCION_MAX));
  }

  aplicarGlitch();
}