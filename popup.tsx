import { useEffect, useState } from "react"
import { computeTrends, getState, saveApiKey } from "~lib/storage"
import type { TopicTrend, DriftState } from "~lib/storage"

type View = "setup" | "trends" | "forecast"

export default function Popup() {
  const [view, setView] = useState<View>("setup")
  const [state, setState] = useState<DriftState | null>(null)
  const [trends, setTrends] = useState<TopicTrend[]>([])
  const [keyInput, setKeyInput] = useState("")
  const [forecast, setForecast] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes["drift_state"]) {
        const s: DriftState = changes["drift_state"].newValue
        setState(s)
        setTrends(computeTrends(s.visits))
        if (s.lastForecast) {
          setForecast(s.lastForecast)
          setLoading(false)
        }
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  async function load() {
    const s = await getState()
    setState(s)
    setTrends(computeTrends(s.visits))
    setForecast(s.lastForecast)
    if (s.apiKey) setView(s.lastForecast ? "forecast" : "trends")
  }

  async function handleSaveKey() {
    if (!keyInput.trim()) return
    await saveApiKey(keyInput.trim())
    setKeyInput("")
    setView("trends")
    const s = await getState()
    setState(s)
  }

  async function handleForecast() {
    setLoading(true)
    setError(null)
    const res = await chrome.runtime.sendMessage({ type: "FORECAST" })
    if (!res?.ok) {
      setError(res?.reason === "not_enough_data" ? "Browse more — need at least a few days of data." : "Something went wrong.")
      setLoading(false)
    }
    // result arrives via storage.onChanged
  }

  if (view === "setup") {
    return (
      <div style={s.root}>
        <p style={s.wordmark}>Drift</p>
        <p style={s.prompt}>Enter your Groq API key to start</p>
        <p style={s.sub}>Free at <span style={s.link}>console.groq.com</span></p>
        <input
          autoFocus
          type="password"
          placeholder="gsk_…"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          style={s.input}
          onKeyDown={(e) => e.key === "Enter" && handleSaveKey()}
        />
        <button style={{ ...s.btn, opacity: keyInput.trim() ? 1 : 0.4 }} disabled={!keyInput.trim()} onClick={handleSaveKey}>
          Start
        </button>
      </div>
    )
  }

  if (view === "trends") {
    const days = state ? Math.ceil((Date.now() - Math.min(...state.visits.map(v => v.timestamp), Date.now())) / 86400000) : 0
    return (
      <div style={s.root}>
        <div style={s.topBar}>
          <p style={s.wordmark}>Drift</p>
          <span style={s.meta}>{state?.visits.length ?? 0} pages · {days}d</span>
        </div>

        {trends.length === 0 ? (
          <p style={s.empty}>Keep browsing — patterns will emerge in a day or two.</p>
        ) : (
          <>
            <p style={s.sectionLabel}>Accelerating</p>
            <div style={s.list}>
              {trends.slice(0, 8).map((t) => (
                <div key={t.topic} style={s.row}>
                  <span style={s.topic}>{t.topic}</span>
                  <div style={s.bar}>
                    <div style={{ ...s.barFill, width: `${Math.min(t.velocity * 30, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => { setView("forecast"); handleForecast() }} disabled={loading} style={s.btn}>
              {loading ? "Reading the pattern…" : "Forecast"}
            </button>
          </>
        )}
        {error && <p style={s.error}>{error}</p>}
      </div>
    )
  }

  if (view === "forecast" && forecast) {
    return (
      <div style={s.root}>
        <div style={s.topBar}>
          <p style={s.wordmark}>Drift</p>
          <button style={s.ghost} onClick={() => setView("trends")}>Trends</button>
        </div>
        <div style={s.forecastBox}>
          <p style={s.forecastText}>{forecast}</p>
        </div>
        <button style={{ ...s.btn, opacity: loading ? 0.6 : 1 }} disabled={loading} onClick={handleForecast}>
          {loading ? "Reading…" : "Refresh forecast"}
        </button>
      </div>
    )
  }

  return null
}

const s: Record<string, React.CSSProperties> = {
  root:         { width: 360, padding: 20, fontFamily: "system-ui, sans-serif", fontSize: 13, color: "#111", display: "flex", flexDirection: "column", gap: 12, boxSizing: "border-box" },
  wordmark:     { fontWeight: 700, fontSize: 20, letterSpacing: -0.5, margin: 0 },
  prompt:       { margin: 0, fontWeight: 600, fontSize: 15 },
  sub:          { margin: 0, color: "#999", fontSize: 12 },
  link:         { color: "#555", textDecoration: "underline" },
  input:        { padding: 10, borderRadius: 8, border: "1px solid #e5e5e5", fontFamily: "inherit", fontSize: 13, outline: "none" },
  btn:          { padding: "10px 16px", borderRadius: 8, background: "#111", color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13 },
  ghost:        { background: "none", border: "none", color: "#999", cursor: "pointer", fontSize: 12, padding: 0 },
  topBar:       { display: "flex", justifyContent: "space-between", alignItems: "center" },
  meta:         { color: "#bbb", fontSize: 11 },
  sectionLabel: { margin: 0, fontSize: 11, fontWeight: 600, color: "#999", textTransform: "uppercase", letterSpacing: 0.5 },
  list:         { display: "flex", flexDirection: "column", gap: 8 },
  row:          { display: "flex", alignItems: "center", gap: 10 },
  topic:        { fontSize: 13, flex: "0 0 140px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  bar:          { flex: 1, height: 4, background: "#f0f0f0", borderRadius: 2, overflow: "hidden" },
  barFill:      { height: "100%", background: "#111", borderRadius: 2, transition: "width 0.4s ease" },
  forecastBox:  { background: "#fafafa", borderRadius: 8, padding: 14, maxHeight: 360, overflowY: "auto" },
  forecastText: { margin: 0, lineHeight: 1.7, fontSize: 13 },
  empty:        { color: "#bbb", fontStyle: "italic", margin: 0 },
  error:        { color: "#c00", fontSize: 12, margin: 0 },
}
