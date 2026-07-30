# 🎪 Digital Circus STEM Escape

Juego educativo gamificado en web + AR: el usuario despierta atrapado en el Circo Digital y debe superar cinco salas STEM (Matemáticas, Ciencias, Programación, Tecnología e IA) para ganar las cinco llaves del portal de salida. La experiencia combina interacción por **voz**, **gestos de mano**, **expresiones faciales** y una capa de audio inmersiva: Caine habla con subtítulos, la música se atenúa mientras habla y el hub incluye un chat conversacional con voz.

**Materia:** Diseño de Interacción Hombre–Máquina · Taller–Proyecto Final 2025-2
**Entrega:** 30 de julio de 2026

📄 Diseño completo: [`docs/documento-diseno.md`](docs/documento-diseno.md)

---

## Últimas implementaciones

- Flujo completo de salas con interacción por voz y gestos: mano abierta para abrir puertas, pulgar arriba para confirmar y sonrisa para reclamar recompensas.
- Voz de Caine con subtítulos y audio de bienvenida; si el mp3 no está disponible, el juego sigue funcionando en modo silencioso con respaldo de texto.
- Música de fondo persistente entre páginas, con atenuación automática mientras Caine habla para que la voz se escuche mejor.
- Chat de Caine en el hub, con respuestas generadas por IA y reproducción de voz desde un backend serverless.
- Estado persistido en sesión para llaves, abstracción, música y progreso entre páginas.

---

## Cómo correr la web (local)

`web/` referencia los modelos, imágenes y audio con rutas `../assets/...`, y `assets/` vive en la raíz del repo (hermana de `web/`, no adentro). Por eso el servidor tiene que arrancar desde la **raíz del repo**, no desde `web/` — si no, esas rutas no pueden "salir" de `web/` y todo da 404.

La cámara y el micrófono solo funcionan en `localhost` o HTTPS. Desde la raíz del repo:

```bash
# Opción 1 (Python)
python3 -m http.server 8000

# Opción 2 (Node)
npx serve .
```

Abre `http://localhost:8000/web/` (con el `/web/` al final). Para probar en el celular, publica el repo en **GitHub Pages** (Settings → Pages → rama `main`, carpeta **`/ (root)`** — NO `/web`, porque así `assets/` quedaría fuera de lo publicado): Pages sirve HTTPS, así que cámara y micrófono funcionan.

> **Modo silencioso:** si aún no hay mp3 en `web/audio_caine/`, la página muestra los subtítulos de Caine y avanza sola. Si no hay `.glb` en `web/modelos/`, el visor queda vacío pero el flujo del juego funciona. Cada quien puede desarrollar su parte sin esperar a los demás.

## Generar las voces de Caine

```bash
export FISH_API_KEY="tu_api_key"   # PowerShell: $env:FISH_API_KEY = "..."
node herramientas/generar_voces_caine.js
# mover los mp3 resultantes a web/audio_caine/
```

Editar `VOICE_ID` dentro del script. **La API key jamás se escribe en el código ni se sube al repo.**

## Chat de Caine (opcional)

El panel de chat del hub usa un endpoint serverless en [api/caine-chat.js](api/caine-chat.js). Para activarlo en Vercel o un entorno similar, define estas variables:

```bash
export OPENROUTER_API_KEY="tu_api_key"
export FISH_API_KEY="tu_api_key"
```

El proyecto ya incluye la configuración de Vercel en [vercel.json](vercel.json).

## Estructura

```
├── api/
│   └── caine-chat.js         ← backend serverless para el chat conversacional
├── docs/
│   ├── documento-diseno.md   ← diseño completo (fuente de verdad)
│   └── atribuciones.md       ← licencias de todos los assets
├── herramientas/
│   ├── generar_voces_caine.js ← genera los mp3 de Caine (Fish Audio, Node 18+)
│   └── generar_voces_caine.py ← versión Python equivalente
└── web/
    ├── index.html            ← hub (pasillo de puertas)
    ├── sala.html?id=1..5     ← página única parametrizada para las 5 salas
    ├── portal.html           ← cámara del portal (final con giro)
    ├── css/estilos.css       ← tema circense + glitch de abstracción
    ├── js/
    │   ├── config-salas.js   ← datos de salas, respuestas, validador
    │   ├── estado.js         ← llaves + abstracción (sessionStorage)
    │   ├── audio-caine.js    ← reproductor de líneas + subtítulos
    │   ├── chat-caine.js     ← panel y lógica del chat conversacional
    │   ├── gestos.js         ← MediaPipe (mano, pulgar, sonrisa) + voz
    │   ├── musica.js         ← música de fondo y atenuación automática
    │   ├── sala.js           ← máquina de estados del reto
    │   └── voz.js            ← reconocimiento de voz por Web Speech
    ├── audio_caine/          ← mp3 generados de Caine
    └── modelos/              ← .glb por sala y portal
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
- [x] Interacción por voz y gestos en la experiencia principal
- [x] Voz de Caine con subtítulos y audio de bienvenida
- [x] Música de fondo reactiva y atenuación automática durante el habla
- [x] Chat conversacional de Caine con voz en el hub
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
