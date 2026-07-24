// ============================================================
// caine.js — Modelo, encuadre y vida de Caine
//
// Todo lo ajustable de Caine vive en el bloque CAINE de abajo:
// qué archivo cargar, cómo encuadrarlo y cómo se mueve.
// No hace falta tocar index.html para nada de esto.
// ============================================================

export const CAINE = {
  // ── ARCHIVO Y ANIMACIONES ────────────────────────────────
  // Nombre del .glb dentro de web/modelos/
  archivo: "caine_animado2.glb",

  // Animaciones horneadas en el .glb (herramientas/animar_caine.py).
  // Déjalas en null si el modelo no tiene animaciones: entonces solo
  // actúa el movimiento procedural de más abajo.
  animQuieto:  null,
  animHablando: null,
  umbralHabla: 0.05,   // a partir de qué volumen cambia a "hablando"

  // ── ENCUADRE EXACTO (opcional) ───────────────────────────
  // Si rellenas estos dos, mandan sobre el cálculo automático.
  // Sácalos de:  calibrador.html?modelo=caine_tadc.glb
  // Déjalos en null para que se calcule solo.
  orbita:   null,   // ej: "12.4deg 72.0deg 18.30m"
  objetivo: null,   // ej: "0.00m 7.44m 0.00m"

  // ── ENCUADRE AUTOMÁTICO (si los de arriba están en null) ──
  // Son proporciones respecto al tamaño real del modelo, no metros,
  // así que funcionan sea cual sea la escala del .glb.
  altura:      0.5,  // 0 = a los pies · 0.5 = al centro · 1 = a la coronilla
  distancia:   3,  // 1.0 = justo encajado · más alto = más lejos
  giro:        0,     // grados: si le ves la espalda, prueba 180
  inclinacion: 72,    // 90 = a su altura · menos = mirándolo desde arriba
  fov:         "35deg",

  // ── VIDA EN REPOSO (pon 0 para desactivar cualquiera) ────
  // El rig de este modelo viene con matrices de vinculación corruptas
  // (ACCESSOR_INVALID_IBM), así que no se puede animar por huesos.
  // Todo el movimiento sale de aquí. Si algún día se cambia por un
  // modelo sano, baja estos valores para que acompañen a su animación.
  balanceo:   6,      // grados que gira de lado a lado
  cabeceo:    2,      // grados que sube y baja
  periodo:    5200,   // ms de un ciclo completo
  flotacion:  14,     // píxeles que sube y baja
  respiracion: 0.012, // cuánto se hincha al "respirar"

  // ── AL HABLAR ────────────────────────────────────────────
  rebote:     0.07,   // cuánto crece con el volumen
  compresion: 0.05,   // achatarse y estirarse (lo que más lee como habla)
  golpe:      13,     // píxeles del cabezazo en cada sílaba
  sacudida:   1.2,    // grados de temblor
  giroHabla:  4,      // grados extra de balanceo mientras habla
  ataque:     0.45,   // 0..1 · qué rápido reacciona al subir el volumen
  caida:      0.14,   // 0..1 · qué rápido se relaja al bajar
};

/**
 * Calcula el encuadre. Si CAINE.orbita y CAINE.objetivo están puestos,
 * los usa tal cual; si no, los deriva del tamaño real del modelo.
 * Devuelve null si el modelo aún no ha cargado.
 */
export function encuadreAutomatico(visor, cfg = CAINE) {
  // Encuadre puesto a mano: tiene prioridad
  if (cfg.orbita && cfg.objetivo) {
    const r = parseFloat(String(cfg.orbita).trim().split(/\s+/)[2]);
    return {
      orbita: cfg.orbita, objetivo: cfg.objetivo, fov: cfg.fov,
      _radio: r, _manual: true, _dim: null,
    };
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

  // Distancia proporcional al lado mayor, para que siempre quepa
  const mayor = Math.max(dim.x, dim.y, dim.z);
  const radio = mayor * cfg.distancia;

  return {
    orbita: `${cfg.giro}deg ${cfg.inclinacion}deg ${radio.toFixed(3)}m`,
    objetivo: `${centro.x.toFixed(3)}m ${objY.toFixed(3)}m ${centro.z.toFixed(3)}m`,
    fov: cfg.fov,
    _radio: radio, _manual: false, _dim: dim,
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
      `[caine] tamaño ${e._dim.x.toFixed(1)} x ${e._dim.y.toFixed(1)} x ` +
      `${e._dim.z.toFixed(1)} → cámara a ${e._radio.toFixed(1)}m`);
  }
  return e;
}

