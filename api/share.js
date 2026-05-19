// Server-rendered OG tags para partilha. Lê remetente/destinatário do
// Supabase via RPC para preencher meta tags Open Graph quando alguém
// partilha um link como https://voucher.floresabeirario.pt/9HLCX2.
//
// Substituiu o lookup em Google Sheets — ver nota em voucher.js.

const fs = require('fs');
const path = require('path');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

async function fetchVoucher(code) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    const rpcUrl = `${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/get_voucher_by_code`;
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ p_code: code }),
    });
    if (!response.ok) return null;
    const rows = await response.json();
    return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
  } catch (err) {
    console.error('[fbr-voucher] share Supabase error:', err);
    return null;
  }
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  const htmlPath = path.join(__dirname, '../index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  if (!code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  const match = await fetchVoucher(code);
  const remetente = match?.sender_name || null;
  const destinatario = match?.recipient_name || null;

  const title = remetente
    ? `Um presente de ${remetente} · Flores à Beira-Rio`
    : 'Vale Presente · Flores à Beira-Rio';

  const description = remetente && destinatario
    ? `${remetente} ofereceu um vale presente Flores à Beira-Rio a ${destinatario}.`
    : 'Vale presente digital Flores à Beira-Rio — Preservação floral artesanal em Portugal.';

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host  = req.headers.host || '';
  const pageUrl  = `${proto}://${host}/${encodeURIComponent(code)}`;
  const imageUrl = `${proto}://${host}/favicon/web-app-manifest-512x512.png`;

  const ogTags = `
  <meta property="og:type" content="website">
  <meta property="og:url" content="${escapeHtml(pageUrl)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:image" content="${escapeHtml(imageUrl)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(title)}">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(imageUrl)}">`;

  html = html.replace(
    '<title>Vale Presente · Flores à Beira-Rio</title>',
    `<title>${escapeHtml(title)}</title>${ogTags}`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).send(html);
};
