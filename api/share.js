const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  const htmlPath = path.join(__dirname, '../index.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  if (!code) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  }

  let remetente = null;
  let destinatario = null;

  try {
    const { data } = await supabase
      .from('vouchers')
      .select('sender_name, recipient_name')
      .eq('code', code.toUpperCase())
      .eq('payment_status', '100_pago')
      .is('deleted_at', null)
      .maybeSingle();

    if (data) {
      remetente    = data.sender_name || null;
      destinatario = data.recipient_name || null;
    }
  } catch (err) {
    console.error('[fbr-voucher] share error:', err);
  }

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
