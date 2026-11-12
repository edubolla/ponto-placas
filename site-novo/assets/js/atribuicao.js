/* Ponto Placas: atribuição de anúncios (UTMs + IDs de clique) para o botão do WhatsApp
 *
 * O que faz:
 *   1. Lê da URL os UTMs e os IDs de clique das plataformas de anúncio e guarda no
 *      navegador por 90 dias (primeiro toque e último toque).
 *   2. Sem UTM na URL, classifica a origem pelo referenciador (orgânico, social,
 *      referência ou direto). Acesso direto nunca apaga uma origem já guardada.
 *   3. Publica tudo no dataLayer, para o GTM usar nas tags do Google Ads, Meta etc.
 *   4. A cada clique no WhatsApp gera um protocolo (lead_ref, ex.: PP-7K2M9Q) e um
 *      event_id (para deduplicar Pixel x API de Conversões). O tracking.js anexa
 *      esses dados ao evento whatsapp_click.
 *   5. Opcional: escreve o protocolo na mensagem do WhatsApp (REF_NA_MENSAGEM) e
 *      envia o registro do clique para uma planilha/CRM (ENDPOINT). Com os dois
 *      ligados dá para casar a venda fechada com o clique e subir conversão offline.
 *
 * Chaves no dataLayer (crie Variáveis de Camada de Dados no GTM com estes nomes):
 *   utm_source, utm_medium, utm_campaign, utm_content, utm_term, utm_id
 *   gclid, gbraid, wbraid (Google Ads) | fbclid, fbc, fbp (Meta) | ttclid (TikTok)
 *   msclkid (Microsoft) | li_fat_id (LinkedIn)
 *   ga_client_id, landing_page, referrer_origem, atrib_data
 *   first_utm_source, first_utm_medium, first_utm_campaign (primeiro toque)
 *   lead_ref, event_id (só no evento whatsapp_click)
 */
