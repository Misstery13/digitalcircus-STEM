// ============================================================
// musica.js — Música de fondo compartida entre páginas
// El tema arranca al pulsar "Entrar al circo" y sigue sonando
// sala tras sala (sessionStorage guarda pista + posición, así
// que cada página nueva retoma donde iba en vez de reiniciar).
// Cambia a "Our New Home" al llegar al máximo de abstracción o
// al alcanzar el portal con las 5 llaves.
// ============================================================

const RUTA_BASE = "../assets/soundtrack/";
const PISTAS = {
  tema: RUTA_BASE + encodeURIComponent("The Amazing Digital Circus - Main Theme Song Extended.mp3"),
  ournewhome: RUTA_BASE + encodeURIComponent("Our New Home.mp3"),
};

const K_ACTIVA = "dc_musica_activa";
const K_PISTA = "dc_musica_pista";
const K_TIEMPO = "dc_musica_tiempo";
const K_MUTE = "dc_musica_mute";
const K_VOL = "dc_musica_volumen";

const leer = (clave, porDefecto) => sessionStorage.getItem(clave) ?? porDefecto;

let audio = null;

function crearAudio(pista, tiempo) {
  audio?.pause(); // corta cualquier audio previo (evita solapes)
  audio = new Audio(PISTAS[pista]);
  audio.loop = true;
  audio.volume = parseFloat(leer(K_VOL, "0.6"));
  audio.muted = leer(K_MUTE, "0") === "1";
  audio.currentTime = tiempo || 0;
  audio.addEventListener("timeupdate", () => {
    sessionStorage.setItem(K_TIEMPO, String(audio.currentTime));
  });

  const reproducir = () => audio.play().catch(() => {});
  reproducir();
  // Si el navegador bloquea el autoplay al cargar la página, se
  // reanuda con la primera interacción del usuario en esta página.
  document.addEventListener("pointerdown", reproducir, { once: true });
}

/** Arranca la música desde 0. Llamar al pulsar "Entrar al circo": siempre
 * reinicia, aunque quedara algo sonando de una carga anterior de la página. */
export function iniciarMusica() {
  sessionStorage.setItem(K_ACTIVA, "1");
  sessionStorage.setItem(K_PISTA, "tema");
  sessionStorage.setItem(K_TIEMPO, "0");
  crearAudio("tema", 0);
}

/** Para la música y borra su estado (usar en el reinicio de demo). */
export function detenerMusica() {
  audio?.pause();
  sessionStorage.removeItem(K_ACTIVA);
  sessionStorage.removeItem(K_PISTA);
  sessionStorage.removeItem(K_TIEMPO);
}

/** Cambia a "Our New Home" (abstracción al máximo o llegada al portal). */
export function sonarOurNewHome() {
  if (leer(K_PISTA, "tema") === "ournewhome") return; // ya está sonando
  sessionStorage.setItem(K_PISTA, "ournewhome");
  sessionStorage.setItem(K_TIEMPO, "0");
  if (audio) {
    audio.src = PISTAS.ournewhome;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }
}

let volumenPrevio = null;

/** Baja el volumen mientras Caine habla en el chat (y lo restaura después). */
export function atenuarMusica(activo) {
  if (!audio) return;
  if (activo) {
    if (volumenPrevio === null) volumenPrevio = audio.volume;
    audio.volume = volumenPrevio * 0.25;
  } else if (volumenPrevio !== null) {
    audio.volume = volumenPrevio;
    volumenPrevio = null;
  }
}

// ---- Continuar la música al cargar una página nueva ----
if (leer(K_ACTIVA, "0") === "1") {
  crearAudio(leer(K_PISTA, "tema"), parseFloat(leer(K_TIEMPO, "0")));
}

// ---- Control de altavoz + volumen, en el HUD de cada página ----
function construirControl() {
  const hud = document.getElementById("hud-flotante");
  if (!hud || document.getElementById("control-musica")) return;

  const panel = document.createElement("div");
  panel.className = "panel-hud";
  panel.id = "control-musica";
  panel.innerHTML =
    `<button id="btn-musica" type="button"></button>
     <input id="rango-musica" type="range" min="0" max="1" step="0.01"
            aria-label="Volumen de la música">`;
  hud.appendChild(panel);

  const btn = panel.querySelector("#btn-musica");
  const rango = panel.querySelector("#rango-musica");
  rango.value = leer(K_VOL, "0.6");

  const pintarBoton = (silenciado) => {
    btn.textContent = silenciado ? "🔇" : "🔊";
    btn.setAttribute("aria-label", silenciado ? "Activar música" : "Silenciar música");
  };
  pintarBoton(leer(K_MUTE, "0") === "1");

  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    panel.classList.toggle("abierto");
  });
  document.addEventListener("click", () => panel.classList.remove("abierto"));

  rango.addEventListener("input", () => {
    const v = parseFloat(rango.value);
    sessionStorage.setItem(K_VOL, String(v));
    if (!audio) return;
    audio.volume = v;
    if (v > 0 && audio.muted) {
      audio.muted = false;
      sessionStorage.setItem(K_MUTE, "0");
      pintarBoton(false);
    }
  });
}

construirControl();
