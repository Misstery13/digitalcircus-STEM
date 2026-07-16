# 🎪 Digital Circus STEM Escape

Juego educativo gamificado en web + AR: el usuario despierta atrapado en el Circo Digital y debe superar cinco salas STEM (Matemáticas, Ciencias, Programación, Tecnología e IA) para ganar las cinco llaves del portal de salida. Interacción natural por **voz**, **gestos de mano** y **expresiones faciales** — el rostro y las manos del usuario son el avatar.

**Materia:** Diseño de Interacción Hombre–Máquina · Taller–Proyecto Final 2025-2
**Entrega:** 30 de julio de 2026

📄 Diseño completo: [`docs/documento-diseno.md`](docs/documento-diseno.md)

---

## Cómo correr la web (local)

La cámara y el micrófono solo funcionan en `localhost` o HTTPS. Desde la raíz del repo:

```bash
# Opción 1 (Python)
cd web && python3 -m http.server 8000

# Opción 2 (Node)
npx serve web
```

Abre `http://localhost:8000`. Para probar en el celular, publica la carpeta `web/` en **GitHub Pages** (Settings → Pages → rama `main`, carpeta `/web` vía acción o mover a `/docs`): Pages sirve HTTPS, así que cámara y micrófono funcionan.

> **Modo silencioso:** si aún no hay mp3 en `web/audio_caine/`, la página muestra los subtítulos de Caine y avanza sola. Si no hay `.glb` en `web/modelos/`, el visor queda vacío pero el flujo del juego funciona. Cada quien puede desarrollar su parte sin esperar a los demás.

## Generar las voces de Caine

```bash
export FISH_API_KEY="tu_api_key"   # PowerShell: $env:FISH_API_KEY = "..."
node herramientas/generar_voces_caine.js
# mover los mp3 resultantes a web/audio_caine/
```

Editar `VOICE_ID` dentro del script. **La API key jamás se escribe en el código ni se sube al repo.**

## Estructura

```
├── docs/
│   ├── documento-diseno.md    ← diseño completo (fuente de verdad)
│   └── atribuciones.md        ← licencias de todos los assets
├── herramientas/
│   ├── generar_voces_caine.js ← genera los 40 mp3 (Fish Audio, Node 18+)
│   └── generar_voces_caine.py ← versión Python equivalente
└── web/
    ├── index.html             ← hub (pasillo de puertas)
    ├── sala.html?id=1..5      ← página única parametrizada para las 5 salas
    ├── portal.html            ← cámara del portal (final con giro)
    ├── css/estilos.css        ← tema circense + glitch de abstracción
    ├── js/
    │   ├── config-salas.js    ← datos de salas, respuestas, validador
    │   ├── estado.js          ← llaves + abstracción (sessionStorage)
    │   ├── audio-caine.js     ← reproductor de líneas + subtítulos
    │   ├── gestos.js          ← MediaPipe (mano, pulgar, sonrisa) + voz
    │   └── sala.js            ← máquina de estados del reto
    ├── audio_caine/           ← mp3 generados (compañero 2)
    └── modelos/               ← .glb por sala (Diana)
```

## Contratos entre módulos — NO cambiar sin avisar al equipo

**Animaciones** (Blender → web). Cada `.glb` debe traer estos nombres exactos:

| Animación | Escena | Disparador |
|---|---|---|
| `puerta_abrir` | Cada sala | Mano abierta |
| `recompensa_aparecer` | Cada sala | Sonrisa (tras acierto) |
| `portal_activar` | Portal | 5 llaves + mano abierta |

**Modelos** (nombres de archivo en `web/modelos/`): `sala1_gangle.glb`, `sala2_ragatha.glb`, `sala3_kinger.glb`, `sala4_zooble.glb`, `sala5_pomni.glb`, `portal.glb`. Presupuesto: **<150k triángulos por escena**, texturas ≤2048px.

**Audios** (nombres en `web/audio_caine/`): definidos en `herramientas/generar_voces_caine.js` — `s1_pregunta.mp3`, `s3_pista2.mp3`, `gen_abstraccion_sube.mp3`, etc. El objeto `LINEAS` del script y `SUBTITULOS` en `audio-caine.js` usan las mismas claves.

## Flujo de una sala

```
🖐 Mano abierta → puerta_abrir → Caine pregunta
🎤 Respuesta por voz → válida ✔ / fallo ✘ (+1 abstracción, pista)
   3 fallos → Caine regala la respuesta ("acto de caridad")
👍 Pulgar arriba → confirma
😄 Sonrisa → recompensa_aparecer → llave → siguiente sala
😵 Abstracción = 4 → reset suave de la sala
😄 Sonrisa en cualquier momento → −1 abstracción
```

## Estado de integración

- [x] Esqueleto web funcional (flujo completo con respaldos sin cámara/audio/3D)
- [ ] Modelos `.glb` optimizados con animaciones (Diana)
- [ ] mp3 de Caine generados y con control de calidad (C2)
- [ ] Agente Dialogflow conectado — hoy corre el fallback Web Speech (C2 + C3)
- [ ] Ajuste de umbrales de gestos con usuarios reales (C3)
- [ ] QR por sala apuntando a GitHub Pages (Diana)
- [ ] Video 2–3 min + documento técnico (C3 + todos)

## Equipo

| Integrante | Responsabilidad |
|---|---|
| Diana | Pipeline 3D completo: optimización, portal (modelado propio), props, animaciones, QR |
| Compañero 2 | Chatbot Dialogflow, voces de Caine (Fish Audio), guion, Fase 1 del documento |
| Compañero 3 | MediaPipe, integración web, video final, compilación del documento técnico |

## Nota legal

*The Amazing Digital Circus* es propiedad de **Glitch Productions**. Proyecto académico sin fines comerciales. Atribuciones de todos los assets en [`docs/atribuciones.md`](docs/atribuciones.md). No publicar fuera del aula sin consultar con el docente.
