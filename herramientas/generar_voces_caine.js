#!/usr/bin/env node
/**
 * Digital Circus STEM Escape — Generador de voces de Caine (Node.js)
 * ===================================================================
 * Genera todos los mp3 del guion de Caine usando la API de Fish Audio.
 *
 * USO:
 *   1. Requiere Node 18 o superior (usa fetch nativo, cero dependencias).
 *   2. Exporta tu API key (NUNCA la pegues dentro del código ni la subas a GitHub):
 *        Windows (PowerShell):  $env:FISH_API_KEY = "tu_api_key"
 *        Mac/Linux:             export FISH_API_KEY="tu_api_key"
 *   3. Pon el ID del modelo de voz en VOICE_ID (abajo).
 *   4. node generar_voces_caine.js
 *   5. Los mp3 quedan en ./audio_caine/ — esa carpeta completa se la pasas
 *      al compañero 3 para la página web.
 *
 * El script se puede correr varias veces: si un mp3 ya existe, lo salta.
 * Para regenerar una sola línea, borra ese archivo y vuelve a correr.
 */

const fs = require("fs");
const path = require("path");

// ── CONFIGURACIÓN ────────────────────────────────────────────────────────────

const API_KEY = process.env.FISH_API_KEY || "";  // se lee de la variable de entorno
const VOICE_ID = "PON_AQUI_EL_ID_DEL_MODELO_DE_VOZ"; // reference_id del modelo
const MODEL = "s2.1-pro-free";                   // tier gratuito de desarrollo
const OUT_DIR = "audio_caine";
const API_URL = "https://api.fish.audio/v1/tts";
const PAUSA_MS = 1500;                           // pausa entre llamadas (rate limit)

// ── GUION COMPLETO DE CAINE ──────────────────────────────────────────────────
// Nombres de archivo = interfaz con el compañero 3. NO los cambies sin avisar
// (misma regla que los nombres de animaciones en el documento de diseño).

