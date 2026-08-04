# Value Scout

Svensk webbapp som skannar aktier via Yahoo Finance, ger ett värdescore (P/E, PEG, P/B, m.m.) och föreslår ungefärlig positionstorlek utifrån din portfölj och risknivå.

**Inte investeringsrådgivning.** Data kan vara felaktig eller fördröjd.

## Kör lokalt

```bash
npm install
npm run dev
```

Öppna http://localhost:5173 — `/api/scan` körs via Vite-middleware med `yahoo-finance2`.

## Deploy (Vercel)

`api/scan.ts` är serverless-funktionen för produktion. Deploya projektet till Vercel.

## Stack

- Vite + React + TypeScript
- yahoo-finance2 (server-side)
- Vercel Node API
