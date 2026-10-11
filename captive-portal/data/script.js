'use strict';

/* ==========================================================
   Textos de interfaz (el HTML se mantiene como esqueleto vacío)
   ========================================================== */
const UI = {
  titulo: 'Portal de Información Regional',
  seleccion: 'Selecciona tu región',
  senapredTitulo: '🛡️ Recomendaciones SENAPRED',
  senapredSub: 'Qué hacer ante terremotos, tsunamis, aluviones y más',
  volverMapa: '← Volver al mapa nacional',
  volverAtras: '← Volver atrás',
  botonProtocolos: '⚠️ Ver Protocolos de Emergencia de la Zona',
  protocolosTitulo: 'Protocolos de Emergencia',
  protocolosIntro: 'Recomendaciones basadas en las guías de SENAPRED. Ante cualquier emergencia, sigue siempre las instrucciones de las autoridades.',
  numeros: 'Emergencias: Ambulancia 131 · Bomberos 132 · Carabineros 133',
  errorCarga: 'No se pudo cargar la información de las regiones. Recarga la página para intentarlo de nuevo.',
  altImagen: 'Imagen satelital de '
};

/* ==========================================================
   Contenido de protocolos SENAPRED (HTML/CSS puro, sin PDFs)
   ========================================================== */
const PROTOCOLOS = [
  { icono: '🏚️', titulo: 'Terremoto', pasos: [
    'Mantén la calma y protégete: agáchate, cúbrete y afírmate bajo una mesa resistente o junto a un pilar o muro estructural.',
    'Aléjate de ventanas, vidrios y objetos que puedan caer. No uses ascensores.',
    'Cuando termine el movimiento, revisa si hay heridos y evita fósforos o velas por posibles fugas de gas.',
    'Si estás en zona costera y el sismo fue muy fuerte, evacúa de inmediato a un lugar alto.'
  ]},
  { icono: '🌊', titulo: 'Tsunami', pasos: [
    'Si el sismo es tan fuerte que cuesta mantenerse en pie o dura más de un minuto, evacúa sin esperar alertas oficiales.',
    'Camina a la zona segura más cercana, sobre la cota 30, o por las vías de evacuación señalizadas.',
    'No regreses hasta que las autoridades lo indiquen: pueden llegar varias olas durante horas.',
    'No te acerques a la costa a mirar el mar.'
  ]},
  { icono: '⛰️', titulo: 'Aluvión y remoción en masa', pasos: [
    'Ante lluvias intensas, ruidos fuertes en la quebrada o agua turbia, evacúa de inmediato.',
    'Aléjate de cauces, quebradas y laderas; sube a zonas altas por rutas laterales al cauce.',
    'No cruces cauces ni intentes rescatar tus bienes.',
    'Regresa solo cuando la autoridad lo autorice.'
  ]},
  { icono: '🔥', titulo: 'Incendio forestal', pasos: [
    'Si ves humo o llamas, avisa a Bomberos (132) y aléjate en dirección contraria al fuego y al viento.',
    'Sigue las instrucciones de evacuación y usa las rutas indicadas.',
    'Si hay humo, cubre nariz y boca con un paño húmedo.',
    'Nunca enciendas fuego cerca de vegetación seca.'
  ]},
  { icono: '🌋', titulo: 'Erupción volcánica', pasos: [
    'Infórmate por canales oficiales y respeta las zonas de exclusión.',
    'Protege vías respiratorias y ojos de la ceniza con mascarilla o paño húmedo y lentes.',
    'Cierra puertas y ventanas y protege las reservas de agua y alimentos.',
    'Evacúa por las rutas señaladas si la autoridad lo ordena.'
  ]}
];

/* ==========================================================
   Estado y utilidades
   ========================================================== */
const estado = {
  regiones: [],
  origenProtocolos: 'dashboard'   // 'dashboard' | 'region': a dónde vuelve el botón "Volver atrás"
};

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