(function () {
  if (window.ppAtribuicao) return;

  var CONFIG = {
    DIAS: 90,                 // validade da origem guardada
    REF_NA_MENSAGEM: false,   // true = acrescenta "(Ref: PP-XXXXXX)" ao texto do WhatsApp
    ENDPOINT: ''              // URL que recebe o registro do clique em JSON (planilha, CRM, n8n); vazio = desligado
  };

  var UTMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id'];
  var CLIQUES = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'ttclid', 'msclkid', 'li_fat_id'];
  var K_ULTIMO = 'pp_atrib_ultimo';
  var K_PRIMEIRO = 'pp_atrib_primeiro';
  var memoria = {};

  function ler(k) {
    try {
      var v = JSON.parse(window.localStorage.getItem(k) || 'null');
      if (v && v.expira && v.expira < Date.now()) { window.localStorage.removeItem(k); return null; }
      return v;
    } catch (e) { return memoria[k] || null; }
  }
  function gravar(k, v) {
    memoria[k] = v;
    try { window.localStorage.setItem(k, JSON.stringify(v)); } catch (e) {}
  }
  function cookie(nome) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + nome + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  }
  function limpar(v) { return String(v).replace(/[\u0000-\u001f]/g, '').trim().slice(0, 200); }

  function parametrosDaUrl() {
    var r = {}, achou = false, q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return null; }
    UTMS.concat(CLIQUES).forEach(function (k) {
      var v = q.get(k);
      if (v) { r[k] = limpar(v); achou = true; }
    });
    if (!achou) return null;
    // clique de anúncio sem UTM: preenche a origem para não ficar em branco
    if (!r.utm_source) {
      if (r.gclid || r.gbraid || r.wbraid) { r.utm_source = 'google'; r.utm_medium = r.utm_medium || 'cpc'; }
      else if (r.fbclid) { r.utm_source = 'meta'; r.utm_medium = r.utm_medium || 'paid_social'; }
      else if (r.ttclid) { r.utm_source = 'tiktok'; r.utm_medium = r.utm_medium || 'paid_social'; }
      else if (r.msclkid) { r.utm_source = 'bing'; r.utm_medium = r.utm_medium || 'cpc'; }
      else if (r.li_fat_id) { r.utm_source = 'linkedin'; r.utm_medium = r.utm_medium || 'paid_social'; }
    }
    return r;
  }

  function origemDoReferenciador() {
    var ref = document.referrer, host;
    if (!ref) return null;
    try { host = new URL(ref).hostname.replace(/^www\./, ''); } catch (e) { return null; }
    if (host === window.location.hostname.replace(/^www\./, '')) return null; // navegação interna
    var r = { utm_source: host };
    if (/(^|\.)(google|bing|yahoo|duckduckgo|ecosia|brave|yandex)\./.test(host)) {
      r.utm_source = host.replace(/^.*?(google|bing|yahoo|duckduckgo|ecosia|brave|yandex).*$/, '$1');
      r.utm_medium = 'organic';
    } else if (/(chatgpt|openai|perplexity|claude|gemini|copilot)\./.test(host)) {
      r.utm_medium = 'ai';
    } else if (/(^|\.)(instagram|facebook|fb|linkedin|lnkd|tiktok|youtube|pinterest|twitter|x|t)\.(com|in|co|me)$/.test(host)) {
      r.utm_source = host.replace(/^(l|lm|m)\./, '').replace(/\.(com|in|co|me)$/, '');
      r.utm_medium = 'social';
    } else {
      r.utm_medium = 'referral';
    }
    return r;
  }

  function registrar() {
    var novo = parametrosDaUrl() || origemDoReferenciador();
    var ultimo = ler(K_ULTIMO);
    if (!novo && !ultimo) novo = { utm_source: '(direct)', utm_medium: '(none)' };
    if (novo) {
      novo.landing_page = window.location.origin + window.location.pathname;
      novo.referrer_origem = document.referrer ? limpar(document.referrer.split('?')[0]) : undefined;
      novo.atrib_data = new Date().toISOString();
      novo.expira = Date.now() + CONFIG.DIAS * 864e5;
      gravar(K_ULTIMO, novo);
      if (!ler(K_PRIMEIRO)) gravar(K_PRIMEIRO, novo);
      // a Meta usa o cookie _fbc; sem o Pixel na página ele não existe, então criamos
      if (novo.fbclid && !cookie('_fbc')) {
        var dominio = /\./.test(window.location.hostname) && !/^[\d.]+$/.test(window.location.hostname)
          ? '; domain=.' + window.location.hostname.replace(/^www\./, '') : '';
        document.cookie = '_fbc=fb.1.' + Date.now() + '.' + encodeURIComponent(novo.fbclid) +
          '; path=/; max-age=' + CONFIG.DIAS * 86400 + dominio + '; SameSite=Lax';
      }
    }
  }

  // dados de atribuição prontos para o dataLayer (chaves sempre presentes)
  function dados() {
    var u = ler(K_ULTIMO) || {}, p = ler(K_PRIMEIRO) || {}, r = {};
    UTMS.concat(CLIQUES, ['landing_page', 'referrer_origem', 'atrib_data']).forEach(function (k) { r[k] = u[k]; });
    r.first_utm_source = p.utm_source;
    r.first_utm_medium = p.utm_medium;
    r.first_utm_campaign = p.utm_campaign;
    r.fbp = cookie('_fbp');
    r.fbc = cookie('_fbc');
    var ga = cookie('_ga');
    r.ga_client_id = ga ? ga.split('.').slice(-2).join('.') : undefined;
    return r;
  }

  function codigo(n) {
    var letras = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', s = '', i;
    var rnd = window.crypto && window.crypto.getRandomValues ? window.crypto.getRandomValues(new Uint8Array(n)) : null;
    for (i = 0; i < n; i++) s += letras.charAt((rnd ? rnd[i] : Math.floor(Math.random() * 256)) % letras.length);
    return s;
  }

  // chamado pelo tracking.js a cada clique em link de WhatsApp
  function cliqueWhatsApp(a, info) {
    var lead = { lead_ref: 'PP-' + codigo(6), event_id: Date.now() + '.' + codigo(8) };

    if (CONFIG.REF_NA_MENSAGEM) {
      try {
        var original = a.getAttribute('data-href-original') || a.getAttribute('href');
        a.setAttribute('data-href-original', original);
        var url = new URL(original, window.location.href);
        var texto = url.searchParams.get('text');
        url.searchParams.set('text', (texto ? texto + ' ' : '') + '(Ref: ' + lead.lead_ref + ')');
        a.setAttribute('href', url.toString().replace(/\+/g, '%20')); // wa.me espera %20, não +
      } catch (e) {}
    }

    if (CONFIG.ENDPOINT && navigator.sendBeacon) {
      var registro = dados(), k;
      for (k in info) if (info.hasOwnProperty(k)) registro[k] = info[k];
      registro.lead_ref = lead.lead_ref;
      registro.event_id = lead.event_id;
      registro.data_clique = new Date().toISOString();
      registro.pagina = window.location.origin + window.location.pathname;
      // text/plain evita o preflight de CORS (funciona com Google Apps Script)
      try { navigator.sendBeacon(CONFIG.ENDPOINT, new Blob([JSON.stringify(registro)], { type: 'text/plain;charset=UTF-8' })); } catch (e) {}
    }
    return lead;
  }

  registrar();
  window.ppAtribuicao = { dados: dados, cliqueWhatsApp: cliqueWhatsApp, config: CONFIG };

  // disponível para o GTM desde o carregamento (objeto sem "event": o gtag.js ignora)
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(dados());
})();
