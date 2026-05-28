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
  recent: number    // visits in last 3 days
  older: number     // visits in days 4-14
  velocity: number  // recent / (older + 1) — higher = accelerating
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

export function computeTrends(visits: Visit[]): TopicTrend[] {
  const now = Date.now()
  const threeDays = 1000 * 60 * 60 * 24 * 3
  const fourteenDays = 1000 * 60 * 60 * 24 * 14

  const map: Record<string, { recent: number; older: number }> = {}

  for (const visit of visits) {
    const age = now - visit.timestamp
    if (age > fourteenDays) continue
    for (const topic of visit.topics) {
      if (!map[topic]) map[topic] = { recent: 0, older: 0 }
      if (age <= threeDays) map[topic].recent++
      else map[topic].older++
    }
  }

  return Object.entries(map)
    .map(([topic, { recent, older }]) => ({
      topic,
      total: recent + older,
      recent,
      older,
      velocity: recent / (older + 1),
    }))
    .filter((t) => t.total >= 2)
    .sort((a, b) => b.velocity - a.velocity)
}
