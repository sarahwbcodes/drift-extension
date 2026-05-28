import { addVisit, getState, saveForecast, computeTrends } from "~lib/storage"
import { classifyPage, forecast } from "~lib/groq"

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "PAGE_CONTENT") {
    handlePage(message).then(sendResponse).catch(() => sendResponse({ ok: false }))
    return true
  }
  if (message.type === "FORECAST") {
    handleForecast().then(sendResponse).catch((e) => sendResponse({ ok: false, error: e.message }))
    return true
  }
})

async function handlePage(message: { url: string; title: string; text: string }) {
  const state = await getState()
  if (!state.apiKey) return { ok: false, reason: "no_api_key" }

  const topics = await classifyPage(state.apiKey, message.title, message.text)
  if (topics.length === 0) return { ok: true, topics: [] }

  await addVisit({ url: message.url, title: message.title, topics })
  return { ok: true, topics }
}

async function handleForecast() {
  const state = await getState()
  if (!state.apiKey) return { ok: false, reason: "no_api_key" }

  const trends = computeTrends(state.visits)
  if (trends.length === 0) return { ok: false, reason: "not_enough_data" }

  const result = await forecast(state.apiKey, trends)
  await saveForecast(result)
  return { ok: true, result }
}
