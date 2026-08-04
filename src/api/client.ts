export type Analysis = {
  symbol: string
  name: string
  currency: string
  price: number | null
  marketCap: number | null
  sector: string | null
  industry: string | null
  score: number
  maxScore: number
  scorePct: number
  conviction: 'hög' | 'medel' | 'låg'
  rating: 'overweight' | 'neutral' | 'underweight' | 'insufficient'
  ratingLabel: string
  verdict: 'undervalued' | 'fair' | 'overvalued' | 'unknown'
  verdictLabel: string
  upsidePct: number | null
  fairValue: number | null
  fairValueMethod: string | null
  thesis: string
  catalysts: string[]
  risks: string[]
  reasons: string[]
  breakdown: { key: string; label: string; points: number; max: number; note: string }[]
  suggestedAmount: number
  suggestedShares: number
  positionPct: number
  dataQuality: number
  error?: string
  metrics: {
    pe: number | null
    forwardPe: number | null
    peg: number | null
    pb: number | null
    evEbitda: number | null
    profitMargin: number | null
    debtToEquity: number | null
    targetMean: number | null
    dividendYield: number | null
    freeCashflow: number | null
    roe: number | null
    beta: number | null
  }
}

/** Single request — continuous scanner sends small batches. */
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
