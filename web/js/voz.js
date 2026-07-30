// ============================================================
// voz.js — Reconocimiento de voz (Web Speech API), sin depender
// de gestos.js/MediaPipe. Lo usan tanto las salas (gestos.js lo
// reexporta) como el chat de Caine en index.html.
// ============================================================

/**
 * Escucha UNA frase corta en español y la devuelve como texto.
 * @returns {Promise<string>} lo dicho ("" si no entendió)
 */
export async function escucharRespuesta() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    // Navegador sin Web Speech → caja de texto de emergencia
    return prompt("Tu respuesta (di una palabra):") || "";
  }

  // Pedir el permiso de micrófono ANTES de arrancar: si se pide recién en
  // rec.start(), el popup del navegador compite con el temporizador de
  // "sin voz" del reconocimiento, y corta casi de inmediato al aceptar.
  // El stream se mantiene abierto hasta que el reconocimiento termina:
  // cortarlo antes de rec.start() deja la sesión de audio en un estado
  // raro y el reconocimiento se queda esperando para siempre.
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return ""; // permiso denegado o sin micrófono
  }

  return new Promise((resolver) => {
    const terminar = (valor) => {
      stream.getTracks().forEach((t) => t.stop());
      resolver(valor);
    };
    const rec = new SR();
    rec.lang = "es-MX";
    rec.interimResults = false;
    rec.maxAlternatives = 3;
    rec.onresult = (e) => terminar(e.results[0][0].transcript || "");
    rec.onerror = () => terminar("");
    rec.onend = () => terminar("");
    rec.start();
  });
}
