/* Ponto Placas / Ponto Hub - interações leves (sem dependências) */
(function () {
  'use strict';
  var d = document;

  /* menu mobile */
  var header = d.querySelector('.site-header');
  var toggle = d.querySelector('.menu-toggle');
  if (header && toggle) {
    toggle.addEventListener('click', function () {
      var aberto = header.classList.toggle('menu-aberto');
      toggle.setAttribute('aria-expanded', aberto ? 'true' : 'false');
    });
    d.querySelectorAll('.nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        header.classList.remove('menu-aberto');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* cabeçalho ganha fundo ao rolar */
  function onScroll() {
    if (header) header.classList.toggle('rolou', window.scrollY > 40);
    fillTimeline();
  }

  /* linha do tempo: preenche conforme a rolagem */
  var tl = d.querySelector('[data-timeline]');
  var fill = tl && tl.querySelector('.linha-tempo__fill');
  function fillTimeline() {
    if (!tl || !fill) return;
    var r = tl.getBoundingClientRect();
    var vh = window.innerHeight;
    var pct = (vh * 0.6 - r.top) / r.height;
    pct = Math.max(0, Math.min(1, pct));
    fill.style.height = (pct * 100) + '%';
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', fillTimeline);
  onScroll();

  /* revelar elementos ao entrar na tela */
  var els = d.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('visivel'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('visivel'); });
  }
})();
