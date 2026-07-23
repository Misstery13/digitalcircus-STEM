// ============================================================
// confeti.js — capa decorativa de confeti cayendo (fondo)
// Usa la paleta de la carpa: rojo, dorado, turquesa, morado, magenta.
// No interfiere con clics (pointer-events: none) ni con el layout.
// ============================================================

const COLORES = [
  "var(--rojo-carpa)",
  "var(--dorado)",
  "var(--turquesa)",
  "var(--morado)",
  "var(--magenta)",
];

export function iniciarConfeti(cantidad = 22) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const capa = document.createElement("div");
  capa.className = "confeti-capa";
  capa.setAttribute("aria-hidden", "true");
  document.body.appendChild(capa);

  for (let i = 0; i < cantidad; i++) {
    const pieza = document.createElement("span");
    pieza.className = "confeti-pieza";
    pieza.style.left = Math.random() * 100 + "%";
    pieza.style.background = COLORES[i % COLORES.length];
    pieza.style.animationDuration = 8 + Math.random() * 10 + "s";
    pieza.style.animationDelay = Math.random() * 10 + "s";
    pieza.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
    capa.appendChild(pieza);
  }
}