/**
 * Le da vida: la cámara orbita despacio (parece que se gira),
 * flota, y rebota al hablar.
 * Devuelve `hablar(intensidad)` para alimentarlo con el volumen de su voz.
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

  // ── Cambio entre animación quieta y hablando ──
  const disponibles = visor.availableAnimations || [];
  const tieneQuieto = cfg.animQuieto && disponibles.includes(cfg.animQuieto);
  const tieneHabla = cfg.animHablando && disponibles.includes(cfg.animHablando);
  let pistaActual = null;

  function ponerPista(nombre) {
    if (!nombre || nombre === pistaActual) return;
    pistaActual = nombre;
    visor.animationName = nombre;
    visor.play();
    console.log("[caine] animación →", nombre);
  }
  if (tieneQuieto) ponerPista(cfg.animQuieto);
  else if (disponibles.length) ponerPista(disponibles[0]);

  if (!disponibles.length) {
    console.log("[caine] el modelo no trae animaciones; solo movimiento procedural");
  }

  let nivel = 0;        // volumen suavizado (envolvente)
  let entrada = 0;      // último valor recibido
  let anterior = 0;     // para detectar subidas bruscas = sílabas
  let golpe = 0;        // impulso del cabezazo, se apaga solo
  let gesto = 0;        // balanceo extra, se apaga solo

  (function ciclo(ahora) {
    const t = (ahora % cfg.periodo) / cfg.periodo;
    const ang = t * Math.PI * 2;

    // Envolvente asimétrica: sube rápido, baja despacio.
    // Así el movimiento acompaña al ataque de cada palabra en vez
    // de arrastrarse por detrás del audio.
    const k = entrada > nivel ? cfg.ataque : cfg.caida;
    nivel += (entrada - nivel) * k;

    // Sílaba: un salto brusco de volumen dispara un cabezazo
    const salto = entrada - anterior;
    if (salto > 0.11) {
      golpe = Math.min(golpe + salto * 2.2, 1);
      gesto = Math.min(gesto + salto * 1.6, 1);
    }
    anterior = entrada;
    golpe *= 0.86;   // el impulso se apaga en ~0.4 s
    gesto *= 0.94;

    // Alternar entre la animación de reposo y la de habla
    if (tieneHabla && tieneQuieto) {
      ponerPista(nivel > cfg.umbralHabla ? cfg.animHablando : cfg.animQuieto);
    }

    if (r0) {
      const th = th0 + Math.sin(ang) * cfg.balanceo
                     + Math.sin(ahora / 190) * gesto * cfg.giroHabla;
      const ph = ph0 + Math.sin(ang * 1.7) * cfg.cabeceo;
      visor.cameraOrbit = `${th.toFixed(2)}deg ${ph.toFixed(2)}deg ${r0.toFixed(3)}m`;
    }

    if (contenedor) {
      // Flotación en reposo + cabezazo de sílaba
      const subida = Math.sin(ang * 2) * cfg.flotacion - golpe * cfg.golpe;

      // Respiración lenta cuando calla
      const respira = Math.sin(ahora / 1500) * cfg.respiracion * (1 - nivel);

      // Compresión: al hablar se achata y se ensancha. Es lo que más
      // lee como "está diciendo algo" en una figura sin boca animada.
      const esc = 1 + nivel * cfg.rebote + respira;
      const escX = esc * (1 + nivel * cfg.compresion);
      const escY = esc * (1 - nivel * cfg.compresion * 0.8);

      const giro = (Math.random() - 0.5) * nivel * cfg.sacudida;

      contenedor.style.transform =
        `translateY(${subida.toFixed(1)}px) ` +
        `scale(${escX.toFixed(4)}, ${escY.toFixed(4)}) ` +
        `rotate(${giro.toFixed(2)}deg)`;
      contenedor.classList.toggle("hablando", nivel > 0.06);
    }

    requestAnimationFrame(ciclo);
  })(performance.now());

  return (valor) => { entrada = Math.min(Math.max(valor, 0), 1); };
}