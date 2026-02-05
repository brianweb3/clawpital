export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Invalid prompt' });
    }

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      console.error('CLAUDE_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Claude API key not configured. Please add CLAUDE_API_KEY to Vercel environment variables.' });
    }

    console.log('Calling Claude API with prompt length:', prompt.length);
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    console.log('Claude API response status:', response.status);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Claude API error:', response.status, errorText);
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    console.log('Claude API response data keys:', Object.keys(data));
    const aiText = data.content?.[0]?.text || '';
    console.log('AI text length:', aiText.length);
    return res.status(200).json({ text: aiText });
  } catch (err) {
    console.error('Claude API proxy error:', err);
    return res.status(500).json({ error: err.message || 'Server error' });
  }
}
