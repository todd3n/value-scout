export type NewsItem = { title: string; publisher: string; link?: string }

export type DataSource = {
  field: string
  source: string
  detail: string
}

export type Setup = 'sniper' | 'watch' | 'none' | 'error'

export type ChartPoint = { date: string; close: number }

import type { PaperTrade, TradeEvent } from '../lib/portfolio'

export type Analysis = {
  symbol: string
  name: string
  currency: string
  price: number | null
  marketCap: number | null
  sector: string | null
  industry: string | null
  metrics: {
    pe: number | null
    forwardPe: number | null
    profitMargin: number | null
    debtToEquity: number | null
    beta: number | null
    dayChangePct: number | null
    maxDayDropPct: number | null
    weekDrawdownPct: number | null
  }
  setup: Setup
  setupLabel: string
  rating: Setup
  ratingLabel: string
  conviction: 'hög' | 'medel' | 'låg'
  scorePct: number
  score: number
  maxScore: number
  dayChangePct: number | null
  maxDayDropPct: number | null
  maxDayDropDate: string | null
  dropAgeTradingDays: number | null
  dropWhenLabel: string | null
  weekDrawdownPct: number | null
  bounceTarget: number | null
  bounceUpsidePct: number | null
  fairValue: number | null
  fairValueMethod: string | null
  upsidePct: number | null
  streetTarget: number | null
  dropReason: string
  dropReasonSource: string
  sources: DataSource[]
  news: NewsItem[]
  thesis: string
  reasons: string[]
  catalysts: string[]
  risks: string[]
  breakdown: { key: string; label: string; points: number; max: number; note: string }[]
  suggestedAmount: number
  suggestedShares: number
  positionPct: number
  dataQuality: number
  verdict: 'undervalued' | 'fair' | 'overvalued' | 'unknown'
  verdictLabel: string
  chart: ChartPoint[]
  yahooUrl: string
  buyReasons: { text: string; source: string }[]
  riskItems: { text: string; source: string }[]
  researchHits: {
    title: string
    source: string
    url?: string
    publishedAt?: string
    kind: 'catalyst' | 'risk' | 'context'
  }[]
  error?: string
}

export function yahooUrlFor(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`
}

const MANUS_API_BASE = 'https://3000-i41dbe2935xmpsi1wpvd3-9e36b5fa.us2.manus.computer'

type ScanResponse = { results: Analysis[]; fetchedAt: string; source?: string }
export type PaperHistory = { trades: PaperTrade[]; events: TradeEvent[]; updatedAt?: string | null }

const PAPER_INSTALLATION_KEY = 'value-scout-installation-v1'

export function getPaperInstallationId(): string {
  try {
    const existing = localStorage.getItem(PAPER_INSTALLATION_KEY)
    if (existing && /^[A-Za-z0-9_-]{16,128}$/.test(existing)) return existing
    const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `vs_${Date.now()}_${Math.random().toString(36).slice(2)}`
    localStorage.setItem(PAPER_INSTALLATION_KEY, generated)
    return generated
  } catch {
    return `vs_${Date.now()}_${Math.random().toString(36).slice(2)}`
  }
}

export async function loadPaperHistory(): Promise<PaperHistory | null> {
  try {
    const installationId = getPaperInstallationId()
    const res = await fetch(`${MANUS_API_BASE}/api/value-scout/paper-history?installationId=${encodeURIComponent(installationId)}`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return null
    return await res.json() as PaperHistory
  } catch {
    return null
  }
}

export async function savePaperHistory(trades: PaperTrade[], events: TradeEvent[]): Promise<boolean> {
  try {
    const res = await fetch(`${MANUS_API_BASE}/api/value-scout/paper-history`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ installationId: getPaperInstallationId(), trades, events }), signal: AbortSignal.timeout(10000) })
    return res.ok
  } catch {
    return false
  }
}

async function loadFallback(): Promise<ScanResponse | null> {
  try {
    const base = (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL || "/"
    const normalizedBase = base.endsWith("/") ? base : `${base}/`
    const fallback = await fetch(`${normalizedBase}data.json?refresh=${Date.now()}`, { cache: 'no-store', signal: AbortSignal.timeout(10000) })
    if (fallback.ok) return fallback.json() as Promise<ScanResponse>
  } catch {
    // The fallback is best effort; preserve the original API failure below.
  }
  return null
}

export async function scanSymbols(
  symbols: string[],
  portfolio: number,
  risk: number,
): Promise<ScanResponse> {
  const params = new URLSearchParams({
    symbols: symbols.join(','),
    portfolio: String(portfolio),
    risk: String(risk),
    refresh: String(Date.now()),
  })
  try {
    const res = await fetch(`${MANUS_API_BASE}/api/value-scout/scan?${params}`, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
      signal: AbortSignal.timeout(60000),
    })
    if (res.ok) return res.json() as Promise<ScanResponse>
    const fallback = await loadFallback()
    if (fallback) return fallback
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `HTTP ${res.status}`)
  } catch (error) {
    const fallback = await loadFallback()
    if (fallback) return fallback
    throw error instanceof Error ? error : new Error('Scan failed')
  }
}
