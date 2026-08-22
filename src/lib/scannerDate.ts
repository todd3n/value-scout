import type { Analysis } from '../api/client'

function timeZoneForSymbol(symbol: string) {
  if (symbol.endsWith('.ST')) return 'Europe/Stockholm'
  if (symbol.endsWith('.L')) return 'Europe/London'
  return 'America/New_York'
}

function marketDateUtc(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date)
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value)
  return Date.UTC(get('year'), get('month') - 1, get('day'))
}

/** Rewrites an old cached relative label against the current market calendar. */
export function normalizeScannerDropLabel(analysis: Analysis, asOf = new Date()): Analysis {
  if (!analysis.dropWhenLabel || !analysis.maxDayDropDate) return analysis
  const dropDate = new Date(analysis.maxDayDropDate)
  if (!Number.isFinite(dropDate.getTime())) return analysis
  const timeZone = timeZoneForSymbol(analysis.symbol)
  const start = marketDateUtc(dropDate, timeZone)
  const end = marketDateUtc(asOf, timeZone)
  let cursor = start
  let tradingDays = 0
  while (cursor < end) {
    cursor += 86_400_000
    const weekday = new Date(cursor).getUTCDay()
    if (weekday !== 0 && weekday !== 6) tradingDays += 1
  }
  const when =
    start === end
      ? 'i dag'
      : tradingDays === 0
        ? 'senaste handelsdagen'
        : `för ${tradingDays} ${tradingDays === 1 ? 'handelsdag' : 'handelsdagar'} sedan`
  return {
    ...analysis,
    dropWhenLabel: analysis.dropWhenLabel.replace(
      /\((?:i dag|i går|senaste handelsdagen|för \d+ handelsdag(?:ar)? sedan)\)/i,
      `(${when})`,
    ),
  }
}
