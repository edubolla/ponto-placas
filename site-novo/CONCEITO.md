# Ponto Placas: conceito do site novo

## O que os concorrentes fazem
Analisados: Arrisca, Engagge, Placas D Premiação e Placas Express. O site da Bem Brasil é renderizado via JS e não foi lido.

- Todos levam o cliente ao mesmo lugar: um botão de WhatsApp ou um formulário genérico. Nenhum tem preço, configurador ou prévia.
- A prova social é fraca. Arrisca mostra logos sem depoimentos, Engagge usa estatísticas de terceiros sem fonte e a Placas D só tem fotos sem legenda.
- Informações objetivas como prazo, frete, materiais e medidas ficam escondidas no FAQ ou nem aparecem.
- Os melhores pontos de cada um: o processo em etapas da Engagge, a lista do que enviar da Arrisca, a nota do Google e o FAQ da Placas Express.

## Posicionamento
**Ponto Placas não vende uma placa, entrega o reconhecimento pronto.** A produção é premium, a gente cuida da arte, do mockup e do envio, e com o **Ponto Hub** o reconhecimento vira um programa recorrente e controlado. Nenhum concorrente tem algo parecido com o Hub, e ele é o maior trunfo da marca.

## Ideias que diferenciam
1. **Orçamento sem atrito.** Nada de montar ou personalizar no site. Uma seção curta lista o que mandar na conversa (tipo de peça, quantidade, data, cidade, logo e textos) e leva direto ao WhatsApp, onde a equipe conduz a personalização.
2. **Anatomia da placa.** Uma sequência controlada pelo scroll "explode" a placa nas 4 camadas reais: moldura, impressão UV, apliques 3D e vidro frontal (as fotos de etapas já existem). Mostra qualidade em vez de só afirmar.
3. **Transparência de cara.** A faixa de confiança no hero e o processo com prazos trazem prazo, envio para todo o Brasil, mockup antes de produzir e envio direto ao premiado. O FAQ fica curto e objetivo.

## Arquitetura da home
1. Header em pílula (mantido da identidade atual) com o CTA "Pedir orçamento"
2. Hero: headline + placa em camadas + 2 CTAs + faixa de confiança
3. Galeria em marquee (prova visual imediata)
4. Ocasiões (abas): metas de vendas, tempo de casa, eventos e premiações, mentorias, fechamento de deals (tombstones)
5. Anatomia da placa (scroll)
6. Produtos (placas, tombstones, troféus, caixas, press kits)
7. Peça seu orçamento (o que enviar + WhatsApp)
8. Ponto Hub: reconhecimento como programa
9. Processo em 4 passos com prazos
10. Galeria filtrável por categoria
11. FAQ
12. CTA final + rodapé

## Identidade
Mantida: fundo escuro, gradiente rosa→roxo→ciano, MADE Outer Sans + Inter. A evolução fica no movimento, sempre sutil e com respeito a `prefers-reduced-motion`, e nos componentes mais interativos.

## Técnica
HTML/CSS/JS estático, sem build, para funcionar tanto na Hostinger quanto na Vercel. A pasta `site-novo/` tem os próprios `assets/`.

## Pendências com o cliente
- Prazos reais, faixas de preço (se quiserem mostrar um "a partir de"), nota no Google, depoimentos e logos de clientes que autorizam a divulgação.
