'use strict';

/* ==========================================================
   Diccionario de riesgos (clave = valor en "riesgos" del JSON)
   icono: emoji nativo o etiqueta <img> local (con loading="lazy")
   ========================================================== */
const RIESGOS_CONFIG = {
  "calor_intenso": { nombre: "Calor Intenso", icono: "🌞" },
  "deslizamiento": { nombre: "Deslizamiento", icono: "🪨" },
  "erupciones": { nombre: "Erupciones Volcánicas", icono: "🌋" },
  "tsunami": { nombre: "Tsunami", icono: "🌊" },
  "heladas": { nombre: "Heladas", icono: "🧊" },
  "incendios": { nombre: "Incendios", icono: "🔥" },
  "inundaciones": { nombre: "Inundaciones", icono: "🌧️" },
  "nevadas": { nombre: "Nevadas", icono: "❄️" },
  "sismos": { nombre: "Sismos", icono: '<img src="sismo-icon.webp" class="custom-emoji" alt="Sismos" loading="lazy">' },
  "tornados": { nombre: "Tornados", icono: "🌪️" },
  "tormenta_electrica": { nombre: "Tormenta Eléctrica", icono: "🌩️" },
  "frio_extremo": { nombre: "Frío Extremo", icono: "🥶" },
  "tormenta_polvo": { nombre: "Tormenta de Polvo", icono: '<img src="polvo-icon.webp" class="custom-emoji" alt="Tormenta de Polvo" loading="lazy">' }
};

const UI = {
  titulo: 'Portal de Información Regional',
  seleccion: 'Selecciona tu región',
  senapredTitulo: '🛡️ Recomendaciones SENAPRED',
  senapredSub: 'Qué hacer ante cada riesgo natural',
  volverMapa: '← Volver al mapa nacional',
  botonProtocolos: '⚠️ Ver Protocolos de Emergencia de la Zona',
  errorCarga: 'No se pudo cargar la información de las regiones. Recarga la página para intentarlo de nuevo.',
  altImagen: 'Mapa satelital de '
};

/* ==========================================================
   Estado y utilidades
   ========================================================== */
const estado = { regiones: [], origenProtocolos: 'dashboard' };  // origen: 'dashboard' | 'region'

const vistas = {
  dashboard: document.getElementById('vista-dashboard'),
  region: document.getElementById('vista-region'),
  protocolos: document.getElementById('vista-protocolos')
};

