# Digital Circus STEM Escape
## Documento de diseño — Fase 1 (Concepción y diseño del ecosistema)

**Materia:** Diseño de Interacción Hombre–Máquina
**Proyecto:** Taller–Proyecto Final 2025-2 — Ecosistema Interactivo Inteligente XR–IA
**Entrega final:** 30 de julio de 2026

---

## 1. Concepto general

**Premisa:** El usuario despierta atrapado en el Circo Digital. Caine, el maestro de ceremonias IA, le ofrece un trato: superar cinco salas educativas (Matemáticas, Ciencias, Programación, Tecnología e Inteligencia Artificial) para ganarse las cinco llaves que abren el portal de salida. Si falla demasiado, corre el riesgo de *abstraerse*.

**Público objetivo:** estudiantes de secundaria y primeros semestres universitarios (13–20 años). El tono es humorístico y teatral; las preguntas refuerzan conceptos STEM básicos.

**Propósito:** juego educativo gamificado que demuestra interacción natural mediante voz, gestos y expresiones faciales dentro de una experiencia web inmersiva.

**Plataforma actual:** experiencia web con visor 3D y cámara del navegador.
- Página web por sala con visor 3D (`model-viewer` / HTML)
- Tracking de manos y rostro (MediaPipe JS) en el navegador
- Reconocimiento de voz por Web Speech API con respaldo de texto
- Reproducción de voces de Caine con subtítulos y música de fondo reactiva
- Chat conversacional de Caine con voz mediante backend serverless (OpenRouter + Fish Audio)

**Estado de implementación (julio 2026):** la experiencia ya está operativa en versión web: el usuario puede abrir puertas, responder por voz, confirmar con pulgar, reclamar recompensas con sonrisa, escuchar a Caine y conversar con él desde el hub. La arquitectura actual prioriza simplicidad de despliegue y compatibilidad con GitHub Pages + Vercel.

**Justificación de diseño (para el documento técnico):** la experiencia usa primera persona real — el rostro y las manos del propio usuario son el "avatar". Esto refuerza el *embodiment* y la sensación de *presencia*: el atrapado en el circo es el usuario, no un personaje que controla. Cada gesto tiene además un significado dentro del mundo narrativo, no solo una función mecánica.

---

## 2. Narrativa

### 2.1 Introducción (QR del pasillo — hub)

El usuario escanea el QR inicial y aparece el pasillo de habitaciones en AR. Caine da la bienvenida por voz:

> «¡Oh! ¡Un NUEVO invitado! Bienvenido, bienvenida, al maravilloso, al espectacular... ¡CIRCO DIGITAL! Pequeño detalle: la puerta de salida está cerrada. Peeero, hoy me siento generoso: supera mis cinco salas, gana las cinco llaves, y el portal será todo tuyo. ¿Trato hecho? ¡Claro que sí, no tienes opción! Comienza por la sala de Ragatha. ¡Y sonríe! Aquí una buena actitud lo es TODO.»

Caine siempre cierra cada intervención indicando el siguiente paso concreto. El usuario nunca queda sin saber qué hacer.

### 2.2 Mecánica de abstracción (barra de cordura)

- Cada respuesta incorrecta o pista adicional pedida **sube el nivel de abstracción** (+1).
- Efecto visual: filtro de distorsión/glitch progresivo sobre la página (CSS), sin tocar los modelos 3D.
- Caine lo narra: «Uy... te estás viendo un poquito *raro*, querido. Yo que tú pensaba mejor la próxima.»
- **Sonreír a la cámara reduce la abstracción (−1).** Caine: «¡Una sonrisa al día mantiene la abstracción en la lejanía!» (Canon: mantener la mente sana es la defensa contra abstraerse.)
- Nivel máximo (4) → el usuario "se abstrae": Caine reinicia la sala. «¡Nada que un buen reseteo no arregle! Otra vez, desde el principio.» *Game over suave, sin callejón sin salida.*

### 2.3 Reglas de fallo (UX sin bloqueos)

- Respuesta incorrecta → burla cariñosa de Caine + pista más obvia → reintento inmediato.
- 3 fallos en la misma pregunta → Caine da la respuesta disfrazada de "acto de caridad" y pide confirmarla por voz (el usuario siempre avanza; el castigo fue la abstracción acumulada).
- La amenaza de quedarse atrapado vive en el guion, nunca en la mecánica.

