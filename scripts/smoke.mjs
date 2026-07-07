// Smoke test do fbr-voucher. Arranca um mock do deploy (estáticos +
// /api/voucher falso + rewrite /:code) e conduz um browser headless
// pelos fluxos principais. Falha (exit 1) se algum quebrar.
//
//   npm install --no-save playwright-core   (uma vez)
//   node scripts/smoke.mjs
//
// Usa o Edge do Windows (channel msedge). Passa SMOKE_SHOTS=1 para
// gravar screenshots em scripts/.smoke-shots/.
import { chromium } from 'playwright-core';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 8131;
const BASE = `http://localhost:${PORT}`;
const SHOTS = process.env.SMOKE_SHOTS === '1';
const shotDir = path.join(root, 'scripts', '.smoke-shots');
if (SHOTS) fs.mkdirSync(shotDir, { recursive: true });

const VALID = {
  codigo: 'TESTE1', remetente: 'Maria João', destinatario: 'Sofia e Miguel',
  valor: '350 €', mensagem: 'Que as vossas flores durem para sempre.', validade: '07/2028',
};
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.png': 'image/png', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.otf': 'font/otf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json', '.txt': 'text/plain',
};

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = decodeURIComponent(u.pathname);
  if (p === '/api/voucher') {
    const code = (u.searchParams.get('code') || '').toUpperCase();
    if (code === 'TESTE1') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(VALID)); }
    res.writeHead(404, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ error: 'Voucher not found' }));
  }
  let file = path.join(root, p === '/' ? 'index.html' : p);
  if (!file.startsWith(root)) { res.writeHead(403); return res.end(); }
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    if (/^\/[A-Za-z0-9_-]+$/.test(p)) file = path.join(root, 'index.html'); // rewrite /:code
    else { res.writeHead(404); return res.end('not found'); }
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
}).listen(PORT);

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (extra ? '  → ' + extra : ''));
  if (!ok) failures++;
};

const browser = await chromium.launch({ channel: 'msedge', headless: true });
async function newPage(viewport, locale = 'pt-PT') {
  const ctx = await browser.newContext({ viewport, locale });
  const page = await ctx.newPage();
  page.errs = [];
  page.on('pageerror', e => page.errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) page.errs.push('console.error: ' + m.text()); });
  return page;
}
const shot = (page, name) => SHOTS ? page.screenshot({ path: path.join(shotDir, name + '.png') }) : Promise.resolve();

try {
  /* 1 — pesquisa (PT por defeito) */
  {
    const page = await newPage({ width: 1280, height: 900 });
    await page.goto(BASE + '/');
    await page.waitForTimeout(500);
    check('pesquisa: secção visível', await page.locator('#search-page').isVisible());
    check('pesquisa: título PT', (await page.locator('.search-title').textContent()).includes('vale'));
    check('pesquisa: PT activo no selector', await page.locator('.lang-opt[data-lang="pt"]').evaluate(e => e.classList.contains('active')));
    check('pesquisa: sem erros JS', page.errs.length === 0, page.errs.join(' | '));
    await shot(page, '1-search-pt');
    await page.close();
  }

  /* 2 — toggle EN na pesquisa */
  {
    const page = await newPage({ width: 1280, height: 900 });
    await page.goto(BASE + '/');
    await page.click('.lang-opt[data-lang="en"]');
    await page.waitForTimeout(200);
    check('EN: título traduzido', (await page.locator('.search-title').textContent()).includes('gift'));
    check('EN: botão traduzido', (await page.locator('.search-btn').textContent()).trim() === 'View gift voucher');
    check('EN: html lang=en', (await page.locator('html').getAttribute('lang')) === 'en');
    check('EN: placeholder traduzido', (await page.locator('#search-input').getAttribute('placeholder')).includes('e.g.'));
    check('EN: nota rica traduzida', (await page.locator('.search-note').textContent()).includes('Questions?'));
    check('EN: termos traduzidos', (await page.locator('.terms-section').textContent()).includes('Terms and conditions'));
    /* persiste após reload */
    await page.reload();
    await page.waitForTimeout(300);
    check('EN: persiste após reload', (await page.locator('html').getAttribute('lang')) === 'en');
    check('EN: sem erros JS', page.errs.length === 0, page.errs.join(' | '));
    await shot(page, '2-search-en');
    await page.close();
  }

  /* 3 — vale válido (PT) */
  {
    const page = await newPage({ width: 1280, height: 900 });
    await page.goto(BASE + '/TESTE1');
    await page.waitForSelector('#env-overlay', { timeout: 5000 });
    await page.click('#env-overlay');
    await page.waitForSelector('.gatefold.loaded', { timeout: 15000 });
    await page.waitForTimeout(1500);
    check('vale: remetente', (await page.locator('.hw-de').textContent()) === 'Maria João');
    check('vale: código', (await page.locator('.hw-codigo').textContent()) === 'TESTE1');
    check('vale: valor c/ prefixo PT', (await page.locator('.hw-valor').textContent()) === 'de 350 €');
    check('vale: resumo visível', await page.locator('#voucher-summary').isVisible());
    check('vale: label "Válido até" PT', (await page.locator('.vs-label').nth(3).textContent()) === 'Válido até');
    check('vale: loading 100%', (await page.locator('#card-loading-pct').textContent()) === '100%');
    check('vale: sem erros JS', page.errs.length === 0, page.errs.join(' | '));
    await shot(page, '3-voucher-pt');
    /* toggle EN no vale: label e prefixo do valor mudam */
    await page.click('.lang-opt[data-lang="en"]');
    await page.waitForTimeout(200);
    check('vale EN: label "Valid until"', (await page.locator('.vs-label').nth(3).textContent()) === 'Valid until');
    check('vale EN: valor sem prefixo', (await page.locator('.hw-valor').textContent()) === '350 €');
    await page.close();
  }

  /* 4 — código inválido → pesquisa com erro */
  {
    const page = await newPage({ width: 1280, height: 900 });
    await page.goto(BASE + '/NAOEXISTE');
    await page.waitForSelector('#search-error.show', { timeout: 8000 });
    check('inválido: volta à pesquisa', await page.locator('#search-page').isVisible());
    check('inválido: mensagem PT', (await page.locator('#search-error').textContent()).includes('Não encontrámos'));
    check('inválido: código pré-preenchido', (await page.locator('#search-input').inputValue()) === 'NAOEXISTE');
    check('inválido: URL limpo', new URL(page.url()).search === '');
    /* a mensagem de erro re-traduz ao trocar de idioma */
    await page.click('.lang-opt[data-lang="en"]');
    await page.waitForTimeout(200);
    check('inválido EN: mensagem re-traduzida', (await page.locator('#search-error').textContent()).includes("couldn't find"));
    check('inválido: sem erros JS', page.errs.length === 0, page.errs.join(' | '));
    await shot(page, '4-invalid');
    await page.close();
  }

  /* 5 — mobile + default EN por navigator.language */
  {
    const page = await newPage({ width: 390, height: 844 }, 'en-GB');
    await page.goto(BASE + '/');
    await page.waitForTimeout(400);
    check('mobile/EN-locale: default EN', (await page.locator('html').getAttribute('lang')) === 'en');
    check('mobile: sem erros JS', page.errs.length === 0, page.errs.join(' | '));
    await shot(page, '5-mobile-en');
    await page.close();
  }
} finally {
  await browser.close();
  server.close();
}

console.log(failures === 0 ? '\nSMOKE OK' : `\nSMOKE FALHOU: ${failures} problema(s)`);
process.exit(failures === 0 ? 0 : 1);
