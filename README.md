# Value Scout

Value Scout är ett svenskt verktyg för att bevaka större börsbolag i USA, Storbritannien och Sverige. Verktyget letar efter tydliga kursnedgångar och sammanställer möjliga orsaker, nyheter och risker.

> **Viktigt:** Value Scout är ett analysverktyg, inte investeringsrådgivning. Marknadsdata kan vara fördröjd, ofullständig eller felaktig. Kontrollera alltid uppgifter mot primärkällor innan du fattar investeringsbeslut.

## Kom igång

Kräver en aktuell version av Node.js och npm.

```bash
npm install
npm run dev
```

Öppna adressen som Vite skriver ut i terminalen (vanligtvis http://localhost:5173).

## Datakällor och konfiguration

| Data | Källa |
| --- | --- |
| Kurser, kalender och nyckeltal | Yahoo Finance via `yahoo-finance2` |
| Nyheter och möjliga katalysatorer | Google News RSS och Yahoo-rubriker |
| Extra bolagsnyheter | Finnhub (valfritt) |

För att aktivera Finnhub-nyheter anger du en API-nyckel i miljövariabeln `FINNHUB_API_KEY`. Lägg inte API-nycklar i klientkod eller i versionshanteringen.

Lokalt kan variabeln exempelvis sättas innan utvecklingsservern startas:

```bash
export FINNHUB_API_KEY="din-nyckel"
npm run dev
```

## API och driftsättning

- Lokalt hanteras `/api/scan` av Vites middleware.
- I produktion används `api/scan.ts` som Vercel serverless-funktion.
- Lägg till `FINNHUB_API_KEY` bland projektets miljövariabler i Vercel om du vill använda Finnhub.

## Teknik

- Vite, React och TypeScript
- `yahoo-finance2` på serversidan
- Google News RSS och valfritt Finnhub
- Vercel Node API

## Datakvalitet och risker

En identifierad kursnedgång är en signal för vidare undersökning, inte ett köpbeslut. Nyhetsmatchning kan missa relevanta händelser eller koppla en rubrik till fel bolag. Kontrollera datum, valuta, bolagshändelser, rapporter och aktuell prisdata själv.

## Licens

Ingen licens är angiven ännu. Kontakta repository-ägaren innan du återanvänder eller distribuerar koden.
