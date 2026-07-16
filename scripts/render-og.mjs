// Gera img/og-voucher.jpg (1200×630) — imagem Open Graph usada nas
// pré-visualizações de partilha (WhatsApp/redes). Mostra o presente azul
// do favicon sobre o fundo creme da marca (pedido da Maria, 16/07:
// o preview deve ser o presente azul, não a capa do cartão).
//
//   npm install --no-save playwright-core   (uma vez)
//   node scripts/render-og.mjs
//
// Usa o Edge instalado no Windows (channel msedge), como render-pdf.mjs.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8127;

const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

// Presente azul do favicon (PNG 512×512 transparente), em grande.
// 1200×630 é a proporção que o WhatsApp mostra como preview largo.
const GIFT_SIZE = 560;

const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px; overflow: hidden;
    display: flex; align-items: center; justify-content: center;
    background: #FAF7F0;
    background-image:
      radial-gradient(ellipse 90% 70% at 50% 30%, rgba(61,107,94,0.08) 0%, transparent 100%),
      radial-gradient(ellipse 50% 40% at 75% 75%, rgba(184,149,74,0.06) 0%, transparent 100%);
  }
  .scene { position: relative; }
  .ground {
    position: absolute; left: 50%; bottom: 26px; transform: translateX(-50%);
    width: 78%; height: 44px;
    background: radial-gradient(ellipse, rgba(61,80,140,0.30) 0%, transparent 68%);
    filter: blur(14px);
  }
  .gift {
    position: relative;
    width: ${GIFT_SIZE}px; height: ${GIFT_SIZE}px;
    display: block;
  }
</style></head>
<body>
  <div class="scene">
    <div class="ground"></div>
    <img class="gift" src="/favicon/web-app-manifest-512x512.png" alt="">
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`http://localhost:${PORT}/index.html`); // origem para URLs relativos
  await page.setContent(html.replace('src="/favicon/', `src="http://localhost:${PORT}/favicon/`), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const out = path.join(root, 'img', 'og-voucher.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
  console.log(`img/og-voucher.jpg  1200x630  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
  server.close();
}
