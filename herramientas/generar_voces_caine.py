#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Digital Circus STEM Escape — Generador de voces de Caine
=========================================================
Genera todos los mp3 del guion de Caine usando la API de Fish Audio.

USO:
  1. pip install requests
  2. Exporta tu API key (NUNCA la pegues dentro del código ni la subas a GitHub):
       Windows (PowerShell):  $env:FISH_API_KEY = "tu_api_key"
       Mac/Linux:             export FISH_API_KEY="tu_api_key"
  3. Pon el ID del modelo de voz en VOICE_ID (abajo).
  4. python generar_voces_caine.py
  5. Los mp3 quedan en ./audio_caine/ — esa carpeta completa se la pasas
     al compañero 3 para la página web.

El script se puede correr varias veces: si un mp3 ya existe, lo salta.
Para regenerar una sola línea, borra ese archivo y vuelve a correr.
"""

import os
import sys
import time
from pathlib import Path

try:
    import requests
except ImportError:
    sys.exit("Falta la librería 'requests'. Instálala con: pip install requests")

# ── CONFIGURACIÓN ────────────────────────────────────────────────────────────

API_KEY = os.environ.get("FISH_API_KEY", "")   # se lee de la variable de entorno
VOICE_ID = "PON_AQUI_EL_ID_DEL_MODELO_DE_VOZ"  # reference_id del modelo en Fish Audio
MODEL = "s2.1-pro-free"                        # tier gratuito de desarrollo
OUT_DIR = Path("audio_caine")
API_URL = "https://api.fish.audio/v1/tts"
PAUSA_ENTRE_LLAMADAS = 1.5                     # segundos, para no golpear el rate limit

# ── GUION COMPLETO DE CAINE ──────────────────────────────────────────────────
# Nombres de archivo = interfaz con el compañero 3. NO los cambies sin avisar
# (misma regla que los nombres de animaciones en el documento de diseño).

LINEAS = {

    # ---- Hub / introducción ----
    "00_intro":
        "¡Oh! ¡Un NUEVO invitado! Bienvenido, bienvenida, al maravilloso, al "
        "espectacular... ¡CIRCO DIGITAL! Pequeño detalle: la puerta de salida "
        "está cerrada. Peeero, hoy me siento generoso: supera mis cinco salas, "
        "gana las cinco llaves, ¡y el portal será todo tuyo! ¿Trato hecho? "
        "¡Claro que sí, no tienes opción! Comienza por la sala de Gangle. "
        "¡Y sonríe! Aquí una buena actitud lo es TODO.",

    # ---- Líneas genéricas (sirven en cualquier sala) ----
    "gen_puerta_abierta":
        "¡Adelante, adelante! La puerta está abierta. Qué modales los míos.",
    "gen_fallo_1":
        "Mmm... no. Pero me encanta tu confianza. ¡Inténtalo de nuevo!",
    "gen_fallo_2":
        "¡Incorrecto otra vez! No te preocupes, querido, el tiempo aquí "
        "sobra... literalmente.",
    "gen_pulgar_confirmar":
        "¿Seguro, seguro? ¡Pulgar arriba para sellar el trato!",
    "gen_sonrisa_recompensa":
        "¡Esa sonrisa! ¡ESA es la actitud! Tu recompensa, querido.",
    "gen_abstraccion_sube":
        "Uy... te estás viendo un poquito raro, querido. Yo que tú pensaba "
        "mejor la próxima.",
    "gen_abstraccion_baja":
        "¡Una sonrisa al día mantiene la abstracción en la lejanía!",
    "gen_abstraccion_reset":
        "¡Nada que un buen reseteo no arregle! Otra vez, desde el principio.",
    "gen_abstraccion_jax":
        "¿Te sientes raro? Seguro fue Jax. O tus malas respuestas. "
        "Probablemente lo segundo.",

    # ---- Sala 1: Gangle · Matemáticas ----
    "s1_pregunta":
        "La pobre Gangle tenía veinticuatro máscaras de comedia. Jax le rompió "
        "la mitad — qué sorpresa — y luego rompió cuatro más. ¿Cuántas "
        "máscaras le quedan?",
    "s1_pista1":
        "Primero la mitad, luego la resta, querido.",
    "s1_pista2":
        "La mitad de veinticuatro es doce. Y ahora, ¿doce menos cuatro...?",
    "s1_caridad":
        "Está bien, está bien, mi acto de caridad del día: la respuesta es "
        "OCHO. Dilo en voz alta para que cuente, querido.",
    "s1_acierto":
        "¡OCHO máscaras! Suficientes para que Gangle llore detrás de todas "
        "ellas. ¡Pulgar arriba para sellar el trato!",
    "s1_llave":
        "¡Primera llave conseguida! Cuatro más y hablamos de tu libertad. "
        "Siguiente parada: ¡la sala de Ragatha!",

    # ---- Sala 2: Ragatha · Ciencias ----
    "s2_pregunta":
        "Ragatha, siempre tan atenta, quiere ofrecerte un té. Lástima que "
        "aquí el agua sea digital. Dime: ¿cuál es la fórmula química del agua?",
    "s2_pista1":
        "Dos átomos de un gas muy ligero y uno de otro sin el cual no respiras.",
    "s2_pista2":
        "Hidrógeno... por dos... más un Oxígeno...",
    "s2_caridad":
        "Mi generosidad no tiene límites: es HACHE DOS O. Repítelo, querido, "
        "que la ciencia exige participación.",
    "s2_acierto":
        "¡H-2-O! ¡Correcto! Aunque aquí el agua es mentira y el té también, "
        "¡LA CIENCIA ES LA CIENCIA!",
    "s2_llave_jax":
        "Malas noticias, querido: Jax reorganizó las llaves. La tuya ahora "
        "está en la fortaleza de Kinger. ¿Que por qué lo dejo hacer eso? "
        "¡Porque es DIVERTIDO!",

    # ---- Sala 3: Kinger · Programación ----
    "s3_pregunta":
        "Kinger colecciona insectos... y sin saberlo, también colecciona lo "
        "que más odian los programadores. Dime: ¿cómo se le llama a un error "
        "en el código de un programa?",
    "s3_pista1":
        "Es una palabra en inglés que significa... insecto. Mira alrededor "
        "de esta sala, querido.",
    "s3_pista2":
        "Empieza con B, y Kinger tiene frascos LLENOS de ellos.",
    "s3_caridad":
        "De acuerdo, te lo regalo: se llama BUG. Dilo fuerte, que Kinger "
        "se emociona.",
    "s3_acierto":
        "¡BUG! ¡Exacto! Los programadores los aplastan y Kinger los "
        "colecciona. ¡Cada quien con sus hobbies!",
    "s3_llave":
        "¡Tercera llave! Vas a mitad de camino... o a mitad de condena, "
        "según se mire. ¡A la sala de Zooble!",

    # ---- Sala 4: Zooble · Tecnología ----
    "s4_pregunta":
        "Zooble se desarma y se arma como cualquier buen hardware. Hablando "
        "de eso: ¿cómo se llama el cerebro de una computadora, la unidad "
        "central de procesamiento?",
    "s4_pista1":
        "Son tres letras. La primera es C.",
    "s4_pista2":
        "Central... Processing... ¿Unit?",
    "s4_caridad":
        "Último acto de caridad: se llama C-P-U. Anda, dilo, que no te "
        "cueste tanto como a Zooble armarse en las mañanas.",
    "s4_acierto":
        "¡CPU! ¡El cerebro de la máquina! No es que aquí alguno tengamos "
        "uno de verdad, pero ¡DETALLES!",
    "s4_llave_jax":
        "Jax cambió el cartel de la última sala. Ignóralo. O no. Las "
        "decisiones son parte de la aventura.",

    # ---- Sala 5: Pomni · Inteligencia Artificial ----
    "s5_pregunta":
        "Última pregunta, ¡y es sobre MÍ! Pomni no deja de preguntarse QUÉ "
        "soy. Ayúdala: aprendo de tus respuestas, hablo contigo y adapto "
        "mis pistas. ¿Qué tipo de programa soy? Inteligencia... ¿qué?",
    "s5_pista1":
        "Lo contrario de natural.",
    "s5_pista2":
        "Está en el nombre de esta sala, querido. Literalmente.",
    "s5_caridad":
        "Ay, me duele hasta a mí: la respuesta es ARTIFICIAL. Dilo, y "
        "prometo fingir que lo sabías.",
    "s5_acierto":
        "¡INTELIGENCIA ARTIFICIAL! Como yo: encantador, brillante y "
        "ligeramente omnipotente. ¡Tienes las CINCO llaves! Corre a la "
        "cámara del portal, tu salida espera... jejeje.",

    # ---- Final con giro ----
    "99_final":
        "¡MARAVILLOSO! ¡Estupendo! ¡Superaste mi juego! Y tu gran premio "
        "es... ¡UNA NUEVA AVENTURA MAÑANA! ¿Qué? ¿La salida? Ay, querido... "
        "aquí nadie se va de verdad. ¡Pero qué gran sonrisa la tuya! "
        "¡Nos vemos mañana!",
}

# ── GENERACIÓN ───────────────────────────────────────────────────────────────

def generar(nombre: str, texto: str) -> bool:
    """Genera un mp3. Devuelve True si se creó, False si falló."""
    destino = OUT_DIR / f"{nombre}.mp3"
    if destino.exists():
        print(f"  [ya existe] {destino.name}")
        return True

    try:
        resp = requests.post(
            API_URL,
            json={
                "text": texto,
                "reference_id": VOICE_ID,
                "format": "mp3",
            },
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
                "model": MODEL,
            },
            timeout=120,
        )
    except requests.RequestException as e:
        print(f"  [ERROR red] {nombre}: {e}")
        return False

    if resp.status_code != 200:
        print(f"  [ERROR {resp.status_code}] {nombre}: {resp.text[:200]}")
        return False

    destino.write_bytes(resp.content)
    kb = len(resp.content) / 1024
    print(f"  [OK] {destino.name} ({kb:.0f} KB)")
    return True


def main():
    if not API_KEY:
        sys.exit(
            "No encontré la API key.\n"
            "  Windows (PowerShell):  $env:FISH_API_KEY = \"tu_api_key\"\n"
            "  Mac/Linux:             export FISH_API_KEY=\"tu_api_key\""
        )
    if "PON_AQUI" in VOICE_ID:
        sys.exit("Edita VOICE_ID en el script con el reference_id del modelo de voz.")

    OUT_DIR.mkdir(exist_ok=True)
    print(f"Generando {len(LINEAS)} líneas de Caine en ./{OUT_DIR}/")
    print(f"Modelo: {MODEL} | Voz: {VOICE_ID}\n")

    fallidas = []
    for i, (nombre, texto) in enumerate(LINEAS.items(), 1):
        print(f"[{i}/{len(LINEAS)}] {nombre}")
        if not generar(nombre, texto):
            fallidas.append(nombre)
        time.sleep(PAUSA_ENTRE_LLAMADAS)

    print("\n" + "=" * 50)
    if fallidas:
        print(f"Terminé con {len(fallidas)} fallos: {', '.join(fallidas)}")
        print("Vuelve a correr el script: solo reintenta las que faltan.")
    else:
        print(f"¡Listo! {len(LINEAS)} audios en ./{OUT_DIR}/")
        print("Pásale la carpeta completa al compañero 3.")


if __name__ == "__main__":
    main()
