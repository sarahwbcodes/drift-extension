const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"

async function call(apiKey: string, model: string, system: string, user: string, maxTokens: number): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
    }),
  })
  if (!res.ok) throw new Error(`Groq error: ${res.status}`)
  const data = await res.json()
  return data.choices[0].message.content.trim()
}

const CLASSIFY_SYSTEM = `Extract 2-4 topic tags from this web page. Tags should be specific but reusable (e.g. "venture capital", "climate tech", "machine learning", "urban planning"). Return only a JSON array of strings. No prose.`

export async function classifyPage(apiKey: string, title: string, text: string): Promise<string[]> {
  const raw = await call(
    apiKey,
    "llama-3.1-8b-instant",
    CLASSIFY_SYSTEM,
    `Title: ${title}\n\nContent:\n${text.slice(0, 3000)}`,
    128
  )
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map((t: string) => t.toLowerCase().trim()) : []
  } catch {
    return []
  }
}

const FORECAST_SYSTEM = `You are analyzing someone's browsing patterns over the past two weeks. You have a list of topics ranked by velocity — how much they've accelerated recently vs before.

Your job: tell the person what they're drifting toward and what that might mean. Be specific and insightful. Reference the actual topics. Suggest 2-3 concrete things they could explore next based on the trajectory.

Keep it to 3 short paragraphs. No bullet points. Write like a smart friend noticing a pattern, not a report.`

export async function forecast(apiKey: string, trends: { topic: string; velocity: number; recent: number }[]): Promise<string> {
  const top = trends.slice(0, 10).map((t) => `${t.topic} (${t.recent} recent visits, velocity ${t.velocity.toFixed(1)}x)`).join("\n")
  return call(apiKey, "llama-3.3-70b-versatile", FORECAST_SYSTEM, `Trending topics:\n${top}`, 512)
}
