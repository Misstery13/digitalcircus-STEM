// ============================================================
// caine.js — Encuadre y vida de Caine
//
// El modelo viene en pose T y sin animaciones, así que el
// movimiento se genera aquí: flota, se balancea, mira alrededor
// y rebota al hablar. Todo por código, sin tocar Blender.
//
// PARA AJUSTAR EL ENCUADRE:
//   abre  calibrador.html?modelo=caine_tadc.glb
//   coloca la cámara sobre su cabeza, mira la lectura de arriba
//   y copia esos tres valores aquí abajo.
// ============================================================

export const CAINE = {
  // Encuadre: por defecto, plano cerrado a la cabeza para que los
  // brazos en cruz de la pose T queden fuera de cuadro.
  orbita:   "0deg 85deg 2.2m",
  objetivo: "0m 1.5m 0m",     // altura del punto mirado: sube si ves el cuerpo
  fov:      "32deg",

  // Vida (pon un valor en 0 para desactivar ese movimiento)
  balanceo:   7,     // grados que gira de lado a lado
  cabeceo:    2.5,   // grados que sube y baja la mirada
  periodo:    5200,  // ms que tarda un ciclo completo de balanceo
  flotacion:  14,    // píxeles que sube y baja
  rebote:     0.10,  // cuánto crece al hablar (0.10 = 10%)
  sacudida:   1.6,   // grados de temblor al hablar
};

/** Coloca a Caine en su encuadre inicial. */
export function encuadrarCaine(visor, cfg = CAINE) {
  visor.cameraTarget = cfg.objetivo;
  visor.cameraOrbit = cfg.orbita;
  visor.fieldOfView = cfg.fov;
}

/**
 * Le da vida: órbita lenta alrededor de la cabeza + flotación.
 * Devuelve una función `hablar(intensidad)` para que el rebote
 * siga el volumen real de su voz.
 */
export function animarCaine(visor, contenedor, cfg = CAINE) {
  const base = visor.cameraOrbit || cfg.orbita;
  const [th0, ph0, r0] = String(base).trim().split(/\s+/).map(parseFloat);

  let intensidad = 0;
  let objetivoIntensidad = 0;

  (function ciclo(ahora) {
    const t = (ahora % cfg.periodo) / cfg.periodo;   // 0..1
    const ang = t * Math.PI * 2;

    // Suavizar la intensidad de voz: evita saltos bruscos
    intensidad += (objetivoIntensidad - intensidad) * 0.25;

    // La cámara orbita muy despacio: parece que Caine se gira
    const th = th0 + Math.sin(ang) * cfg.balanceo;
    const ph = ph0 + Math.sin(ang * 1.7) * cfg.cabeceo;
    visor.cameraOrbit = `${th.toFixed(2)}deg ${ph.toFixed(2)}deg ${r0}m`;

    // Flotación y reacción al habla, sobre el contenedor
    if (contenedor) {
      const subida = Math.sin(ang * 2) * cfg.flotacion;
      const escala = 1 + intensidad * cfg.rebote;
      const giro = (Math.random() - 0.5) * intensidad * cfg.sacudida;
      contenedor.style.transform =
        `translateY(${subida.toFixed(1)}px) scale(${escala.toFixed(3)}) rotate(${giro.toFixed(2)}deg)`;
      contenedor.classList.toggle("hablando", intensidad > 0.06);
    }

    requestAnimationFrame(ciclo);
  })(performance.now());

  return function hablar(valor) {
    objetivoIntensidad = Math.min(Math.max(valor, 0), 1);
  };
}