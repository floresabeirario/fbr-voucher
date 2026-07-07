# fbr-voucher — voucher.floresabeirario.pt

Página pública do vale-presente digital da Flores à Beira-Rio. Quem recebe
um vale abre `voucher.floresabeirario.pt/CODIGO` e vê o cartão 3D com o
remetente, destinatário, valor e mensagem.

## Arquitectura

Site estático + 2 funções serverless na Vercel. **Sem build, sem
dependências npm.** Os dados vêm do Supabase do fbr-admin através da RPC
`get_voucher_by_code` (só devolve vales pagos e não arquivados; 7 colunas,
zero dados pessoais sensíveis).

| Ficheiro | Papel |
|---|---|
| `index.html` | A app inteira (CSS/JS inline): página de pesquisa sem código no URL; cartão 3D com código |
| `api/voucher.js` | Lookup JSON (`/api/voucher?code=…`), com rate limit 30/min/IP |
| `api/share.js` | O rewrite `/:code` (vercel.json) passa por aqui para injectar OG tags na partilha |
| `api/_ratelimit.js` | Rate limiter partilhado (o prefixo `_` impede a Vercel de o expor como endpoint) |
| `img/voucher-p*.webp` | As 2 páginas do cartão, pré-renderizadas do PDF (ver abaixo) |
| `voucher_azul.pdf` | Fonte de design do cartão — **não é deployado** (.vercelignore) |

Env vars na Vercel: `SUPABASE_URL` e `SUPABASE_ANON_KEY`.

## O design do cartão mudou?

Substituir `voucher_azul.pdf` e regenerar as imagens:

```
npm install --no-save playwright-core
node scripts/render-pdf.mjs
```

(Usa o Edge do Windows em headless; precisa de internet para o pdf.js.)

## Testar localmente

Servir a pasta com qualquer servidor estático (`npx serve .`). Sem as
funções `api/` a correr, abrir `/CODIGO` reencaminha para a pesquisa com
erro — é o comportamento esperado; para testar o cartão 3D completo usar
um mock ou o deploy de preview da Vercel.
