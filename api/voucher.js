const { google } = require('googleapis');

const SPREADSHEET_ID = '1VuFbI98844n_IlYeYQ5LaO8zG1aOjmCapinmlEmgyZY';
const SHEET_NAME = 'Voucher';

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  try {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
    });

    const rows = response.data.values || [];
    // rows[0] is header: código, remetente, destinatário, valor, mensagem
    const match = rows.slice(1).find(row => row[0] === code);

    if (!match) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      codigo:       match[0] || '',
      remetente:    match[1] || '',
      destinatario: match[2] || '',
      valor:        match[3] || '',
      mensagem:     match[4] || '',
    });
  } catch (err) {
    console.error('[fbr-voucher] Sheets error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};
