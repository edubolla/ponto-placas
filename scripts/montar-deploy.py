#!/usr/bin/env python3
"""Monta a pasta deploy/public_html, pronta para subir por FTP na Hostinger.

Estrutura final (raiz do domínio):
  /                      site novo (site-novo/index.html)
  /links/                página de links
  /assets/               arquivos do site novo
  /ponto-hub/, /termos-de-uso-e-politica-de-privacidade/, /404.html
                         páginas do site anterior, usando /assets-legado/
  robots.txt, sitemap.xml, llms.txt, .htaccess

Uso: python3 scripts/montar-deploy.py
"""
import re, shutil, sys, zipfile
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
NOVO = RAIZ / 'site-novo'
SAIDA = RAIZ / 'deploy' / 'public_html'
IGNORAR = shutil.ignore_patterns('.DS_Store', '*.md')

HEAD = '''<!-- Google tag (gtag.js): GA4 instalado direto na página -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-QSJWF97NGV"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-QSJWF97NGV', /[?&]debug=1/.test(location.search) ? {debug_mode: true} : {});
</script>
<!-- Google Tag Manager (não configurar GA4 de novo dentro do container: duplicaria o page_view) -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-MQ5FSRK5');</script>
<!-- End Google Tag Manager -->
'''
NOSCRIPT = '''
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-MQ5FSRK5" height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->'''


def versao(nome):
    m = re.search(re.escape(nome) + r'\?v=(\d+)', (NOVO / 'index.html').read_text())
    return m.group(1) if m else '1'


def legado(origem, destino, pagina, prefixo):
    """Página do site anterior: troca assets -> assets-legado e injeta o rastreamento."""
    s = origem.read_text()
    s = s.replace('../assets/', '../assets-legado/').replace('"/assets/', '"/assets-legado/')
    if 'googletagmanager' not in s:
        s, n1 = re.subn(r'(<meta name="viewport"[^>]*>\n?)', lambda m: m.group(1) + HEAD, s, count=1)
        s, n2 = re.subn(r'<body([^>]*)>', lambda m: '<body%s data-pagina="%s">%s' % (m.group(1), pagina, NOSCRIPT), s, count=1)
        scripts = ('<script src="%sassets/js/atribuicao.js?v=%s" defer></script>\n'
                   '<script src="%sassets/js/tracking.js?v=%s" defer></script>\n</body>'
                   % (prefixo, versao('atribuicao.js'), prefixo, versao('tracking.js')))
        s, n3 = re.subn(r'</body>', lambda m: scripts, s, count=1)
        if not (n1 and n2 and n3):
            sys.exit('Não consegui injetar o rastreamento em %s' % origem)
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text(s)


def copiar_legado_usado():
    """Copia para assets-legado/ só o que as páginas antigas usam.
    Arquivo idêntico ao do site novo é apontado para /assets/ em vez de copiado."""
    import filecmp
    paginas = [SAIDA / 'ponto-hub' / 'index.html', SAIDA / 'termos-de-uso-e-politica-de-privacidade' / 'index.html', SAIDA / '404.html']
    usados = set()
    for html in paginas:
        s = html.read_text()
        def troca(m):
            rel = m.group(2)
            novo = SAIDA / 'assets' / rel
            if novo.exists() and filecmp.cmp(novo, RAIZ / 'assets' / rel, shallow=False):
                return m.group(1) + 'assets/' + rel
            usados.add(rel)
            return m.group(0)
        s = re.sub(r'((?:\.\./|/))assets-legado/([^"?#)]+)', troca, s)
        html.write_text(s)
    css = (RAIZ / 'assets' / 'css' / 'style.css').read_text()
    usados.add('css/style.css')
    usados.update(re.findall(r'url\(["\']?\.\./([^)"\'?#]+)', css))
    for rel in sorted(usados):
        destino = SAIDA / 'assets-legado' / rel
        destino.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy(RAIZ / 'assets' / rel, destino)


