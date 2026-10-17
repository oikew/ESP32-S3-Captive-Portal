'use strict';

// Paleta térmica: norte cálido -> sur glaciar (orden estricto de las 16 regiones)
const PALETA = ["#E8D5C4", "#E3CDB8", "#DEC4AC", "#D9BCA0", "#C4C1A4", "#AFBFA2", "#A4B9A7", "#9AB3AC", "#8EACB2", "#86A4B7", "#7CA0BE", "#7097C2", "#6B8EBC", "#6485B3", "#5A78A8", "#4C6899"];

const ic = (id, n) => `<img src="icon-${id}.webp" class="custom-emoji" alt="${n}" loading="lazy">`;

const RIESGOS_CONFIG = {
  calor_intenso:     { nombre: 'Calor intenso',         icono: ic('calor_intenso', 'Calor intenso') },
  deslizamiento:     { nombre: 'Deslizamiento',         icono: ic('deslizamiento', 'Deslizamiento') },
  erupciones:        { nombre: 'Erupciones volcánicas', icono: ic('erupciones', 'Erupciones volcánicas') },
  tsunami:           { nombre: 'Tsunami',               icono: ic('tsunami', 'Tsunami') },
  heladas:           { nombre: 'Heladas',               icono: ic('heladas', 'Heladas') },
  incendios:         { nombre: 'Incendios forestales',  icono: ic('incendios', 'Incendios forestales') },
  inundaciones:      { nombre: 'Inundaciones',          icono: ic('inundaciones', 'Inundaciones') },
  nevadas:           { nombre: 'Nevadas',               icono: ic('nevadas', 'Nevadas') },
  sismos:            { nombre: 'Sismos',                icono: ic('sismos', 'Sismos') },
  tornados:          { nombre: 'Tornados',              icono: ic('tornados', 'Tornados') },
  tormenta_electrica:{ nombre: 'Tormenta eléctrica',    icono: ic('tormenta_electrica', 'Tormenta eléctrica') },
  frio_extremo:      { nombre: 'Frío extremo',          icono: ic('frio_extremo', 'Frío extremo') },
  tormenta_polvo:    { nombre: 'Tormenta de polvo',     icono: ic('tormenta_polvo', 'Tormenta de polvo') },
  vientos_fuertes:   { nombre: 'Vientos fuertes',       icono: ic('vientos_fuertes', 'Vientos fuertes') },
  lluvias_intensas:  { nombre: 'Lluvias intensas',      icono: ic('lluvias_intensas', 'Lluvias intensas') }
};

const $ = s => document.querySelector(s);
const VISTAS = ['v-dashboard', 'v-detalle', 'v-senapred'];
let REGIONES = [];
let interna = false; // true una vez que hubo navegación dentro de la SPA

function vista(id) {
  VISTAS.forEach(v => { $('#' + v).hidden = v !== id; });
  window.scrollTo(0, 0);
}

function pintarDashboard() {
  const grid = $('#grid');
  grid.innerHTML = '';
  REGIONES.forEach((r, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'card' + (i >= 14 ? ' claro' : '');
    b.style.background = PALETA[i];
    b.textContent = r.nombre;
    b.addEventListener('click', () => { location.hash = 'region/' + r.id; });
    grid.appendChild(b);
  });
}

function abrirRegion(i) {
  const r = REGIONES[i];
  const bar = $('#detalle-bar');
  bar.style.setProperty('--c', PALETA[i]);
  bar.classList.toggle('claro', i >= 14);
  $('#detalle-titulo').textContent = r.nombre;

  const box = $('#detalle-img-box');
  const img = $('#detalle-img');
  if (r.imagen) {
    img.alt = 'Imagen de ' + r.nombre;
    img.src = r.imagen;
    box.hidden = false;
  } else {
    img.removeAttribute('src');
    box.hidden = true;
  }

  const fila = $('#detalle-riesgos');
  fila.innerHTML = '';
  (r.riesgos || []).forEach(id => {
    const c = RIESGOS_CONFIG[id];
    if (!c) return;
    const f = document.createElement('figure');
    f.innerHTML = c.icono + '<figcaption>' + c.nombre + '</figcaption>';
    fila.appendChild(f);
  });
  fila.hidden = !fila.children.length;

  const t = $('#detalle-texto');
  t.textContent = r.texto || '';
  t.hidden = !r.texto;

  $('#detalle-vacio').hidden = !!(r.imagen || r.texto || fila.children.length);
  vista('v-detalle');
}

function ruta() {
  const h = location.hash.slice(1);
  if (h === 'senapred') return vista('v-senapred');
  if (h.startsWith('region/')) {
    const i = REGIONES.findIndex(r => r.id === h.slice(7));
    if (i > -1) return abrirRegion(i);
  }
  vista('v-dashboard');
}

document.addEventListener('click', e => {
  if (e.target.closest('[data-volver]')) {
    if (interna) history.back(); else location.replace('#');
    return;
  }
  const h = e.target.closest('.acc-head');
  if (!h) return;
  const acc = h.parentElement;
  const abre = !acc.classList.contains('open');
  document.querySelectorAll('.acc.open').forEach(x => {
    x.classList.remove('open');
    x.firstElementChild.setAttribute('aria-expanded', 'false');
  });
  if (abre) {
    acc.classList.add('open');
    h.setAttribute('aria-expanded', 'true');
  }
});

window.addEventListener('hashchange', () => { interna = true; ruta(); });

fetch('data.json')
  .then(res => { if (!res.ok) throw new Error(res.status); return res.json(); })
  .then(datos => { REGIONES = datos; pintarDashboard(); })
  .catch(() => { $('#grid').textContent = 'No se pudieron cargar las regiones. Recarga la página.'; })
  .finally(ruta);
