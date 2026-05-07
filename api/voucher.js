const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

function formatDate(dateStr) {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

function formatAmount(amount) {
  if (amount == null) return '';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

module.exports = async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Missing code' });
  }

  const { data, error } = await supabase
    .from('vouchers')
    .select('code, sender_name, recipient_name, amount, message, expiry_date')
    .eq('code', code.toUpperCase())
    .eq('payment_status', '100_pago')
    .is('deleted_at', null)
    .single();

  if (error || !data) {
    return res.status(404).json({ error: 'Voucher not found' });
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    codigo:       data.code,
    remetente:    data.sender_name,
    destinatario: data.recipient_name,
    valor:        formatAmount(data.amount),
    mensagem:     data.message || '',
    validade:     formatDate(data.expiry_date),
  });
};
