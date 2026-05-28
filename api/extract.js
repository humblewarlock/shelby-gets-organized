// Vercel serverless function — POST /api/extract
// Calls the Anthropic API server-side so the key is never exposed to the browser.
// Env var: ANTHROPIC_API_KEY (set in Vercel project settings, and locally in .env)

const SYSTEM_PROMPT = `You are a data extractor for a resale inventory app. The user will describe a purchase. Extract: name (string), source (string - where they bought it, market or location), costMXN (number - amount paid in MXN), targetMXN (number - target resale price in MXN), soldMXN (number or null - if they mentioned selling it). Return ONLY valid JSON with those exact keys. No explanation, no markdown, just raw JSON.`

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { transcript } = req.body ?? {}
  if (!transcript?.trim()) {
    return res.status(400).json({ error: 'transcript is required' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY is not set on the server' })
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 512,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: transcript.trim() }],
      }),
    })

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({}))
      return res.status(upstream.status).json({
        error: err?.error?.message ?? `Anthropic error ${upstream.status}`,
      })
    }

    const data = await upstream.json()

    // Strip markdown code fences (model sometimes wraps JSON in ```json … ```)
    const rawText = data.content?.[0]?.text ?? ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()

    try {
      const extracted = JSON.parse(jsonText)
      return res.status(200).json({ extracted })
    } catch {
      return res.status(502).json({ error: 'Failed to parse model response as JSON', raw: rawText })
    }
  } catch (err) {
    return res.status(502).json({ error: err.message })
  }
}
