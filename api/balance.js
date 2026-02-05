import { put, list } from '@vercel/blob';

const BLOB_PATH = 'clawpital/balance.json';

async function getStoredBalance() {
  const { blobs } = await list({ prefix: 'clawpital/', limit: 10 });
  const blob = blobs.find((b) => b.pathname.endsWith('balance.json'));
  if (!blob || !blob.url) return { balance: 1000, initialBalance: 1000, lastUpdated: null };
  const res = await fetch(blob.url);
  if (!res.ok) return { balance: 1000, initialBalance: 1000, lastUpdated: null };
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { balance: 1000, initialBalance: 1000, lastUpdated: null };
  }
}

async function saveBalance(data) {
  await put(BLOB_PATH, JSON.stringify(data), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'GET' && req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    if (req.method === 'GET') {
      const data = await getStoredBalance();
      return res.status(200).json(data);
    }

    if (req.method === 'PUT') {
      const { balance, initialBalance } = req.body;
      if (typeof balance !== 'number' || typeof initialBalance !== 'number') {
        return res.status(400).json({ error: 'Invalid balance data' });
      }
      await saveBalance({ balance, initialBalance, lastUpdated: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }
  } catch (err) {
    console.error('balance api error', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
