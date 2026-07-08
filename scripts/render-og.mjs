// Gera img/og-voucher.jpg (1200×630) — imagem Open Graph usada nas
// pré-visualizações de partilha (WhatsApp/redes). Mostra a capa fechada
// do cartão sobre o fundo creme da marca. Correr sempre que o design
// do cartão (voucher-p2.webp) mudar:
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

const MIME = { '.html': 'text/html; charset=utf-8', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

// Capa fechada = quartos exteriores da página 2 lado a lado
// (mesma fatia que o site usa no estado fechado). Proporção da capa:
// meia folha A4 landscape → (297/2)/210 ≈ 0.7071 (largura/altura).
const CARD_H = 470;
const CARD_W = Math.round(CARD_H * (297 / 2) / 210);

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
    position: absolute; left: 50%; bottom: -26px; transform: translateX(-50%);
    width: 92%; height: 42px;
    background: radial-gradient(ellipse, rgba(0,0,0,0.45) 0%, transparent 68%);
    filter: blur(12px);
  }
  .card {
    position: relative;
    width: ${CARD_W}px; height: ${CARD_H}px;
    display: flex;
    transform: rotate(-1.5deg);
    box-shadow: 0 26px 60px rgba(0,0,0,0.20), 0 6px 16px rgba(0,0,0,0.10);
  }
  .half {
    width: 50%; height: 100%;
    background-image: url('/img/voucher-p2.webp');
    background-size: 400% 100%;
    background-repeat: no-repeat;
  }
  /* Estado fechado do site: flap esquerdo = página 2 [75–100%],
     flap direito = página 2 [0–25%] (ver updateCoverCanvases) */
  .half.left  { background-position: 100% 0; }
  .half.right { background-position: 0% 0; }
</style></head>
<body>
  <div class="scene">
    <div class="ground"></div>
    <div class="card"><div class="half left"></div><div class="half right"></div></div>
  </div>
</body></html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  await page.goto(`http://localhost:${PORT}/index.html`); // origem para URLs relativos
  await page.setContent(html.replace("url('/img/", `url('http://localhost:${PORT}/img/`), { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const out = path.join(root, 'img', 'og-voucher.jpg');
  await page.screenshot({ path: out, type: 'jpeg', quality: 85 });
  console.log(`img/og-voucher.jpg  1200x630  ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
} finally {
  await browser.close();
  server.close();
}
