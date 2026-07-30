// ============================================================
// gestos.js — MediaPipe en el navegador (sección 3 del diseño)
//   Mano abierta  → Open_Palm   → abrir puerta
//   Pulgar arriba → Thumb_Up    → confirmar respuesta
//   Sonrisa       → blendshape mouthSmile → recompensa / −abstracción
//
// Usa @mediapipe/tasks-vision desde CDN (sin build step).
// ============================================================

import {
  FilesetResolver,
  GestureRecognizer,
  FaceLandmarker,
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14";

const WASM =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODELO_GESTOS =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const MODELO_ROSTRO =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

const UMBRAL_SONRISA = 0.55;   // blendshape mouthSmileLeft/Right
const FRAMES_SOSTENIDOS = 8;   // el gesto debe sostenerse ~8 frames
const COOLDOWN_MS = 2500;      // tras disparar, ignora ese gesto un rato

/**
 * Inicia cámara + detección continua.
 * @param {HTMLVideoElement} video
 * @param {Object} on  callbacks: { manoAbierta, pulgarArriba, sonrisa }
 * @returns {Promise<{detener: Function}>}
 */
export async function iniciarGestos(video, on = {}) {
  // 1. Cámara
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: 640, height: 480 },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  // 2. Modelos
  const vision = await FilesetResolver.forVisionTasks(WASM);
  const [gestos, rostro] = await Promise.all([
    GestureRecognizer.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELO_GESTOS, delegate: "GPU" },
      runningMode: "VIDEO",
      numHands: 1,
    }),
    FaceLandmarker.createFromOptions(vision, {
      baseOptions: { modelAssetPath: MODELO_ROSTRO, delegate: "GPU" },
      runningMode: "VIDEO",
      outputFaceBlendshapes: true,
      numFaces: 1,
    }),
  ]);

  // 3. Bucle de detección con sostenido + cooldown
  const contador = { Open_Palm: 0, Thumb_Up: 0, sonrisa: 0 };
  const ultimoDisparo = { Open_Palm: 0, Thumb_Up: 0, sonrisa: 0 };
  let activo = true;

  function disparar(nombre, cb) {
    const ahora = performance.now();
    if (ahora - ultimoDisparo[nombre] < COOLDOWN_MS) return;
    ultimoDisparo[nombre] = ahora;
    contador[nombre] = 0;
    if (cb) cb();
  }

  function cuadro() {
    if (!activo) return;
    const t = performance.now();

    // Manos
    const rg = gestos.recognizeForVideo(video, t);
    const gesto = rg.gestures?.[0]?.[0];
    for (const nombre of ["Open_Palm", "Thumb_Up"]) {
      if (gesto?.categoryName === nombre && gesto.score > 0.6) {
        contador[nombre]++;
        if (contador[nombre] >= FRAMES_SOSTENIDOS) {
          disparar(nombre, nombre === "Open_Palm" ? on.manoAbierta : on.pulgarArriba);
        }
      } else {
        contador[nombre] = 0;
      }
    }

    // Rostro (sonrisa)
    const rf = rostro.detectForVideo(video, t);
    const bs = rf.faceBlendshapes?.[0]?.categories || [];
    const izq = bs.find((c) => c.categoryName === "mouthSmileLeft")?.score || 0;
    const der = bs.find((c) => c.categoryName === "mouthSmileRight")?.score || 0;
    if ((izq + der) / 2 > UMBRAL_SONRISA) {
      contador.sonrisa++;
      if (contador.sonrisa >= FRAMES_SOSTENIDOS) disparar("sonrisa", on.sonrisa);
    } else {
      contador.sonrisa = 0;
    }

    requestAnimationFrame(cuadro);
  }
  requestAnimationFrame(cuadro);

  return {
    detener() {
      activo = false;
      stream.getTracks().forEach((tr) => tr.stop());
    },
  };
}

// Reconocimiento de voz: vive en voz.js (sin dependencia de MediaPipe),
// se reexporta acá para no tocar los archivos que ya lo importan de gestos.js.
export { escucharRespuesta } from "./voz.js";
