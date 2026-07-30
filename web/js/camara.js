// ============================================================
// camara.js — Vuelo de cámara (implementación ÚNICA)
//
// La usan index.html y calibrador.html. Al ser el mismo código,
// lo que ensayas en el calibrador es exactamente lo que se ve
// en la portada. No toques este archivo para calibrar: los
// valores viven en vuelo.js.
// ============================================================

const gr = (d) => (d * Math.PI) / 180;

/** "37.7deg 86.6deg 172.87m" → [37.7, 86.6, 172.87] */
export function partes(texto) {
  return String(texto).trim().split(/\s+/).map((v) => parseFloat(v));
}

/** Suavizado: arranca lento, acelera, frena (easeInOutCubic). */
export function suave(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/** Posición real de la cámara en el mundo, a partir de órbita + objetivo. */
export function posicionCamara(orbita, objetivo) {
  const [th, ph, r] = partes(orbita);
  const [tx, ty, tz] = partes(objetivo);
  const t = gr(th), f = gr(ph);
  return {
    x: tx + r * Math.sin(f) * Math.sin(t),
    y: ty + r * Math.cos(f),
    z: tz + r * Math.sin(f) * Math.cos(t),
  };
}

/** De posición de cámara + punto mirado, de vuelta a órbita. */
export function aOrbita(cam, obj) {
  const dx = cam.x - obj.x, dy = cam.y - obj.y, dz = cam.z - obj.z;
  const r = Math.max(Math.hypot(dx, dy, dz), 0.01);
  const ph = (Math.acos(Math.min(Math.max(dy / r, -1), 1)) * 180) / Math.PI;
  const th = (Math.atan2(dx, dz) * 180) / Math.PI;
  return `${th.toFixed(2)}deg ${ph.toFixed(2)}deg ${r.toFixed(3)}m`;
}

/** Coloca la cámara en un encuadre, sin animación. */
export function fijarEncuadre(visor, encuadre) {
  visor.cameraTarget = encuadre.objetivo;
  visor.cameraOrbit = encuadre.orbita;
  visor.fieldOfView = encuadre.fov;
}

/**
 * Vuela entre dos encuadres interpolando la POSICIÓN de la cámara
 * (no la órbita): así el recorrido es recto y no se hunde ni da rodeos.
 */
export function volarTramo(visor, desde, hasta, duracion) {
  const camA = posicionCamara(desde.orbita, desde.objetivo);
  const camB = posicionCamara(hasta.orbita, hasta.objetivo);
  const ta = partes(desde.objetivo), tb = partes(hasta.objetivo);
  const fovA = parseFloat(desde.fov), fovB = parseFloat(hasta.fov);
  const mez = (x, y, k) => x + (y - x) * k;
  const inicio = performance.now();

  return new Promise((resolver) => {
    (function paso(ahora) {
      const t = Math.min((ahora - inicio) / duracion, 1);
      const k = suave(t);

      const cam = {
        x: mez(camA.x, camB.x, k),
        y: mez(camA.y, camB.y, k),
        z: mez(camA.z, camB.z, k),
      };
      const obj = {
        x: mez(ta[0], tb[0], k),
        y: mez(ta[1], tb[1], k),
        z: mez(ta[2], tb[2], k),
      };

      visor.cameraTarget = `${obj.x.toFixed(2)}m ${obj.y.toFixed(2)}m ${obj.z.toFixed(2)}m`;
      visor.cameraOrbit = aOrbita(cam, obj);
      visor.fieldOfView = `${mez(fovA, fovB, k).toFixed(2)}deg`;

      if (t < 1) requestAnimationFrame(paso);
      else resolver();
    })(inicio);
  });
}

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Vuelo completo según la configuración de vuelo.js.
 * Con `medio` son dos tramos (centrarse y entrar); sin él, uno solo.
 */
export async function volarSecuencia(visor, V, alTramo) {
  fijarEncuadre(visor, V.fuera);
  // un fotograma para que el visor asimile el encuadre inicial
  await new Promise((r) => requestAnimationFrame(r));

  if (V.medio) {
    alTramo?.(1);
    await volarTramo(visor, V.fuera, V.medio, V.duracionCentrado ?? 2600);
    await esperar(V.pausaEnMedio ?? 350);
    alTramo?.(2);
    await volarTramo(visor, V.medio, V.dentro, V.duracionEntrada ?? 3000);
  } else {
    alTramo?.(1);
    await volarTramo(visor, V.fuera, V.dentro, V.duracion ?? 5000);
  }
  alTramo?.(0);
}

/** Esconde materiales del modelo por nombre (p. ej. la cúpula). */
export function ocultarMateriales(visor, nombres = []) {
  if (!nombres.length) return;
  for (const mat of visor.model?.materials || []) {
    if (nombres.includes(mat.name)) {
      const c = mat.pbrMetallicRoughness.baseColorFactor;
      mat.setAlphaMode("BLEND");
      mat.pbrMetallicRoughness.setBaseColorFactor([c[0], c[1], c[2], 0]);
    }
  }
}