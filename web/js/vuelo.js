// ============================================================
// vuelo.js — Encuadres de la cámara de entrada
//
// ESTE ARCHIVO ES TUYO. Contiene los valores que sacaste con
// calibrador.html. Ningún otro archivo del proyecto lo pisa.
//
// El vuelo tiene DOS TRAMOS:
//   fuera → medio    la cámara se centra en la carpa, todavía lejos
//   medio → dentro   empuja hacia la carpa en línea recta
//
// Si borras el bloque `medio`, el vuelo vuelve a ser de un solo tramo.
// ============================================================

export const VUELO = {
  // 1 · Punto de partida: el circo entero visto desde fuera
  fuera: {
    orbita:   "33.4deg 88.7deg 200.00m",
    objetivo: "-24.95m 9.85m -15.46m",
    fov:      "30.0deg",
  },

  // 2 · Centrada en la carpa, todavía a distancia
  medio: {
    orbita:   "60.6deg 87.9deg 92.72m",
    objetivo: "-18.79m 25.91m -8.23m",
    fov:      "13.5deg",
  },

  // 3 · Llegada: pegada a la carpa, justo antes de que caiga el telón
  dentro: {
    orbita:   "60.6deg 87.9deg 7.85m",
    objetivo: "-41.55m 13.87m -24.48m",
    fov:      "4.6deg",
  },

  // Reparto del tiempo entre los dos tramos (milisegundos)
  duracionCentrado: 2600,   // fuera → medio
  duracionEntrada:  3000,   // medio → dentro
  pausaEnMedio:      350,   // respiro al terminar de centrarse

  // Materiales del modelo que deben esconderse (p. ej. la cúpula).
  ocultar: [],
};