def conferir():
    """Todo href/src local precisa existir na pasta final."""
    erros = []
    for html in SAIDA.rglob('*.html'):
        for ref in re.findall(r'(?:href|src)="([^"]+)"', html.read_text()):
            ref = ref.split('#')[0].split('?')[0]
            if not ref or re.match(r'(https?:|mailto:|tel:|data:|//)', ref):
                continue
            alvo = (SAIDA / ref.lstrip('/')) if ref.startswith('/') else (html.parent / ref)
            alvo = alvo.resolve()
            if alvo.is_dir():
                alvo = alvo / 'index.html'
            if not alvo.exists() or SAIDA.resolve() not in alvo.parents:
                erros.append('%s -> %s' % (html.relative_to(SAIDA), ref))
    return erros


def main():
    if SAIDA.parent.exists():
        shutil.rmtree(SAIDA.parent)
    SAIDA.mkdir(parents=True)

    # site novo na raiz
    shutil.copytree(NOVO / 'assets', SAIDA / 'assets', ignore=IGNORAR)
    home = (NOVO / 'index.html').read_text()
    home = home.replace('href="../ponto-hub/"', 'href="ponto-hub/"')
    home = home.replace('href="../termos-de-uso-e-politica-de-privacidade/"', 'href="termos-de-uso-e-politica-de-privacidade/"')
    (SAIDA / 'index.html').write_text(home)
    (SAIDA / 'links').mkdir()
    links = (NOVO / 'links' / 'index.html').read_text().replace('href="../../ponto-hub/"', 'href="../ponto-hub/"')
    (SAIDA / 'links' / 'index.html').write_text(links)

    # páginas do site anterior
    legado(RAIZ / 'ponto-hub' / 'index.html', SAIDA / 'ponto-hub' / 'index.html', 'ponto-hub', '../')
    t = 'termos-de-uso-e-politica-de-privacidade'
    legado(RAIZ / t / 'index.html', SAIDA / t / 'index.html', 'termos', '../')
    legado(RAIZ / '404.html', SAIDA / '404.html', '404', '/')

    copiar_legado_usado()

    # imagem de compartilhamento do Ponto Hub (o og:image aponta para /assets/img/)
    shutil.copy(RAIZ / 'assets' / 'img' / 'og-ponto-hub.png', SAIDA / 'assets' / 'img' / 'og-ponto-hub.png')

    # indexação e servidor
    for nome in ('robots.txt', 'llms.txt', '.htaccess'):
        shutil.copy(RAIZ / nome, SAIDA / nome)
    shutil.copy(NOVO / 'favicon.ico', SAIDA / 'favicon.ico')  # pedido automático de navegadores e do Google
    robots = (SAIDA / 'robots.txt').read_text()
    robots = re.sub(r'# Homologação[^\n]*\n', '', robots)
    robots = robots.replace('Disallow: /site-novo/\n', '').replace(', exceto a área de homologação', '')
    (SAIDA / 'robots.txt').write_text(robots)
    mapa = re.sub(r'<lastmod>[^<]*</lastmod>', '<lastmod>%s</lastmod>' % date.today().isoformat(),
                  (RAIZ / 'sitemap.xml').read_text())
    (SAIDA / 'sitemap.xml').write_text(mapa)

    erros = conferir()
    if erros:
        print('LINKS QUEBRADOS:')
        print('\n'.join('  ' + e for e in erros))
        sys.exit(1)

    zipado = SAIDA.parent / 'ponto-placas-public_html.zip'
    with zipfile.ZipFile(zipado, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in sorted(SAIDA.rglob('*')):
            if f.is_file():
                z.write(f, f.relative_to(SAIDA))
    arquivos = [f for f in SAIDA.rglob('*') if f.is_file()]
    print('OK: %d arquivos, %.1f MB em %s' % (len(arquivos), sum(f.stat().st_size for f in arquivos) / 1e6, SAIDA.relative_to(RAIZ)))
    print('ZIP: %s (%.1f MB)' % (zipado.relative_to(RAIZ), zipado.stat().st_size / 1e6))


if __name__ == '__main__':
    main()
