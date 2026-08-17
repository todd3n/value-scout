export type Market = 'USA' | 'UK' | 'Sverige'

export type MarketSession = {
  market: Market
  label: string
  timezone: string
  openMinutes: number
  closeMinutes: number
}

const SESSIONS: Record<Market, MarketSession> = {
  USA: { market: 'USA', label: 'USA-börsen', timezone: 'America/New_York', openMinutes: 9 * 60 + 30, closeMinutes: 16 * 60 },
  UK: { market: 'UK', label: 'Londonbörsen', timezone: 'Europe/London', openMinutes: 8 * 60, closeMinutes: 16 * 60 + 30 },
  Sverige: { market: 'Sverige', label: 'Stockholmsbörsen', timezone: 'Europe/Stockholm', openMinutes: 9 * 60, closeMinutes: 17 * 60 + 30 },
}

function zonedParts(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return { weekday: get('weekday'), hour: Number(get('hour')), minute: Number(get('minute')) }
}

export function marketForSymbol(symbol: string, currency?: string): Market {
  const normalized = symbol.trim().toUpperCase()
  if (normalized.endsWith('.ST') || currency === 'SEK') return 'Sverige'
  if (normalized.endsWith('.L') || currency === 'GBP' || currency === 'GBX') return 'UK'
  return 'USA'
}

export function marketSession(market: Market): MarketSession {
  return SESSIONS[market]
}

export function isMarketOpen(market: Market, now = new Date()): boolean {
  const session = SESSIONS[market]
  const local = zonedParts(now, session.timezone)
  if (local.weekday === 'Sat' || local.weekday === 'Sun') return false
  const minutes = local.hour * 60 + local.minute
  return minutes >= session.openMinutes && minutes < session.closeMinutes
}

export function marketStatus(market: Market, now = new Date()) {
  const session = SESSIONS[market]
  return {
    market,
    label: session.label,
    isOpen: isMarketOpen(market, now),
    hours: `${String(Math.floor(session.openMinutes / 60)).padStart(2, '0')}:${String(session.openMinutes % 60).padStart(2, '0')}–${String(Math.floor(session.closeMinutes / 60)).padStart(2, '0')}:${String(session.closeMinutes % 60).padStart(2, '0')} lokal tid`,
  }
}
