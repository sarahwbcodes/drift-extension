import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_idle",
}

function extractText(): string {
  const clone = document.body?.cloneNode(true) as HTMLElement
  if (!clone) return ""
  clone.querySelectorAll("nav, footer, header, script, style, noscript, aside").forEach((el) => el.remove())
  return clone.innerText.replace(/\s+/g, " ").trim()
}

async function run() {
  if (!document.body || document.title === "New Tab") return
  const url = window.location.href
  if (url.startsWith("chrome://") || url.startsWith("chrome-extension://") || url.startsWith("arc://")) return

  const text = extractText()
  if (text.length < 200) return

  chrome.runtime.sendMessage({ type: "PAGE_CONTENT", url, title: document.title, text })
}

run()
