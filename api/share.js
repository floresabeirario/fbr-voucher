const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1VuFbI98844n_IlYeYQ5LaO8zG1aOjmCapinmlEmgyZY';

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
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'A:F',
    });

    const rows = response.data.values || [];
    const match = rows.slice(1).find(row => row[0] === code);

    if (match) {
      remetente    = match[1] || null;
      destinatario = match[2] || null;
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
  const pageUrl = `${proto}://${host}/${encodeURIComponent(code)}`;
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
