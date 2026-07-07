// Rate limit best-effort por instância serverless: trava tentativas de
// adivinhar códigos à força bruta. Os códigos têm ~30 bits de entropia
// (mig 083 do fbr-admin, gen_random_bytes), por isso o brute force já é
// inviável, mas não custa nada fechar a porta. 30 pedidos/min/IP dá
// folga a um destinatário legítimo e mata scripts.
//
// Partilhado por api/voucher.js e api/share.js — cada função é uma
// lambda separada na Vercel, por isso cada uma tem o seu Map, mas a
// lógica é a mesma. (O prefixo "_" impede a Vercel de expor este
// ficheiro como endpoint.)

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

function createRateLimiter() {
  const hits = new Map(); // ip → { count, resetAt }
  return function isRateLimited(ip) {
    const now = Date.now();
    if (hits.size > 500) {
      for (const [k, v] of hits) { if (now > v.resetAt) hits.delete(k); }
    }
    const entry = hits.get(ip);
    if (!entry || now > entry.resetAt) {
      hits.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
      return false;
    }
    if (entry.count >= RATE_LIMIT) return true;
    entry.count++;
    return false;
  };
}

function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anonymous';
}

module.exports = { createRateLimiter, clientIp };
