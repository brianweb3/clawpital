import { put, list } from '@vercel/blob';

const BLOB_PATH = 'clawpital/trades.json';
const MAX_TRADES = 50;

async function getStoredData() {
  const { blobs } = await list({ prefix: 'clawpital/', limit: 10 });
  const blob = blobs.find((b) => b.pathname.endsWith('trades.json'));
  if (!blob || !blob.url) return { trades: [], info: { totalTrades: 0, winningTrades: 0, lastUpdated: null } };
  const res = await fetch(blob.url);
  if (!res.ok) return { trades: [], info: { totalTrades: 0, winningTrades: 0, lastUpdated: null } };
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { trades: [], info: { totalTrades: 0, winningTrades: 0, lastUpdated: null } };
  }
}

async function saveData(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'GET') {
      const data = await getStoredData();
      return res.status(200).json({
        trades: data.trades || [],
        info: data.info || { totalTrades: 0, winningTrades: 0, lastUpdated: null },
      });
    }

    if (req.method === 'POST') {
      const trade = req.body;
      if (!trade || typeof trade !== 'object') {
        return res.status(400).json({ error: 'Invalid trade body' });
      }
      const data = await getStoredData();
      const trades = Array.isArray(data.trades) ? data.trades : [];
      const info = data.info || { totalTrades: 0, winningTrades: 0, lastUpdated: null };

      trades.unshift(trade);
      const trimmed = trades.slice(0, MAX_TRADES);
      info.totalTrades = (info.totalTrades || 0) + 1;
      if (trade.isPositive) info.winningTrades = (info.winningTrades || 0) + 1;
      info.lastUpdated = new Date().toISOString();

      await saveData({ trades: trimmed, info });
      return res.status(200).json({ ok: true, count: trimmed.length });
    }
  } catch (err) {
    console.error('trades api error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
