# Drift

The predictive sister of Cue. Watches your browsing over time and tells you what you're drifting toward — topics accelerating in your reading before you've consciously noticed them.

## How it works

Every page you visit gets classified into topic tags. Over days, Drift tracks which topics are appearing more frequently. When you ask for a forecast, it narrates the pattern: what's accelerating, what it might mean, what to explore next.

No goal-setting. Fully passive. The insight is the payoff.

## Reading the numbers

Each topic in the trends view shows a bar and a number like `↑5.3`. That number is the **7-day forecast** — how many times per day Drift predicts you'll visit pages on that topic in a week, based on your recent trajectory.

The forecast is calculated using **EWMA (Exponential Weighted Moving Average)** + linear regression. EWMA smooths out noisy day-to-day variation while giving more weight to recent activity — so a topic you started reading heavily this week ranks higher than one you read a lot two weeks ago but have since dropped. A linear trend is then fitted to the smoothed curve and extrapolated 7 days forward.

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
