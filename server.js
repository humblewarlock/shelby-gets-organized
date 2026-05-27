import { config } from 'dotenv'
config({ override: true }) // override ensures empty shell vars don't block .env values
import express from 'express'

const app = express()
app.use(express.json())

const PORT = process.env.API_PORT || 3001

const SYSTEM_PROMPT = `You are a data extractor for a resale inventory app. The user will describe a purchase. Extract: name (string), source (string - where they bought it, market or location), costMXN (number - amount paid in MXN), targetMXN (number - target resale price in MXN), soldMXN (number or null - if they mentioned selling it). Return ONLY valid JSON with those exact keys. No explanation, no markdown, just raw JSON.`

app.post('/api/extract', async (req, res) => {
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
      return res.status(upstream.status).json({ error: err?.error?.message ?? `Anthropic error ${upstream.status}` })
    }

    const data = await upstream.json()

    // Strip any markdown code fences the model may have added and parse the JSON
    // so the client always receives a clean { extracted } object
    const rawText = data.content?.[0]?.text ?? ''
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    try {
      const extracted = JSON.parse(jsonText)
      res.json({ extracted })
    } catch {
      // If parsing fails, return the raw text so the client can surface a useful error
      res.status(502).json({ error: 'Failed to parse model response as JSON', raw: rawText })
    }
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`)
})
