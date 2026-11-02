# Mind Gym

Offline meditation + brain training PWA — a private alternative to Lumosity Mind / Balance. No account, no downloads, no network after install. Everything runs on-device.

Live: https://arshcheema4570.github.io/mind-gym/

## What's inside

**🧘 Meditate** — guided sessions spoken by your device's built-in voices (0 MB, offline):
- Focus Reset (5 min), Deep Calm (10 min), Sleep Wind-Down (8 min), Stress Reset (5 min box breathing)
- Visual breathing pacer with phase tones, timed quiet pauses, session completion tracking

**🧠 Train** — four games built around the exercises with the best cognitive evidence:
- **N-Back** (adaptive 1→2→3…): the most-studied working-memory exercise
- **Stroop** (30s): attention control / executive function
- **Reaction** (5 rounds): processing speed in ms
- **Sequence**: short-term memory span

**📊 Progress** — day streak, total meditation minutes, training rounds, personal bests, last-7-days activity bars. All in localStorage, on your device.

## Honest notes

- Brain-training gains are strongest on the trained skill itself; the app picks the exercises with the best evidence and shows your own trend lines instead of promising miracles.
- iOS: if installed-app audio behaves oddly, open the page in Safari.
- No analytics, no accounts, zero external URLs.

## Run locally

Any static server, e.g. `python3 -m http.server`, then open http://localhost:8000.
