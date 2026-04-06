# CLAUDE.md — fbr-voucher

## Projeto

Vale presente digital para **Flores à Beira-Rio** — marca de preservação botânica artesanal portuguesa.

O projeto é uma página HTML única (`index.html`) que apresenta um vale presente interativo com animações CSS/JS. Não há build step, bundler, framework, nem dependências de npm — é HTML/CSS/JS puro, servido diretamente ao browser.

## Estrutura

```
fbr-voucher/
├── index.html        # Toda a lógica, estilos e markup num único ficheiro
├── voucher_azul.pdf  # PDF do vale imprimível (referência de design)
└── README.md
```

## Decisões de design

- **Ficheiro único**: toda a CSS e JS está inline em `index.html` para facilitar entrega ao cliente e evitar problemas de paths relativos.
- **Gatefold card**: o cartão abre como uma capa de livro — dois painéis laterais dobram para dentro. A geometria está documentada em comentários dentro do ficheiro.
- **Paleta**: verde (`#3D6B5E`), creme (`#FAF7F0`), terracota (`#C4846B`), ouro (`#B8954A`).
- **Tipografia**: Cormorant Garamond (serifa elegante para títulos) + Jost (sans-serif leve para corpo).
- **Animações**: envelope que abre → cartão que sobe → cartão gatefold que se desdobra. Tudo em CSS transitions com JS a gerir os estados.
- **`noindex, nofollow`**: a página é privada, não deve ser indexada.

## Fontes externas

- Google Fonts (Cormorant Garamond + Jost) — carregadas via CDN.

## Como testar

Abrir `index.html` directamente no browser (sem servidor necessário).

## Convenções

- Manter tudo num único ficheiro HTML.
- Comentários em português ou inglês (o ficheiro já mistura os dois — manter consistência local).
- Variáveis CSS em `:root` para todos os valores de cor e geometria — nunca usar valores hardcoded no CSS sem razão.
- Não adicionar frameworks ou dependências externas sem pedido explícito do cliente.
- Preservar a identidade visual da marca: elegância minimalista, tons naturais, sem elementos visuais que pareçam genéricos ou digitais demais.
- **Mobile é obrigatório**: tudo o que é implementado para desktop deve também funcionar em mobile, de forma adaptada — touch events, tamanhos adequados ao ecrã, layout responsivo.