const LINEAS = {

  // ---- Hub / introducción ----
  "00_intro":
    "¡Oh! ¡Un NUEVO invitado! Bienvenido, bienvenida, al maravilloso, al " +
    "espectacular... ¡CIRCO DIGITAL! Pequeño detalle: la puerta de salida " +
    "está cerrada. Peeero, hoy me siento generoso: supera mis cinco salas, " +
    "gana las cinco llaves, ¡y el portal será todo tuyo! ¿Trato hecho? " +
    "¡Claro que sí, no tienes opción! Comienza por la sala de Gangle. " +
    "¡Y sonríe! Aquí una buena actitud lo es TODO.",

  // ---- Líneas genéricas (sirven en cualquier sala) ----
  "gen_puerta_abierta":
    "¡Adelante, adelante! La puerta está abierta. Qué modales los míos.",
  "gen_fallo_1":
    "Mmm... no. Pero me encanta tu confianza. ¡Inténtalo de nuevo!",
  "gen_fallo_2":
    "¡Incorrecto otra vez! No te preocupes, querido, el tiempo aquí " +
    "sobra... literalmente.",
  "gen_pulgar_confirmar":
    "¿Seguro, seguro? ¡Pulgar arriba para sellar el trato!",
  "gen_sonrisa_recompensa":
    "¡Esa sonrisa! ¡ESA es la actitud! Tu recompensa, querido.",
  "gen_abstraccion_sube":
    "Uy... te estás viendo un poquito raro, querido. Yo que tú pensaba " +
    "mejor la próxima.",
  "gen_abstraccion_baja":
    "¡Una sonrisa al día mantiene la abstracción en la lejanía!",
  "gen_abstraccion_reset":
    "¡Nada que un buen reseteo no arregle! Otra vez, desde el principio.",
  "gen_abstraccion_jax":
    "¿Te sientes raro? Seguro fue Jax. O tus malas respuestas. " +
    "Probablemente lo segundo.",

  // ---- Sala 1: Gangle · Matemáticas ----
  "s1_pregunta":
    "La pobre Gangle tenía veinticuatro máscaras de comedia. Jax le rompió " +
    "la mitad — qué sorpresa — y luego rompió cuatro más. ¿Cuántas " +
    "máscaras le quedan?",
  "s1_pista1":
    "Primero la mitad, luego la resta, querido.",
  "s1_pista2":
    "La mitad de veinticuatro es doce. Y ahora, ¿doce menos cuatro...?",
  "s1_caridad":
    "Está bien, está bien, mi acto de caridad del día: la respuesta es " +
    "OCHO. Dilo en voz alta para que cuente, querido.",
  "s1_acierto":
    "¡OCHO máscaras! Suficientes para que Gangle llore detrás de todas " +
    "ellas. ¡Pulgar arriba para sellar el trato!",
  "s1_llave":
    "¡Primera llave conseguida! Cuatro más y hablamos de tu libertad. " +
    "Siguiente parada: ¡la sala de Ragatha!",

  // ---- Sala 2: Ragatha · Ciencias ----
  "s2_pregunta":
    "Ragatha, siempre tan atenta, quiere ofrecerte un té. Lástima que " +
    "aquí el agua sea digital. Dime: ¿cuál es la fórmula química del agua?",
  "s2_pista1":
    "Dos átomos de un gas muy ligero y uno de otro sin el cual no respiras.",
  "s2_pista2":
    "Hidrógeno... por dos... más un Oxígeno...",
  "s2_caridad":
    "Mi generosidad no tiene límites: es HACHE DOS O. Repítelo, querido, " +
    "que la ciencia exige participación.",
  "s2_acierto":
    "¡H-2-O! ¡Correcto! Aunque aquí el agua es mentira y el té también, " +
    "¡LA CIENCIA ES LA CIENCIA!",
  "s2_llave_jax":
    "Malas noticias, querido: Jax reorganizó las llaves. La tuya ahora " +
    "está en la fortaleza de Kinger. ¿Que por qué lo dejo hacer eso? " +
    "¡Porque es DIVERTIDO!",

  // ---- Sala 3: Kinger · Programación ----
  "s3_pregunta":
    "Kinger colecciona insectos... y sin saberlo, también colecciona lo " +
    "que más odian los programadores. Dime: ¿cómo se le llama a un error " +
    "en el código de un programa?",
  "s3_pista1":
    "Es una palabra en inglés que significa... insecto. Mira alrededor " +
    "de esta sala, querido.",
  "s3_pista2":
    "Empieza con B, y Kinger tiene frascos LLENOS de ellos.",
  "s3_caridad":
    "De acuerdo, te lo regalo: se llama BUG. Dilo fuerte, que Kinger " +
    "se emociona.",
  "s3_acierto":
    "¡BUG! ¡Exacto! Los programadores los aplastan y Kinger los " +
    "colecciona. ¡Cada quien con sus hobbies!",
  "s3_llave":
    "¡Tercera llave! Vas a mitad de camino... o a mitad de condena, " +
    "según se mire. ¡A la sala de Zooble!",

  // ---- Sala 4: Zooble · Tecnología ----
  "s4_pregunta":
    "Zooble se desarma y se arma como cualquier buen hardware. Hablando " +
    "de eso: ¿cómo se llama el cerebro de una computadora, la unidad " +
    "central de procesamiento?",
  "s4_pista1":
    "Son tres letras. La primera es C.",
  "s4_pista2":
    "Central... Processing... ¿Unit?",
  "s4_caridad":
    "Último acto de caridad: se llama C-P-U. Anda, dilo, que no te " +
    "cueste tanto como a Zooble armarse en las mañanas.",
  "s4_acierto":
    "¡CPU! ¡El cerebro de la máquina! No es que aquí alguno tengamos " +
    "uno de verdad, pero ¡DETALLES!",
  "s4_llave_jax":
    "Jax cambió el cartel de la última sala. Ignóralo. O no. Las " +
    "decisiones son parte de la aventura.",

  // ---- Sala 5: Pomni · Inteligencia Artificial ----
  "s5_pregunta":
    "Última pregunta, ¡y es sobre MÍ! Pomni no deja de preguntarse QUÉ " +
    "soy. Ayúdala: aprendo de tus respuestas, hablo contigo y adapto " +
    "mis pistas. ¿Qué tipo de programa soy? Inteligencia... ¿qué?",
  "s5_pista1":
    "Lo contrario de natural.",
  "s5_pista2":
    "Está en el nombre de esta sala, querido. Literalmente.",
  "s5_caridad":
    "Ay, me duele hasta a mí: la respuesta es ARTIFICIAL. Dilo, y " +
    "prometo fingir que lo sabías.",
  "s5_acierto":
    "¡INTELIGENCIA ARTIFICIAL! Como yo: encantador, brillante y " +
    "ligeramente omnipotente. ¡Tienes las CINCO llaves! Corre a la " +
    "cámara del portal, tu salida espera... jejeje.",

  // ---- Final con giro ----
  "99_final":
    "¡MARAVILLOSO! ¡Estupendo! ¡Superaste mi juego! Y tu gran premio " +
    "es... ¡UNA NUEVA AVENTURA MAÑANA! ¿Qué? ¿La salida? Ay, querido... " +
    "aquí nadie se va de verdad. ¡Pero qué gran sonrisa la tuya! " +
    "¡Nos vemos mañana!",
};

