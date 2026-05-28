# Drift

Watches your browsing over time and tells you what you're drifting toward — topics accelerating in your reading before you've consciously noticed them.

## How it works

Every page you visit gets classified into topic tags. Over days, Drift tracks which topics are appearing more frequently. When you ask for a forecast, it narrates the pattern: what's accelerating, what it might mean, what to explore next.

No goal-setting. Fully passive. The insight is the payoff.

## Install

### 1. Get a Groq API key (free)
Sign up at [console.groq.com](https://console.groq.com) → API Keys → Create API Key.

### 2. Download and build
```bash
git clone https://github.com/sarahwbcodes/drift-extension.git
cd drift-extension
npm install
npm run build
```

### 3. Load into your browser

**Chrome / Arc**
1. Go to `chrome://extensions` (or `arc://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select `build/chrome-mv3-prod`

### 4. Use it
1. Click the Drift icon → enter your Groq API key
2. Browse normally for a day or two
3. Click **Forecast** to see what you're drifting toward