function el(tag, clase, texto) {
  const nodo = document.createElement(tag);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function boton(clase, alHacerClic) {
  const b = el('button', clase);
  b.type = 'button';
  b.addEventListener('click', alHacerClic);
  return b;
}

/* Muestra una vista, oculta las demás y sube al inicio */
function mostrarVista(nombre) {
  Object.keys(vistas).forEach(function (clave) {
    vistas[clave].classList.toggle('activa', clave === nombre);
  });
  window.scrollTo(0, 0);
}

/* Icono de un riesgo: emoji nativo (texto) o <img> local definido en RIESGOS_CONFIG */
function crearIcono(clave) {
  const cfg = RIESGOS_CONFIG[clave];
  if (!cfg) return null;
  const s = el('span', 'icono');
  s.setAttribute('role', 'img');
  s.setAttribute('aria-label', cfg.nombre);
  if (cfg.icono.charAt(0) === '<') {
    s.innerHTML = cfg.icono;   // constante interna (no viene del usuario); el <img> ya incluye loading="lazy"
    s.querySelectorAll('img').forEach(function (img) {
      img.addEventListener('error', function () { img.remove(); });
    });
  } else {
    s.textContent = cfg.icono;
  }
  return s;
}

/* Fila de iconos; con etiqueta = chips con nombre (Detalle), sin etiqueta = solo iconos (Dashboard) */
function crearFilaRiesgos(claves, conEtiqueta) {
  const fila = el('span', conEtiqueta ? 'riesgos-region' : 'region-iconos');
  (claves || []).forEach(function (clave) {
    const icono = crearIcono(clave);
    if (!icono) { console.warn('Riesgo no definido en el diccionario: ' + clave); return; }
    if (!conEtiqueta) { fila.appendChild(icono); return; }
    const chip = el('span', 'chip-riesgo');
    chip.appendChild(icono);
    chip.appendChild(el('span', '', RIESGOS_CONFIG[clave].nombre));
    fila.appendChild(chip);
  });
  return fila;
}

/* ==========================================================
   Vista 1: Dashboard
   ========================================================== */
function renderDashboard(error) {
  const vista = vistas.dashboard;
  vista.innerHTML = '';

  const senapred = boton('tarjeta-senapred', function () { abrirProtocolos('dashboard'); });
  senapred.appendChild(el('span', 'senapred-titulo', UI.senapredTitulo));
  senapred.appendChild(el('span', 'senapred-sub', UI.senapredSub));
  vista.appendChild(senapred);

  vista.appendChild(el('h2', 'subtitulo', UI.seleccion));

  const grid = el('div', 'grid-regiones');
  if (error) {
    grid.appendChild(el('p', 'mensaje-error', UI.errorCarga));
  } else {
    estado.regiones.forEach(function (region) {
      const tarjeta = boton('tarjeta-region', function () { abrirRegion(region); });
      tarjeta.appendChild(el('span', 'region-nombre', region.nombre));
      tarjeta.appendChild(crearFilaRiesgos(region.riesgos, false));
      grid.appendChild(tarjeta);
    });
  }
  vista.appendChild(grid);
}

/* ==========================================================
   Vista 2: Detalle de región
   ========================================================== */
function abrirRegion(region) {
  const vista = vistas.region;
  vista.innerHTML = '';

  const barra = el('div', 'barra-volver');
  barra.appendChild(boton('boton-volver', function () { mostrarVista('dashboard'); })).textContent = UI.volverMapa;
  vista.appendChild(barra);

  vista.appendChild(el('h2', 'titulo-vista', region.nombre));

  // Imagen única (mapa satelital) con lazy loading
  const img = document.createElement('img');
  img.setAttribute('loading', 'lazy');   // antes de asignar src
  img.className = 'mapa-satelital';
  img.alt = UI.altImagen + region.nombre;
  img.addEventListener('error', function () { console.warn('Imagen no encontrada: ' + region.imagen); img.remove(); });
  img.src = region.imagen;
  vista.appendChild(img);

  vista.appendChild(crearFilaRiesgos(region.riesgos, true));
  vista.appendChild(el('p', 'texto-region', region.texto));
  vista.appendChild(boton('boton-accion', function () { abrirProtocolos('region'); })).textContent = UI.botonProtocolos;

  mostrarVista('region');
}

/* ==========================================================
   Vista 3: Protocolos SENAPRED (HTML estático + acordeones JS)
   ========================================================== */
function fijarAcordeon(item, abierto) {
  item.classList.toggle('abierto', abierto);
  item.querySelector('.acordeon-cabecera').setAttribute('aria-expanded', abierto ? 'true' : 'false');
  item.querySelector('.acordeon-panel').hidden = !abierto;
}

/* Solo un acordeón abierto a la vez; el abierto se acerca al inicio de la pantalla */
function alternarAcordeon(item) {
  const abrir = !item.classList.contains('abierto');
  vistas.protocolos.querySelectorAll('.acordeon.abierto').forEach(function (a) { fijarAcordeon(a, false); });
  if (abrir) {
    fijarAcordeon(item, true);
    item.scrollIntoView(true);
  }
}

function abrirProtocolos(origen) {
  estado.origenProtocolos = origen;
  mostrarVista('protocolos');
}

function iniciarProtocolos() {
  // Iconos desde el diccionario en las cabeceras de los acordeones
  vistas.protocolos.querySelectorAll('[data-icono]').forEach(function (nodo) {
    const icono = crearIcono(nodo.getAttribute('data-icono'));
    if (icono) nodo.appendChild(icono);
  });

  vistas.protocolos.addEventListener('click', function (e) {
    const cabecera = e.target.closest('.acordeon-cabecera');
    if (cabecera) alternarAcordeon(cabecera.parentNode);
  });

  // "Volver atrás": regresa a la Vista 2 o a la Vista 1 según de dónde vino el usuario
  document.getElementById('btn-volver-protocolos').addEventListener('click', function () {
    mostrarVista(estado.origenProtocolos === 'region' ? 'region' : 'dashboard');
  });
}

/* ==========================================================
   Inicialización
   ========================================================== */
async function iniciar() {
  document.title = UI.titulo;
  document.getElementById('titulo-app').textContent = UI.titulo;
  iniciarProtocolos();

  let error = false;
  try {
    const respuesta = await fetch('data.json');
    if (!respuesta.ok) throw new Error('HTTP ' + respuesta.status);
    estado.regiones = await respuesta.json();
  } catch (e) {
    console.error('Error cargando data.json:', e);
    error = true;
  }
  renderDashboard(error);
}

iniciar();
