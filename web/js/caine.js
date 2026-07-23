// ============================================================
// caine.js — Encuadre y vida de Caine
//
// El encuadre se calcula a partir del TAMAÑO REAL del modelo,
// así que funciona sin saber su escala. Los ajustes de abajo son
// proporciones (0..1), no metros.
//
// El modelo llega en pose T y sin animaciones: el movimiento se
// genera aquí — flota, se balancea, y rebota al hablar.
// ============================================================

export const CAINE = {
  // ── ENCUADRE EXACTO (opcional) ──
  // Si rellenas estos tres, mandan sobre el cálculo automático.
  // Sácalos de:  calibrador.html?modelo=caine_tadc.glb
  // Déjalos en null para que el encuadre se calcule solo.
  orbita:   null,   // ej: "12.4deg 72.0deg 18.30m"
  objetivo: null,   // ej: "0.00m 7.44m 0.00m"

  // ── ENCUADRE AUTOMÁTICO (si los de arriba están en null) ──
  altura:    0.62,   // 0 = a los pies · 0.5 = al centro · 1 = a la coronilla
  distancia: 1.35,   // 1.0 = justo encajado · más alto = más lejos
  giro:      0,      // grados: si le ves la espalda, prueba 180
  inclinacion: 72,   // 90 = a su altura · menos = mirándolo desde arriba
  fov:       "35deg",

  // ── VIDA (pon 0 para desactivar cualquiera) ──
  balanceo:   6,     // grados que gira de lado a lado
  cabeceo:    2,     // grados que sube y baja
  periodo:    5200,  // ms de un ciclo completo
  flotacion:  14,    // píxeles que sube y baja
  rebote:     0.09,  // cuánto crece al hablar (0.09 = 9%)
  sacudida:   1.4,   // grados de temblor al hablar
};

/**
 * Calcula el encuadre a partir del tamaño real del modelo.
 * Devuelve {orbita, objetivo, fov} o null si el modelo no ha cargado.
 */
export function encuadreAutomatico(visor, cfg = CAINE) {
  // Encuadre exacto puesto a mano: tiene prioridad
  if (cfg.orbita && cfg.objetivo) {
    const r = parseFloat(String(cfg.orbita).trim().split(/\s+/)[2]);
    return { orbita: cfg.orbita, objetivo: cfg.objetivo, fov: cfg.fov,
             _dim: null, _radio: r, _manual: true };
  }
  let dim, centro;
  try {
    dim = visor.getDimensions();
    centro = visor.getBoundingBoxCenter();
  } catch {
    return null;
  }
  if (!dim || !dim.y) return null;

  // Punto mirado: a la altura elegida dentro de la caja del modelo
  const baseY = centro.y - dim.y / 2;
  const objY = baseY + dim.y * cfg.altura;

  // Distancia: proporcional al lado mayor, para que siempre quepa
  const mayor = Math.max(dim.x, dim.y, dim.z);
  const radio = mayor * cfg.distancia;

  return {
    orbita: `${cfg.giro}deg ${cfg.inclinacion}deg ${radio.toFixed(3)}m`,
    objetivo: `${centro.x.toFixed(3)}m ${objY.toFixed(3)}m ${centro.z.toFixed(3)}m`,
    fov: cfg.fov,
    _dim: dim,
    _radio: radio,
  };
}

/** Coloca a Caine en su encuadre. */
export function encuadrarCaine(visor, cfg = CAINE) {
  const e = encuadreAutomatico(visor, cfg);
  if (!e) {
    console.warn("[caine] no pude medir el modelo; dejo el encuadre por defecto");
    return null;
  }
  visor.cameraTarget = e.objetivo;
  visor.cameraOrbit = e.orbita;
  visor.fieldOfView = e.fov;
  if (e._manual) {
    console.log(`[caine] encuadre manual: ${e.orbita} · mira a ${e.objetivo}`);
  } else {
    console.log(
      `[caine] tamaño ${e._dim.x.toFixed(1)} x ${e._dim.y.toFixed(1)} x ${e._dim.z.toFixed(1)}` +
      ` → cámara a ${e._radio.toFixed(1)}m`);
  }
  return e;
}

/**
 * Le da vida. Devuelve `hablar(intensidad)` para que el rebote
 * siga el volumen real de su voz.
 */
export function animarCaine(visor, contenedor, cfg = CAINE) {
  const e = encuadreAutomatico(visor, cfg);
  // Con encuadre manual, el balanceo parte de los ángulos calibrados
  let th0 = cfg.giro, ph0 = cfg.inclinacion;
  if (e && e._manual) {
    const p = String(e.orbita).trim().split(/\s+/).map(parseFloat);
    th0 = p[0]; ph0 = p[1];
  }
  const r0 = e ? e._radio : null;

  let intensidad = 0, objetivoIntensidad = 0;

  (function ciclo(ahora) {
    const t = (ahora % cfg.periodo) / cfg.periodo;
    const ang = t * Math.PI * 2;

    intensidad += (objetivoIntensidad - intensidad) * 0.25;

    if (r0) {
      const th = th0 + Math.sin(ang) * cfg.balanceo;
      const ph = ph0 + Math.sin(ang * 1.7) * cfg.cabeceo;
      visor.cameraOrbit = `${th.toFixed(2)}deg ${ph.toFixed(2)}deg ${r0.toFixed(3)}m`;
    }

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

  return (valor) => { objetivoIntensidad = Math.min(Math.max(valor, 0), 1); };
}