### 2.4 Interludios de Jax (antagonista recurrente)

Jax no presenta ninguna sala: sabotea el recorrido y Caine lo narra. Dos momentos fijos en el guion (cero costo técnico, solo líneas de voz):

- **Tras la sala 2:** «Malas noticias, querido: Jax "reorganizó" las llaves. La tuya ahora está en la fortaleza de Kinger. ¿Que por qué lo dejo hacer eso? ¡Porque es DIVERTIDO!»
- **Tras la sala 4:** «Jax cambió el cartel de la última sala. Ignóralo. O no. Las decisiones son parte de la aventura~»

Si el usuario acumula abstracción, Caine puede culpar a Jax: «¿Te sientes raro? Seguro fue Jax. O tus malas respuestas. Probablemente lo segundo.»

### 2.5 Final con giro (canon: no hay salida)

Con las cinco llaves, el usuario escanea el QR de la **cámara del portal** — escena diseñada y modelada desde cero por Diana (evidencia de modelado propio para la rúbrica): un espacio circense abstracto con el gran portal, cortinas y dientes flotantes estilo Caine. Animación `portal_activar`: el portal se abre, el usuario "cruza"... y reaparece en el pasillo de siempre.

> «¡MARAVILLOSO! ¡Estupendo! ¡Superaste mi juego! Y tu gran premio es... ¡UNA NUEVA AVENTURA MAÑANA! ¿Qué? ¿La salida? Ay, querido... aquí nadie se va de verdad. ¡Pero qué gran sonrisa la tuya! Nos vemos mañana~»

El usuario **gana el juego** (cierre claro para la rúbrica); la **historia** respeta el canon.

---

## 3. Gestos y su significado en el mundo

| Gesto | Detección | Función mecánica | Significado narrativo |
|---|---|---|---|
| Mano abierta | MediaPipe Hands (5 dedos extendidos) | Abre la puerta / inicia el reto | "Tocar" la puerta del circo |
| Pulgar arriba | MediaPipe Gesture Recognizer (`Thumb_Up`) | Confirma la respuesta dada por voz | Sellar el trato con Caine |
| Sonrisa | MediaPipe Face Landmarker (blendshape de sonrisa) | Desbloquea la recompensa / reduce abstracción | Defensa contra la abstracción |

**Regla de diseño de voz:** todas las respuestas esperadas son **una palabra o un número** (fáciles de reconocer por voz y de pronunciar en voz alta). El sistema incluye respaldo por texto cuando el reconocimiento no funciona correctamente.

---

## 4. Las cinco salas

Orden fijo: Gangle → Ragatha → Kinger → Zooble → Pomni. El chatbot guía la secuencia. Caine no tiene habitación en el canon: es el maestro de ceremonias omnipresente (el chatbot) y narra las cinco salas. **Jax es el antagonista recurrente**: no presenta materia, sabotea — Caine narra sus travesuras entre salas (esconde llaves, cambia carteles), dándole al recorrido un villano secundario sin necesidad de sala propia.

---

### Sala 1 — Gangle · Matemáticas 🎭

**Ambientación (habitación de Gangle):** decoración teatral, cintas.
**Props a agregar (Diana):** máscaras de comedia y tragedia flotantes, pizarra con el problema, llave #1 colgando de una cinta.

**Reto:** «La pobre Gangle tenía 24 máscaras de comedia. Jax le rompió la mitad — qué sorpresa — y luego rompió 4 más. ¿Cuántas máscaras le quedan?»
**Respuesta esperada (voz):** «ocho» / «8»
**Pistas:** (1) «Primero la mitad, luego la resta, querido.» (2) «La mitad de 24 es 12. Y ahora, ¿12 menos 4...?»

**Caine al acertar:** «¡OCHO máscaras! Suficientes para que Gangle llore detrás de todas ellas. ¡Pulgar arriba para sellar el trato!»

---

### Sala 2 — Ragatha · Ciencias 🔬

