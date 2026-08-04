# Value Scout

Svensk sniper-desk som skannar stora bolag (USA / UK / Sverige) efter färska nedgångar (~5–10 %) med förklarad orsak och bedömda risker — inte generisk P/E-undervärdering.

**Inte investeringsrådgivning.** Data kan vara felaktig eller fördröjd.

## Datakällor

| Behov | Källa |
| --- | --- |
| Kurs, kalender, nyckeltal | Yahoo Finance (`yahoo-finance2`) |
| Nyheter / katalysator & risk | Google News RSS (+ Yahoo-rubriker) |
| Extra bolagsnyheter (valfritt) | Finnhub — sätt `FINNHUB_API_KEY` |

## Kör lokalt

```bash
npm install
npm run dev
```

Öppna http://localhost:5173 — `/api/scan` körs via Vite-middleware.

Valfritt: `export FINNHUB_API_KEY=...` för fler US-nyheter.

## Deploy (Vercel)

`api/scan.ts` är serverless-funktionen för produktion. Lägg till `FINNHUB_API_KEY` som env-variabel om du vill ha Finnhub.

## Stack

- Vite + React + TypeScript
- yahoo-finance2 (server-side)
- Google News RSS + valfritt Finnhub
- Vercel Node API