// ── GENERACIÓN ───────────────────────────────────────────────────────────────

const dormir = (ms) => new Promise((res) => setTimeout(res, ms));

/** Genera un mp3. Devuelve true si se creó (o ya existía), false si falló. */
async function generar(nombre, texto) {
  const destino = path.join(OUT_DIR, `${nombre}.mp3`);
  if (fs.existsSync(destino)) {
    console.log(`  [ya existe] ${nombre}.mp3`);
    return true;
  }

  let resp;
  try {
    resp = await fetch(API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        model: MODEL,
      },
      body: JSON.stringify({
        text: texto,
        reference_id: VOICE_ID,
        format: "mp3",
      }),
    });
  } catch (e) {
    console.log(`  [ERROR red] ${nombre}: ${e.message}`);
    return false;
  }

  if (!resp.ok) {
    const detalle = (await resp.text()).slice(0, 200);
    console.log(`  [ERROR ${resp.status}] ${nombre}: ${detalle}`);
    return false;
  }

  const buffer = Buffer.from(await resp.arrayBuffer());
  fs.writeFileSync(destino, buffer);
  console.log(`  [OK] ${nombre}.mp3 (${Math.round(buffer.length / 1024)} KB)`);
  return true;
}

async function main() {
  if (!API_KEY) {
    console.error(
      "No encontré la API key.\n" +
        '  Windows (PowerShell):  $env:FISH_API_KEY = "tu_api_key"\n' +
        '  Mac/Linux:             export FISH_API_KEY="tu_api_key"'
    );
    process.exit(1);
  }
  if (VOICE_ID.includes("PON_AQUI")) {
    console.error("Edita VOICE_ID en el script con el reference_id del modelo de voz.");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const entradas = Object.entries(LINEAS);
  console.log(`Generando ${entradas.length} líneas de Caine en ./${OUT_DIR}/`);
  console.log(`Modelo: ${MODEL} | Voz: ${VOICE_ID}\n`);

  const fallidas = [];
  for (let i = 0; i < entradas.length; i++) {
    const [nombre, texto] = entradas[i];
    console.log(`[${i + 1}/${entradas.length}] ${nombre}`);
    const ok = await generar(nombre, texto);
    if (!ok) fallidas.push(nombre);
    await dormir(PAUSA_MS);
  }

  console.log("\n" + "=".repeat(50));
  if (fallidas.length > 0) {
    console.log(`Terminé con ${fallidas.length} fallos: ${fallidas.join(", ")}`);
    console.log("Vuelve a correr el script: solo reintenta las que faltan.");
  } else {
    console.log(`¡Listo! ${entradas.length} audios en ./${OUT_DIR}/`);
    console.log("Pásale la carpeta completa al compañero 3.");
  }
}

main();
