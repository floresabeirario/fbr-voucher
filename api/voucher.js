// Lê vales do Supabase (admin.floresabeirario.pt grava aqui).
// Substituiu o lookup em Google Sheets — a Sheet ficou desactualizada
// porque o admin envia tudo para Supabase, não para a Sheet.
//
// Usa a RPC `get_voucher_by_code` (mig 039 do fbr-admin2). A mig 040
// dropou o SELECT directo do role anon na tabela `vouchers`, por isso
// não dá para fazer `.from('vouchers').select(...)` daqui — só a RPC
// passa pelo lockdown.
//
// Env vars necessárias na Vercel:
//   SUPABASE_URL       — ex.: https://xxxxxx.supabase.co
//   SUPABASE_ANON_KEY  — public anon key (a mesma que usa o admin)

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

function formatValidade(isoDate) {
  if (!isoDate) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!m) return isoDate;
  // Spec do projecto: vale mostra só mês/ano.
  return `${m[2]}/${m[1]}`;
}

function formatValor(amount) {
  if (amount === null || amount === undefined || amount === '') return '';
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('[fbr-voucher] Missing SUPABASE_URL / SUPABASE_ANON_KEY env vars');
    return res.status(500).json({ error: 'Server not configured' });
  }

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

    if (!response.ok) {
      const text = await response.text();
      console.error('[fbr-voucher] Supabase RPC error:', response.status, text);
      // DEBUG: incluir detalhe na resposta para diagnosticar — tirar depois.
      return res.status(500).json({
        error: 'Lookup failed',
        debug_status: response.status,
        debug_body: text,
        debug_url_set: Boolean(SUPABASE_URL),
        debug_key_len: SUPABASE_ANON_KEY ? SUPABASE_ANON_KEY.length : 0,
      });
    }

    const rows = await response.json();
    const match = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;

    if (!match) {
      return res.status(404).json({ error: 'Voucher not found' });
    }

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({
      codigo:       match.code || '',
      remetente:    match.sender_name || '',
      destinatario: match.recipient_name || '',
      valor:        formatValor(match.amount),
      mensagem:     match.message || '',
      validade:     formatValidade(match.expiry_date),
    });
  } catch (err) {
    console.error('[fbr-voucher] Supabase error:', err);
    return res.status(500).json({ error: err.message || String(err) });
  }
};
