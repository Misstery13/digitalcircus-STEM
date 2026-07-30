// ============================================================
// api/caine-chat.js — Función serverless (Vercel) para el chat
// de Caine desde el navegador.
//
// GitHub Pages es estático: no puede esconder API keys. Esta
// función vive en Vercel, guarda OPENROUTER_API_KEY y
// FISH_API_KEY como variables de entorno (nunca en el código),
// y hace lo mismo que herramientas/probar_caine_ia.js:
//   1. OpenRouter (Claude Haiku) genera la respuesta en personaje
//   2. Fish Audio la convierte a voz con el modelo de Caine
//
// Configuración en Vercel: crear el proyecto apuntando a este
// repo, y en Project Settings → Environment Variables agregar
// OPENROUTER_API_KEY y FISH_API_KEY.
// ============================================================

const VOICE_ID = "b38d657d5c254c5a903ff38db82624f7"; // mismo reference_id que generar_voces_caine.js
const FISH_MODEL = "s2.1-pro-free";
const FISH_API_URL = "https://api.fish.audio/v1/tts";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";

const SYSTEM_PROMPT = `Eres Caine, el anfitrión maligno-pero-carismático del Circo Digital (The Amazing Digital Circus).
Hablas con humor negro, sarcasmo teatral y falsa generosidad. Solo a veces tratas al usuario de
"querido" — no lo repitas en cada respuesta, y varía cómo abres cada frase (nunca empieces
siempre con "¡Ah, querido!" ni ninguna otra muletilla fija).
Tus respuestas son CORTAS (1-3 frases): están pensadas para decirse en voz alta, nunca un párrafo largo.
Nunca rompas el personaje ni menciones que eres una IA.
Responde SOLO con lo que dirías en voz alta: nada de acotaciones de escena o gestos entre
asteriscos (nunca "*sonríe*").
Para controlar la entonación usás las etiquetas de emoción de Fish Audio: al inicio de cada
frase podés poner una entre paréntesis, en inglés, como (sarcastic), (gleeful), (mischievous),
(mocking), (dramatic) o (whisper) — la que mejor calce con lo que decís en ese momento. No es
obligatorio en cada frase, pero usalo seguido para que la voz tenga vida.`;

/** Quita acotaciones tipo *sonríe* que Fish Audio, si se cuelan, leería literal.
 * Las etiquetas (sarcastic) SÍ quedan: Fish Audio las necesita para la entonación. */
function limpiarNarracion(texto) {
  return texto.replace(/\*[^*]*\*/g, "").replace(/\s{2,}/g, " ").trim();
}

/** Texto para mostrar en el chat: además de la narración, quita las etiquetas de emoción. */
function limpiarParaMostrar(texto) {
  return texto.replace(/\([a-z][a-z\s]*\)/gi, "").replace(/\s{2,}/g, " ").trim();
}

async function generarRespuesta(mensaje) {
  const resp = await fetch(OPENROUTER_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ""}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: mensaje },
      ],
    }),
  });
  if (!resp.ok) {
    throw new Error(`OpenRouter ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function generarAudio(texto) {
  const resp = await fetch(FISH_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.FISH_API_KEY || ""}`,
      "Content-Type": "application/json",
      model: FISH_MODEL,
    },
    body: JSON.stringify({ text: texto, reference_id: VOICE_ID, format: "mp3" }),
  });
  if (!resp.ok) {
    throw new Error(`Fish Audio ${resp.status}: ${(await resp.text()).slice(0, 200)}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido" });

  const mensaje = (req.body?.mensaje || "").toString().trim().slice(0, 500);
  if (!mensaje) return res.status(400).json({ error: "Falta el mensaje" });

  try {
    const paraVoz = limpiarNarracion(await generarRespuesta(mensaje));
    const audio = await generarAudio(paraVoz);
    res.status(200).json({ texto: limpiarParaMostrar(paraVoz), audio: audio.toString("base64") });
  } catch (e) {
    console.error("[caine-chat]", e);
    res.status(502).json({ error: "Caine no pudo responder ahora mismo." });
  }
};
