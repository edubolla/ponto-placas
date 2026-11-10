/* Ponto Placas - nova home (protótipo). JS puro, sem dependências. */
(function () {
  'use strict';
  var d = document;
  var $ = function (s, r) { return (r || d).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || d).querySelectorAll(s)); };
  var reduzir = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- header + menu mobile ---------- */
  var header = $('.header');
  var toggle = $('.menu-toggle');
  function fechaMenu() {
    header.classList.remove('aberto');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Abrir menu');
  }
  toggle.addEventListener('click', function () {
    var a = header.classList.toggle('aberto');
    toggle.setAttribute('aria-expanded', a ? 'true' : 'false');
    toggle.setAttribute('aria-label', a ? 'Fechar menu' : 'Abrir menu');
  });
  $$('.nav a').forEach(function (a) { a.addEventListener('click', fechaMenu); });
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && header.classList.contains('aberto')) { fechaMenu(); toggle.focus(); }
  });

  /* ---------- reveal ---------- */
  var rev = $$('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    rev.forEach(function (el) { io.observe(el); });
  } else {
    rev.forEach(function (el) { el.classList.add('visivel'); });
  }

  /* ---------- hero: inclinação 3D leve seguindo o mouse (máx. 6deg) ---------- */
  var placa = $('[data-placa]');
  if (placa && !reduzir && window.matchMedia('(hover:hover)').matches) {
    var wrap = placa.parentNode;
    wrap.addEventListener('mousemove', function (e) {
      var r = wrap.getBoundingClientRect();
      placa.style.setProperty('--mx', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
      placa.style.setProperty('--my', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
    });
    wrap.addEventListener('mouseleave', function () {
      placa.style.setProperty('--mx', 0); placa.style.setProperty('--my', 0);
    });
  }

  /* ---------- abas de ocasiões ---------- */
  var tabs = $$('.tabs [role="tab"]');
  function selTab(t, foco) {
    tabs.forEach(function (x) {
      var on = x === t;
      x.setAttribute('aria-selected', on ? 'true' : 'false');
      x.tabIndex = on ? 0 : -1;
      var p = d.getElementById(x.getAttribute('aria-controls'));
      if (p) {
        p.hidden = !on;
        if (on && !reduzir) { p.classList.remove('troca'); void p.offsetWidth; p.classList.add('troca'); }
      }
    });
    if (foco) t.focus();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener('click', function () { selTab(t); });
    t.addEventListener('keydown', function (e) {
      var n = null;
      if (e.key === 'ArrowRight') n = tabs[(i + 1) % tabs.length];
      else if (e.key === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      else if (e.key === 'Home') n = tabs[0];
      else if (e.key === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); selTab(n, true); }
    });
  });

  /* ---------- anatomia (sticky controlado pelo scroll) ---------- */
  var anat = $('[data-anat]');
  var stage = $('[data-stage]');
  var camadas = $$('[data-camada]');
  var legs = $$('[data-leg]');
  var ticking = false;
  function anatUpdate() {
    ticking = false;
    if (!anat || !stage) return;
    if (window.innerWidth <= 900) { stage.style.removeProperty('--p'); return; }
    var r = anat.getBoundingClientRect();
    var total = r.height - window.innerHeight;
    var p = total > 0 ? Math.max(0, Math.min(1, -r.top / total)) : 0;
    var vis = Math.max(0, Math.min(1, p * 1.25)); /* separa nos primeiros 80% */
    stage.style.setProperty('--p', vis.toFixed(3));
    var ativa = p < 0.04 ? -1 : Math.min(3, Math.floor(p * 4));
    camadas.forEach(function (c, i) { c.classList.toggle('ativa', i === ativa); });
    legs.forEach(function (l, i) { l.classList.toggle('ativa', i === ativa); });
  }
  function onScroll() {
    if (header) header.classList.toggle('rolou', window.scrollY > 30);
    if (!ticking) { ticking = true; requestAnimationFrame(anatUpdate); }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- galeria filtrável + lightbox ---------- */
  var itens = $$('#gal li');
  var filtros = $$('.filtro');
  var cont = $('#gal-contagem');
  function filtrar(cat) {
    var n = 0;
    itens.forEach(function (li) {
      var mostra = cat === 'Todas' || li.getAttribute('data-cat') === cat;
      li.hidden = !mostra; if (mostra) n++;
    });
    filtros.forEach(function (f) { f.setAttribute('aria-pressed', f.getAttribute('data-filtro') === cat ? 'true' : 'false'); });
    cont.textContent = n + (n === 1 ? ' peça' : ' peças') + (cat === 'Todas' ? '' : ' em ' + cat);
  }
  filtros.forEach(function (f) { f.addEventListener('click', function () { filtrar(f.getAttribute('data-filtro')); }); });
  filtrar('Todas');

  var lb = $('#lb'), lbImg = $('#lb-img'), lbLeg = $('#lb-leg');
  var lista = [], idx = 0, ultimoFoco = null;
  function lbMostra() {
    var b = lista[idx];
    lbImg.src = b.getAttribute('data-src');
    var alt = $('img', b).alt;
    lbImg.alt = alt;
    lbLeg.textContent = alt + ' (' + (idx + 1) + ' de ' + lista.length + ')';
  }
  function lbAbre(b) {
    lista = itens.filter(function (li) { return !li.hidden; }).map(function (li) { return $('button', li); });
    idx = lista.indexOf(b); if (idx < 0) idx = 0;
    ultimoFoco = b;
    lbMostra(); lb.hidden = false; d.body.style.overflow = 'hidden';
    $('.lb__fechar', lb).focus();
  }
  function lbFecha() { lb.hidden = true; d.body.style.overflow = ''; lbImg.src = ''; if (ultimoFoco) ultimoFoco.focus(); }
  function lbNav(s) { idx = (idx + s + lista.length) % lista.length; lbMostra(); }
  $$('#gal button').forEach(function (b) { b.addEventListener('click', function () { lbAbre(b); }); });
  $('.lb__fechar', lb).addEventListener('click', lbFecha);
  $('.lb__ant', lb).addEventListener('click', function () { lbNav(-1); });
  $('.lb__prox', lb).addEventListener('click', function () { lbNav(1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) lbFecha(); });
  d.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') lbFecha();
    else if (e.key === 'ArrowLeft') lbNav(-1);
    else if (e.key === 'ArrowRight') lbNav(1);
    else if (e.key === 'Tab') {
      var fs = $$('button', lb), i = fs.indexOf(d.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); fs[fs.length - 1].focus(); }
      else if (!e.shiftKey && i === fs.length - 1) { e.preventDefault(); fs[0].focus(); }
    }
  });
})();