**Ambientación (habitación de Ragatha):** costurero gigante, botones, hilos (ya en el pack).
**Props a agregar (Diana):** mesa de té con matraces low-poly, molécula de agua flotante (2 esferas pequeñas + 1 grande), llave #2 dentro de un frasco.

**Reto:** «Ragatha, siempre tan atenta, quiere ofrecerte un té. Lástima que aquí el agua sea digital. Dime: ¿cuál es la fórmula química del agua?»
**Respuesta esperada (voz):** «hache dos o» / «H2O»
**Pistas:** (1) «Dos átomos de un gas muy ligero y uno de otro sin el cual no respiras.» (2) «Hidrógeno... por dos... más un Oxígeno...»

**Caine al acertar:** «¡H-2-O! ¡Correcto! Aunque aquí el agua es mentira y el té también, ¡LA CIENCIA ES LA CIENCIA!»

---

### Sala 3 — Kinger · Programación 🐛

**Ambientación (habitación de Kinger):** su fortaleza de almohadas (ya en el pack).
**Props a agregar (Diana):** insectos low-poly flotando en frascos, una terminal antigua con código en pantalla, llave #3 custodiada por una mariposa posada encima.

**Reto:** «Kinger colecciona insectos... y sin saberlo, también colecciona lo que más odian los programadores. Dime: ¿cómo se le llama a un error en el código de un programa?»
**Respuesta esperada (voz):** «bug»
**Pistas:** (1) «Es una palabra en inglés que significa... insecto. Mira alrededor de esta sala, querido.» (2) «Empieza con B y Kinger tiene frascos LLENOS de ellos.»

**Caine al acertar:** «¡BUG! ¡Exacto! Los programadores los aplastan y Kinger los colecciona. ¡Cada quien con sus hobbies!»

---

### Sala 4 — Zooble · Tecnología ⚙️

**Ambientación (habitación de Zooble):** piezas y partes intercambiables por todos lados.
**Props a agregar (Diana):** engranajes flotantes, un "puerto" gigante estilo consola, llave #4 encajada como una pieza más de Zooble.

**Reto:** «Zooble se desarma y se arma como cualquier buen hardware. Hablando de eso: ¿cómo se llama el "cerebro" de una computadora, la unidad central de procesamiento?»
**Respuesta esperada (voz):** «CPU» / «procesador»
**Pistas:** (1) «Son tres letras. La primera es C.» (2) «Central... Processing... ¿Unit?»

**Caine al acertar:** «¡CPU! ¡El cerebro de la máquina! No es que aquí alguno tengamos uno de verdad, pero ¡DETALLES!»

---

### Sala 5 — Pomni · Inteligencia Artificial 🎩

**Ambientación (habitación de Pomni):** habitación sobria de "nueva integrante" (ya en el pack).
**Props a agregar (Diana):** código binario flotando en las paredes, un "ojo" digital estilo Caine observando, llave #5 dentro de una jaula de datos.

**Reto (meta y autoconsciente):** «Última pregunta, y es sobre MÍ. Pomni no deja de preguntarse QUÉ soy. Ayúdala: aprendo de tus respuestas, hablo contigo y adapto mis pistas. ¿Qué tipo de programa soy? Inteligencia... ¿qué?»
**Respuesta esperada (voz):** «artificial»
**Pistas:** (1) «Lo contrario de natural.» (2) «Está en el nombre de esta sala, querido. Literalmente.»

**Caine al acertar:** «¡INTELIGENCIA ARTIFICIAL! Como yo: encantador, brillante y ligeramente omnipotente. ¡Tienes las CINCO llaves! Corre a la cámara del portal, tu salida espera... *jejeje*.»

---

## 5. Arquitectura de la experiencia (resumen técnico)

1. La página carga el `.glb` de la sala y la escena 3D correspondiente.
2. MediaPipe JS corre en la misma página con la cámara para detectar mano abierta, pulgar arriba y sonrisa.
3. Gesto detectado → dispara animación por nombre: `puerta_abrir`, `recompensa_aparecer`, `portal_activar`.
4. El flujo de la sala se controla con una máquina de estados en JavaScript: pregunta, escucha, validación, confirmación y recompensa.
5. El reconocimiento de voz del usuario ocurre con Web Speech API y, si falla, el sistema permite responder por texto.
6. Caine reproduce líneas pregrabadas con subtítulos y la música de fondo se atenúa automáticamente mientras habla.
7. El chat conversacional del hub usa un backend serverless en Vercel con OpenRouter para generar respuestas y Fish Audio para convertirlas en voz.
8. El estado de llaves, abstracción, música y progreso se conserva en `sessionStorage` para mantener la experiencia entre páginas.