function boton(clase, texto, alHacerClic) {
  const b = el('button', clase, texto);
  b.type = 'button';
  b.addEventListener('click', alHacerClic);
  return b;
}

function crearBarraVolver(texto, alHacerClic) {
  const barra = el('div', 'barra-volver');
  barra.appendChild(boton('boton-volver', texto, alHacerClic));
  return barra;
}

/* Muestra una vista, oculta las demás y sube al inicio */
function mostrarVista(nombre) {
  Object.keys(vistas).forEach(function (clave) {
    vistas[clave].classList.toggle('activa', clave === nombre);
  });
  window.scrollTo(0, 0);
}

/* ==========================================================
   Vista 1: Dashboard
   ========================================================== */
function renderDashboard(error) {
  const vista = vistas.dashboard;
  vista.innerHTML = '';

  // Tarjeta destacada SENAPRED (ancho completo, fuera de la cuadrícula)
  const senapred = boton('tarjeta-senapred', '', function () { abrirProtocolos('dashboard'); });
  senapred.appendChild(el('span', 'senapred-titulo', UI.senapredTitulo));
  senapred.appendChild(el('span', 'senapred-sub', UI.senapredSub));
  vista.appendChild(senapred);

  vista.appendChild(el('h2', 'subtitulo', UI.seleccion));

  const grid = el('div', 'grid-regiones');
  if (error) {
    grid.appendChild(el('p', 'mensaje-error', UI.errorCarga));
  } else {
    estado.regiones.forEach(function (region) {
      grid.appendChild(boton('tarjeta-region', region.nombre, function () { abrirRegion(region); }));
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

  vista.appendChild(crearBarraVolver(UI.volverMapa, function () { mostrarVista('dashboard'); }));
  vista.appendChild(el('h2', 'titulo-vista', region.nombre));

  // Imagen con lazy loading (el atributo se define ANTES de asignar src)
  const marco = el('div', 'marco-imagen');
  const img = document.createElement('img');
  img.setAttribute('loading', 'lazy');
  img.setAttribute('decoding', 'async');
  img.alt = UI.altImagen + region.nombre;
  img.addEventListener('error', function () { img.remove(); });  // si falta el archivo, queda el marco gris
  img.src = region.imagen;
  marco.appendChild(img);
  vista.appendChild(marco);

  vista.appendChild(el('p', 'texto-region', region.texto));
  vista.appendChild(boton('boton-accion', UI.botonProtocolos, function () { abrirProtocolos('region'); }));

  mostrarVista('region');
}

/* ==========================================================
   Vista 3: Protocolos de emergencia
   ========================================================== */
function renderProtocolos() {
  const vista = vistas.protocolos;
  vista.innerHTML = '';

  // Vuelve a la vista de origen (dashboard o región) según cómo llegó el usuario
  vista.appendChild(crearBarraVolver(UI.volverAtras, function () {
    mostrarVista(estado.origenProtocolos === 'region' ? 'region' : 'dashboard');
  }));
  vista.appendChild(el('h2', 'titulo-vista', UI.protocolosTitulo));
  vista.appendChild(el('p', 'intro-protocolos', UI.protocolosIntro));

  PROTOCOLOS.forEach(function (p) {
    const detalle = el('details', 'acordeon');
    detalle.appendChild(el('summary', '', p.icono + '  ' + p.titulo));
    const lista = el('ul', 'pasos');
    p.pasos.forEach(function (paso) { lista.appendChild(el('li', '', paso)); });
    detalle.appendChild(lista);
    vista.appendChild(detalle);
  });

  vista.appendChild(el('p', 'nota-emergencias', UI.numeros));
}

function abrirProtocolos(origen) {
  estado.origenProtocolos = origen;
  mostrarVista('protocolos');
}

/* ==========================================================
   Inicialización
   ========================================================== */
async function iniciar() {
  document.title = UI.titulo;
  document.getElementById('titulo-app').textContent = UI.titulo;
  renderProtocolos();

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
