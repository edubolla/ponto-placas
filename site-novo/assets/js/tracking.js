/* Ponto Placas: rastreamento (GA4 direto + dataLayer para o GTM)
 *
 * Cada interação gera DOIS registros, que não se duplicam entre si:
 *   1. gtag('event', ...)          -> vai direto para o GA4 (G-QSJWF97NGV)
 *   2. dataLayer.push({event, ...}) -> só o GTM (GTM-MQ5FSRK5) lê; serve de acionador
 * O gtag.js ignora pushes no formato {event: ...}, então o GA4 não conta duas vezes.
 * IMPORTANTE: no GTM, NÃO crie tags GA4 para estes eventos nem uma tag do Google
 * com G-QSJWF97NGV disparando em todas as páginas; isso duplicaria os dados no GA.
 *
 * Eventos:
 *   whatsapp_click  GA e dataLayer   button_location, button_text, button_context, link_url
 *   scroll          GA               percent_scrolled (50, 75, 100)
 *   scroll_depth    dataLayer        percent_scrolled (50, 75, 100)
 *   link_click      GA e dataLayer   link_name, link_url, link_position, link_type (página de links)
 *   Todo push do dataLayer leva também os UTMs e IDs de clique (ver atribuicao.js);
 *   o whatsapp_click leva ainda lead_ref e event_id.
 *   page_view       GA automático pelo gtag config; o GTM usa o próprio acionador de página.
 */
(function () {
  if (window.__ppTracking) return;
  window.__ppTracking = true;
  window.dataLayer = window.dataLayer || [];

  var pagina = document.body.getAttribute('data-pagina') || 'home';
  // chaves zeradas em todo push, para o GTM não herdar valores do evento anterior
  var CHAVES = ['button_location', 'button_text', 'button_context', 'link_name', 'link_url', 'link_position', 'link_type', 'percent_scrolled', 'lead_ref', 'event_id'];

  function limpar(txt) {
    return (txt || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  }

  function enviar(evGA, evDL, params) {
    if (evGA && typeof window.gtag === 'function') window.gtag('event', evGA, params);
    if (evDL) {
      var msg = { event: evDL, page_type: pagina };
      CHAVES.forEach(function (k) { msg[k] = params.hasOwnProperty(k) ? params[k] : undefined; });
      // UTMs e IDs de clique (atribuicao.js) acompanham todo evento do dataLayer
      if (window.ppAtribuicao) {
        var atrib = window.ppAtribuicao.dados();
        for (var k in atrib) if (atrib.hasOwnProperty(k)) msg[k] = atrib[k];
      }
      window.dataLayer.push(msg);
    }
  }

  function ehWhatsApp(href) {
    return /(^https?:\/\/)?(wa\.me|api\.whatsapp\.com|web\.whatsapp\.com)\//i.test(href || '');
  }

  // onde o botão está na página
  function localDoBotao(a) {
    if (a.hasAttribute('data-local')) return a.getAttribute('data-local');
    if (a.classList.contains('wa') || a.classList.contains('wa-btn')) return 'botao_flutuante';
    if (a.closest('header')) return 'header';
    if (a.closest('footer')) return 'rodape';
    if (a.closest('.links')) return 'cards_links';
    var sec = a.closest('section[id]');
    if (sec && sec.id === 'inicio') return 'hero';
    return sec ? sec.id : 'pagina';
  }

  // produto ou ocasião do card em que o botão está
  function contexto(a) {
    var bloco = a.closest('.prod, .painel-ocasiao, .card');
    if (!bloco) return undefined;
    var t = bloco.querySelector('h3, .card-title');
    return t ? limpar(t.textContent) : undefined;
  }

  function nomeDoLink(a) {
    if (a.classList.contains('social-btn')) return 'Ícone ' + limpar((a.getAttribute('aria-label') || '').replace(/ da Ponto Placas$/, ''));
    var t = a.querySelector('.card-title');
    return limpar(t ? t.textContent : a.textContent) || limpar(a.getAttribute('aria-label'));
  }

  function tipoDoLink(a) {
    var href = a.getAttribute('href') || '';
    if (ehWhatsApp(href)) return 'whatsapp';
    if (/instagram|tiktok|linkedin|youtube|pinterest|facebook/i.test(href)) return 'social';
    if (/^https?:\/\//i.test(href) && a.hostname !== location.hostname) return 'externo';
    return 'interno';
  }

  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var href = a.href;

    // página de links: todo clique vira link_click (é o relatório "em que as pessoas clicam")
    if (pagina === 'links') {
      var todos = Array.prototype.slice.call(document.querySelectorAll('.card, .social-btn, .wa-btn'));
      var pos = todos.indexOf(a);
      enviar('link_click', 'link_click', {
        link_name: nomeDoLink(a),
        link_url: href,
        link_position: pos >= 0 ? pos + 1 : undefined,
        link_type: tipoDoLink(a)
      });
    }

    if (ehWhatsApp(href)) {
      var info = {
        button_location: localDoBotao(a),
        button_text: nomeDoLink(a),
        button_context: contexto(a),
        link_url: href
      };
      // protocolo do lead e event_id; pode também gravar o protocolo na mensagem
      if (window.ppAtribuicao) {
        var lead = window.ppAtribuicao.cliqueWhatsApp(a, info);
        info.lead_ref = lead.lead_ref;
        info.event_id = lead.event_id;
      }
      enviar('whatsapp_click', 'whatsapp_click', info);
    }
  }, true);

  // rolagem: 50, 75 e 100%, uma vez cada por carregamento de página
  var marcos = [50, 75, 100];
  var feitos = {};
  var agendado = false;

  function medir() {
    agendado = false;
    var doc = document.documentElement;
    var altura = Math.max(doc.scrollHeight, document.body.scrollHeight);
    var visivel = window.innerHeight;
    if (altura <= visivel + 50) return; // página cabe na tela: não há rolagem para medir
    var pct = ((window.scrollY || doc.scrollTop) + visivel) / altura * 100;
    marcos.forEach(function (m) {
      // 100% com 2px de folga para arredondamentos do navegador
      var atingiu = m === 100 ? (window.scrollY + visivel) >= altura - 2 : pct >= m;
      if (atingiu && !feitos[m]) {
        feitos[m] = true;
        enviar('scroll', 'scroll_depth', { percent_scrolled: m });
      }
    });
  }

  window.addEventListener('scroll', function () {
    if (!agendado) { agendado = true; window.requestAnimationFrame(medir); }
  }, { passive: true });
})();
