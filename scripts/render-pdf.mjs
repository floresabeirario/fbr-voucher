// Regenera img/voucher-p1.webp e img/voucher-p2.webp a partir do
// voucher_azul.pdf. Correr sempre que o design do cartão mudar:
//
//   npm install --no-save playwright-core   (uma vez)
//   node scripts/render-pdf.mjs
//
// Usa o Edge instalado no Windows (channel msedge) — o pdf.js corre no
// browser e o canvas do Chromium codifica o WebP. Precisa de internet
// (pdf.js vem do cdnjs) e do Edge instalado.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8123;

const MIME = { '.html': 'text/html; charset=utf-8', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path.join(root, urlPath);
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); return res.end();
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  await page.goto(`http://localhost:${PORT}/scripts/render.html`);
  await page.waitForFunction('window.result !== null || window.error !== null', null, { timeout: 120000 });

  const error = await page.evaluate('window.error');
  if (error) throw new Error('render falhou: ' + error);

  const result = await page.evaluate('window.result');
  fs.mkdirSync(path.join(root, 'img'), { recursive: true });
  for (const p of result.pages) {
    const buf = Buffer.from(p.webp.split(',')[1], 'base64');
    const out = path.join(root, 'img', `voucher-p${p.num}.webp`);
    fs.writeFileSync(out, buf);
    console.log(`img/voucher-p${p.num}.webp  ${p.w}x${p.h}  ${(buf.length / 1024).toFixed(0)} KB`);
  }
} finally {
  await browser.close();
  server.close();
}
