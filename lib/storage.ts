export interface Visit {
  id: string
  url: string
  title: string
  topics: string[]
  timestamp: number
}

export interface TopicTrend {
  topic: string
  total: number
  recent: number      // visits in last 3 days
  slope: number       // EWMA linear trend — positive = accelerating
  forecast7d: number  // predicted daily visits 7 days from now
}

export interface DriftState {
  visits: Visit[]
  lastForecast: string | null
  apiKey: string | null
}

const KEY = "drift_state"

export async function getState(): Promise<DriftState> {
  const r = await chrome.storage.local.get(KEY)
  return r[KEY] ?? { visits: [], lastForecast: null, apiKey: null }
}

export async function saveApiKey(key: string): Promise<void> {
  const state = await getState()
  state.apiKey = key
  await chrome.storage.local.set({ [KEY]: state })
}

export async function addVisit(visit: Omit<Visit, "id" | "timestamp">): Promise<void> {
  const state = await getState()
  const isDup = state.visits.some(
    (v) => v.url === visit.url && Date.now() - v.timestamp < 1000 * 60 * 30
  )
  if (isDup) return

  state.visits.push({ ...visit, id: crypto.randomUUID(), timestamp: Date.now() })

  // Keep 30 days max
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 30
  state.visits = state.visits.filter((v) => v.timestamp > cutoff)

  await chrome.storage.local.set({ [KEY]: state })
}

export async function saveForecast(forecast: string): Promise<void> {
  const state = await getState()
  state.lastForecast = forecast
  await chrome.storage.local.set({ [KEY]: state })
}

const WINDOW = 14  // days of history
const ALPHA = 0.4  // EWMA decay — higher = more weight on recent days
const DAY = 1000 * 60 * 60 * 24

export function computeTrends(visits: Visit[]): TopicTrend[] {
  const now = Date.now()

  // Bucket each topic into daily visit counts [day0=oldest ... day13=today]
  const topicDays: Record<string, number[]> = {}
  for (const visit of visits) {
    const age = now - visit.timestamp
    if (age > WINDOW * DAY) continue
    const dayIndex = WINDOW - 1 - Math.floor(age / DAY)
    for (const topic of visit.topics) {
      if (!topicDays[topic]) topicDays[topic] = new Array(WINDOW).fill(0)
      topicDays[topic][Math.max(0, Math.min(WINDOW - 1, dayIndex))]++
    }
  }

  return Object.entries(topicDays)
    .map(([topic, daily]) => {
      // Exponential weighted moving average
      const smoothed = new Array(WINDOW).fill(0)
      smoothed[0] = daily[0]
      for (let i = 1; i < WINDOW; i++) {
        smoothed[i] = ALPHA * daily[i] + (1 - ALPHA) * smoothed[i - 1]
      }

      // Linear regression on smoothed series to get slope
      const meanX = (WINDOW - 1) / 2
      const meanY = smoothed.reduce((a, b) => a + b, 0) / WINDOW
      let num = 0, den = 0
      for (let i = 0; i < WINDOW; i++) {
        num += (i - meanX) * (smoothed[i] - meanY)
        den += (i - meanX) ** 2
      }
      const slope = den === 0 ? 0 : num / den

      // Extrapolate 7 days forward from last smoothed value
      const forecast7d = Math.max(0, smoothed[WINDOW - 1] + slope * 7)
      const total = daily.reduce((a, b) => a + b, 0)
      const recent = daily.slice(WINDOW - 3).reduce((a, b) => a + b, 0)

      return { topic, total, recent, slope, forecast7d }
    })
    .filter((t) => t.total >= 2)
    .sort((a, b) => b.slope - a.slope)
}
