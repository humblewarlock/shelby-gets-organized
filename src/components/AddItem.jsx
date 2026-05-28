import { useState, useRef, useEffect } from 'react'

const USD_RATE = 0.0577

const fmt = (n) => {
  if (!n && n !== 0) return '—'
  return new Intl.NumberFormat('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(n))
}

function LivePreview({ name, costMXN, targetMXN, soldMXN }) {
  const cost = Number(costMXN) || 0
  const target = Number(targetMXN) || 0
  const sold = soldMXN !== '' && soldMXN != null ? Number(soldMXN) : null
  const estProfit = target - cost
  const actualProfit = sold != null ? sold - cost : null
  const costUSD = (cost * USD_RATE).toFixed(2)

  return (
    <div className="bg-[#D1F5E9] rounded-2xl p-4 border border-[#1D9E75]/20">
      <p className="text-xs font-semibold text-[#1D9E75] uppercase tracking-wide mb-2">Live Preview</p>
      <p className="font-semibold text-gray-900 text-sm truncate">{name || 'Item name…'}</p>
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <p className="text-[10px] text-gray-500">Paid</p>
          <p className="font-mono font-semibold text-sm text-gray-900">${fmt(cost)} <span className="text-[10px] font-normal text-gray-400">MXN</span></p>
          <p className="font-mono text-xs text-gray-400">${costUSD} USD</p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">Target</p>
          <p className="font-mono font-semibold text-sm text-gray-900">${fmt(target)} <span className="text-[10px] font-normal text-gray-400">MXN</span></p>
        </div>
        <div>
          <p className="text-[10px] text-gray-500">{sold != null ? 'Sold for' : 'Est. Profit'}</p>
          <p className={`font-mono font-semibold text-sm ${
            sold != null
              ? actualProfit >= 0 ? 'text-green-600' : 'text-red-500'
              : estProfit >= 0 ? 'text-green-600' : 'text-red-500'
          }`}>
            {sold != null ? `$${fmt(sold)}` : `${estProfit >= 0 ? '+' : ''}$${fmt(estProfit)}`}
          </p>
        </div>
        {sold != null && (
          <div>
            <p className="text-[10px] text-gray-500">Profit</p>
            <p className={`font-mono font-semibold text-sm ${actualProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
              {actualProfit >= 0 ? '+' : ''}${fmt(actualProfit)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

const EMPTY_FORM = { name: '', source: '', costMXN: '', targetMXN: '', soldMXN: '', photo: null }

export default function AddItem({ addItem, navigateTo }) {
  const [mode, setMode] = useState('manual') // 'manual' | 'voice'
  const [form, setForm] = useState(EMPTY_FORM)
  const [success, setSuccess] = useState(false)

  // Voice state
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [voiceError, setVoiceError] = useState('')
  const recognitionRef = useRef(null)
  const hasSpeechRecognition = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  // 'unknown' = never asked | 'requesting' = in-flight | 'granted' | 'denied'
  const [micPermission, setMicPermission] = useState('unknown')

  // On mount, check whether permission was already granted in a previous session
  // so returning users skip the explicit request step entirely.
  useEffect(() => {
    if (!navigator.permissions) return
    let permStatus
    navigator.permissions
      .query({ name: 'microphone' })
      .then(s => {
        permStatus = s
        if (s.state === 'granted') setMicPermission('granted')
        else if (s.state === 'denied') setMicPermission('denied')
        // 'prompt' → stay 'unknown', show the request button
        s.onchange = () => {
          if (s.state === 'granted') setMicPermission('granted')
          else if (s.state === 'denied') setMicPermission('denied')
          else setMicPermission('unknown')
        }
      })
      .catch(() => {}) // Permissions API not supported — stay 'unknown'
    return () => { if (permStatus) permStatus.onchange = null }
  }, [])

  const update = (field, value) => setForm(f => ({ ...f, [field]: value }))

  const canSubmit = form.name.trim() && form.costMXN !== '' && form.targetMXN !== ''

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => update('photo', ev.target.result)
    reader.readAsDataURL(file)
  }

  const handleSubmit = () => {
    if (!canSubmit) return
    addItem({
      name: form.name.trim(),
      source: form.source.trim(),
      costMXN: Number(form.costMXN),
      targetMXN: Number(form.targetMXN),
      soldMXN: form.soldMXN !== '' ? Number(form.soldMXN) : null,
      photo: form.photo,
    })
    setForm(EMPTY_FORM)
    setSuccess(true)
    setTimeout(() => {
      setSuccess(false)
      navigateTo('items')
    }, 1200)
  }

  // ── Phase 1: request mic permission ──────────────────────────────────────────
  // This is the only async function in the voice flow. It calls getUserMedia to
  // trigger the system permission prompt and immediately releases the stream.
  // SpeechRecognition is NOT touched here, so there is no gesture-context issue.
  const requestPermission = async () => {
    setMicPermission('requesting')
    setVoiceError('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.getTracks().forEach(t => t.stop()) // permission secured — release stream
      setMicPermission('granted')
    } catch (err) {
      setMicPermission('denied')
      setVoiceError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone access denied. On iPhone: Settings → Safari → Microphone → Allow.'
          : 'Could not access microphone: ' + err.message,
      )
    }
  }

  // ── Phase 2: start recording ──────────────────────────────────────────────────
  // Called synchronously from onClick — no await anywhere before rec.start().
  // Safari iOS requires SpeechRecognition.start() to run within the same
  // synchronous call stack as the user gesture; any await breaks that chain.
  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.continuous = true
    rec.interimResults = true
    rec.lang = 'en-US'
    let finalText = ''
    rec.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript + ' '
        else interim += e.results[i][0].transcript
      }
      setTranscript(finalText + interim)
    }
    rec.onerror = (e) => {
      setVoiceError('Recording error: ' + e.error)
      setIsRecording(false)
    }
    rec.onend = () => setIsRecording(false)
    recognitionRef.current = rec
    rec.start() // ← must stay synchronous; do not move below any await
    setIsRecording(true)
    setTranscript('')
    setVoiceError('')
  }

  const stopRecording = () => {
    recognitionRef.current?.stop()
    setIsRecording(false)
  }

  // Plain, synchronous toggle — startRecording() has no awaits.
  const toggleRecording = () => {
    if (isRecording) stopRecording()
    else startRecording()
  }

  const extractWithAI = async () => {
    if (!transcript.trim()) return
    setIsExtracting(true)
    setVoiceError('')
    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: transcript.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.error || `Server error ${res.status}`)
      }
      const { extracted: parsed } = await res.json()
      setForm(f => ({
        ...f,
        name: parsed.name || f.name,
        source: parsed.source || f.source,
        costMXN: parsed.costMXN != null ? String(parsed.costMXN) : f.costMXN,
        targetMXN: parsed.targetMXN != null ? String(parsed.targetMXN) : f.targetMXN,
        soldMXN: parsed.soldMXN != null ? String(parsed.soldMXN) : f.soldMXN,
      }))
      setMode('manual')
    } catch (err) {
      setVoiceError('Extraction failed: ' + err.message)
    } finally {
      setIsExtracting(false)
    }
  }

  const fileInputRef = useRef(null)

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2 pb-1">
        <h1 className="text-xl font-bold text-gray-900">Add Item</h1>
      </div>

      {/* Mode Toggle */}
      <div className="relative bg-gray-100 rounded-full p-1 flex">
        <div
          className="absolute top-1 bottom-1 bg-white rounded-full shadow-sm transition-all duration-200"
          style={{
            width: 'calc(50% - 4px)',
            left: mode === 'manual' ? '4px' : 'calc(50%)',
          }}
        />
        {['manual', 'voice'].map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 relative z-10 text-sm font-medium py-1.5 rounded-full transition-colors capitalize ${
              mode === m ? 'text-gray-900' : 'text-gray-500'
            }`}
          >
            {m === 'manual' ? 'Manual' : '🎙 Voice'}
          </button>
        ))}
      </div>

      {success && (
        <div className="bg-[#D1F5E9] text-[#1D9E75] text-sm font-semibold text-center py-3 rounded-xl">
          ✓ Item added!
        </div>
      )}

      {mode === 'manual' ? (
        <div className="space-y-3">
          {/* Photo upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="w-full aspect-video bg-gray-100 rounded-2xl flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-200 hover:border-[#1D9E75] transition-colors overflow-hidden"
          >
            {form.photo ? (
              <img src={form.photo} alt="preview" className="w-full h-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-gray-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" />
                  <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" />
                </svg>
                <span className="text-sm">Tap to add photo</span>
              </div>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />

          {/* Inputs */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Item Name *</label>
            <input
              value={form.name}
              onChange={e => update('name', e.target.value)}
              placeholder="e.g. Vintage Levi's Jacket"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Source / Market</label>
            <input
              value={form.source}
              onChange={e => update('source', e.target.value)}
              placeholder="e.g. Mercado del Chopo"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
            />
          </div>

          {/* Price pair */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Paid (MXN) *</label>
              <input
                value={form.costMXN}
                onChange={e => update('costMXN', e.target.value)}
                type="number"
                inputMode="decimal"
                placeholder="0"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Target (MXN) *</label>
              <input
                value={form.targetMXN}
                onChange={e => update('targetMXN', e.target.value)}
                type="number"
                inputMode="decimal"
                placeholder="0"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Sold Price (MXN) — optional</label>
            <input
              value={form.soldMXN}
              onChange={e => update('soldMXN', e.target.value)}
              type="number"
              inputMode="decimal"
              placeholder="Leave blank if unsold"
              className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-mono focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[#1D9E75]"
            />
          </div>

          {/* Live preview */}
          <LivePreview
            name={form.name}
            costMXN={form.costMXN}
            targetMXN={form.targetMXN}
            soldMXN={form.soldMXN}
          />

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`w-full py-3 rounded-2xl text-white font-semibold text-sm transition-all ${
              canSubmit
                ? 'bg-[#1D9E75] hover:bg-[#178A64] active:scale-95'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Add Item
          </button>
        </div>
      ) : (
        /* Voice Mode */
        <div className="space-y-4">
          {!hasSpeechRecognition ? (
            // Browser doesn't support SpeechRecognition at all
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center">
              <p className="text-2xl mb-2">🎙️</p>
              <p className="text-sm font-semibold text-amber-800">Speech recognition not supported</p>
              <p className="text-xs text-amber-600 mt-1">Try Chrome or Edge on Android/desktop for voice input.</p>
            </div>

          ) : micPermission === 'unknown' || micPermission === 'requesting' ? (
            // Phase 1 — ask for mic permission explicitly via getUserMedia.
            // This tap is async (getUserMedia) so we keep SpeechRecognition out of it entirely.
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9 text-gray-400">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2" strokeLinecap="round" />
                  <line x1="12" y1="19" x2="12" y2="23" strokeLinecap="round" />
                  <line x1="8" y1="23" x2="16" y2="23" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Microphone access needed</p>
                <p className="text-xs text-gray-500 mt-1">Tap below to allow mic access, then you can record.</p>
              </div>
              <button
                onClick={requestPermission}
                disabled={micPermission === 'requesting'}
                className="px-6 py-3 rounded-2xl bg-[#1D9E75] text-white font-semibold text-sm active:scale-95 transition-all disabled:opacity-50"
              >
                {micPermission === 'requesting' ? 'Requesting…' : 'Enable Microphone'}
              </button>
              {voiceError && (
                <div className="w-full bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-600">{voiceError}</p>
                </div>
              )}
            </div>

          ) : micPermission === 'denied' ? (
            // Permission was denied — show instructions, let them retry
            <div className="flex flex-col items-center gap-4 py-6">
              <div className="w-20 h-20 rounded-full bg-red-50 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-9 h-9 text-red-400">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" strokeLinecap="round" strokeLinejoin="round" />
                  <line x1="2" y1="2" x2="22" y2="22" strokeLinecap="round" />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">Microphone access denied</p>
                <p className="text-xs text-gray-500 mt-1">
                  iPhone: <strong>Settings → Safari → Microphone → Allow</strong>
                  <br />Android: tap the lock icon in the address bar → Microphone → Allow
                </p>
              </div>
              <button
                onClick={requestPermission}
                className="px-6 py-2.5 rounded-2xl border border-gray-300 text-gray-700 text-sm font-medium active:scale-95 transition-all"
              >
                Try Again
              </button>
            </div>

          ) : (
            // Phase 2 — permission granted. toggleRecording() is fully synchronous;
            // rec.start() runs directly in the onClick handler with no awaits before it.
            <>
              <div className="flex flex-col items-center gap-4 py-4">
                <button
                  onClick={toggleRecording}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                    isRecording
                      ? 'bg-red-500 animate-pulse shadow-red-200'
                      : 'bg-[#1D9E75] shadow-teal-200'
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="white" className="w-10 h-10">
                    <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
                <p className="text-sm text-gray-500">
                  {isRecording ? '🔴 Recording… tap to stop' : 'Tap to start recording'}
                </p>
              </div>

              {transcript && (
                <div className="bg-white rounded-2xl p-4 border border-gray-200">
                  <p className="text-xs font-medium text-gray-500 mb-1">Transcript</p>
                  <p className="text-sm text-gray-800">{transcript}</p>
                </div>
              )}

              {voiceError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                  <p className="text-xs text-red-600">{voiceError}</p>
                </div>
              )}

              <button
                onClick={extractWithAI}
                disabled={!transcript.trim() || isExtracting}
                className={`w-full py-3 rounded-2xl font-semibold text-sm transition-all ${
                  transcript.trim() && !isExtracting
                    ? 'bg-[#1D9E75] text-white hover:bg-[#178A64] active:scale-95'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isExtracting ? 'Extracting…' : '✨ Extract with AI'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Describe what you bought, where, how much you paid, and your target price.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}