**Contrato entre módulos:** los nombres de animaciones son la interfaz entre el 3D (Diana) y el código. Se acuerdan por escrito y no se cambian sin avisar.

| Animación | Escena | Disparador |
|---|---|---|
| `puerta_abrir` | Cada sala | Mano abierta |
| `recompensa_aparecer` | Cada sala | Sonrisa (tras acierto confirmado) |
| `portal_activar` | Cámara del portal | 5 llaves reunidas |

**Voz de Caine (pregrabada):** el guion de Caine es fijo, así que sus líneas se generan como mp3 y la página web reproduce el audio correspondiente a cada respuesta del bot. La implementación actual usa `audio-caine.js` para subtítulos y reproducción, con un modo silencioso de respaldo si el mp3 aún no existe. Generación de audio: API de Fish Audio con el script `herramientas/generar_voces_caine.js`.

**Decisión de chatbot:** la implementación actual prioriza una solución simple y desplegable para web: Web Speech API para voz del usuario y un endpoint serverless en Vercel para responder con IA y voz. Dialogflow queda como una mejora futura si se requiere una lógica de conversación más compleja.

---

## 6. Reparto de tareas

**Diana — pipeline 3D completo**
- Descargar y optimizar pasillo + 5 habitaciones (decimar a <150k tris por escena)
- Modelar desde cero la cámara del portal (evidencia de modelado propio)
- Props STEM por sala + animaciones (`puerta_abrir`, `recompensa_aparecer`, `portal_activar`)
- Exportar un `.glb` por sala, subir, generar y probar los 6 QR
- Atribuciones de modelos para el documento técnico

**Compañero 2 — contenido + voces + IA**
- Generación de las líneas de Caine con Fish Audio (mp3 por línea) y control de calidad de audio
- Guion completo de Caine y contenido de las salas
- Integración del chat conversacional con OpenRouter + voz de Caine
- Redacción del documento técnico y soporte narrativo del proyecto

**Compañero 3 — tracking + integración + entrega**
- MediaPipe JS: mano abierta, pulgar arriba, sonrisa
- Página web por sala: visor 3D + cámara + reconocimiento de voz + contador de llaves/abstracción + filtro glitch
- Música de fondo reactiva y atenuación automática al hablar
- Edición del video final (2–3 min) y compilación del documento técnico

**Los tres juntos:** storyboard visual, integración de los módulos de audio, interacción y 3D, y grabación del video.

---

## 7. Cronograma

| Fechas | Hito |
|---|---|
| 15–18 jul | Storyboard cerrado · prueba de pipeline: 1 habitación exportada y probada en la web |
| 19–26 jul | Trabajo en paralelo: Diana (5 salas + hub), C2 (voces + contenido + chat IA), C3 (gestos + web + audio) |
| 27–28 jul | Integración conjunta: gestos → animaciones, voz → validación, música → mezcla, chat → experiencia completa |
| 29 jul | Grabación y edición del video · documento técnico final |
| 30 jul | Entrega |

**Regla de congelamiento:** el diseño queda cerrado con lo descrito aquí. Toda idea nueva va a la sección "Trabajo futuro".

---

## 8. Atribuciones de assets

Ver [`atribuciones.md`](./atribuciones.md).

*The Amazing Digital Circus es propiedad de Glitch Productions. Proyecto académico sin fines comerciales; consultar con el docente antes de publicar el video fuera del aula.*

---

## 9. Trabajo futuro (v2.0 — fuera del alcance actual)

- Texturas glitch en los modelos 3D según nivel de abstracción
- Versiones abstraídas de los personajes
- Orden libre de salas con dificultad adaptativa
- Multijugador / tabla de puntuaciones
- Más gestos (señalar para seleccionar, negar con la cabeza)
