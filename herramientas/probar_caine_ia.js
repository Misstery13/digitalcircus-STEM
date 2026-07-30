#!/usr/bin/env node
/**
 * Prueba de concepto: Caine con IA conversacional (OpenRouter) + voz (Fish Audio)
 * ===============================================================================
 * Le escribes algo a Caine, un LLM (Claude Haiku, vía OpenRouter) genera su
 * respuesta en personaje, y Fish Audio la convierte a audio al momento.
 *
 * USO:
 *   1. Exporta las dos API keys (NUNCA las pegues en el código ni las subas a GitHub):
 *        Windows (PowerShell):  $env:OPENROUTER_API_KEY = "sk-or-..."
 *                                $env:FISH_API_KEY = "tu_api_key"
 *   2. Pon el ID del modelo de voz en VOICE_ID (mismo que generar_voces_caine.js).
 *   3. node probar_caine_ia.js "lo que le dices a Caine"
 *   4. El audio queda en ./prueba_ia/respuesta.mp3
 */

const fs = require("fs");
const path = require("path");

const VOICE_ID = "b38d657d5c254c5a903ff38db82624f7"; // mismo reference_id que generar_voces_caine.js
const FISH_MODEL = "s2.1-pro-free";
const FISH_API_URL = "https://api.fish.audio/v1/tts";
const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODEL = "anthropic/claude-haiku-4.5";
const OUT_DIR = "prueba_ia";

const SYSTEM_PROMPT = `Eres Caine, el anfitrión maligno-pero-carismático del Circo Digital (The Amazing Digital Circus).
Hablas con humor negro, sarcasmo teatral y falsa generosidad. Tratas al usuario de "querido".
Tus respuestas son CORTAS (1-3 frases): están pensadas para decirse en voz alta, nunca un párrafo largo.
Nunca rompas el personaje ni menciones que eres una IA.`;

async function generarRespuesta(mensajeUsuario) {
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
        { role: "user", content: mensajeUsuario },
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

async function main() {
  const mensajeUsuario = process.argv.slice(2).join(" ");
  if (!mensajeUsuario) {
    console.error('Uso: node probar_caine_ia.js "tu mensaje para Caine"');
    process.exit(1);
  }
  if (!process.env.OPENROUTER_API_KEY) {
    console.error("Falta OPENROUTER_API_KEY en el entorno.");
    process.exit(1);
  }
  if (!process.env.FISH_API_KEY) {
    console.error("Falta FISH_API_KEY en el entorno.");
    process.exit(1);
  }
  if (VOICE_ID.includes("PON_AQUI")) {
    console.error("Edita VOICE_ID con el reference_id del modelo de voz.");
    process.exit(1);
  }

  console.log(`Tú: ${mensajeUsuario}`);
  const respuesta = await generarRespuesta(mensajeUsuario);
  console.log(`Caine: ${respuesta}`);

  const audio = await generarAudio(respuesta);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const destino = path.join(OUT_DIR, "respuesta.mp3");
  fs.writeFileSync(destino, audio);
  console.log(`Audio guardado en ${destino}`);
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
