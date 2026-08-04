export type NewsItem = { title: string; publisher: string; link?: string }

export type DataSource = {
  field: string
  source: string
  detail: string
}

export type Setup = 'sniper' | 'watch' | 'none' | 'error'

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
  error?: string
}

export async function scanSymbols(
  symbols: string[],
  portfolio: number,
  risk: number,
): Promise<{ results: Analysis[]; fetchedAt: string }> {
  const params = new URLSearchParams({
    symbols: symbols.join(','),
    portfolio: String(portfolio),
    risk: String(risk),
  })
  const res = await fetch(`/api/scan?${params}`)
  if (!res.ok) {
    const err = (await res.json().catch(() => ({}))) as { error?: string }
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}
