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

const BATCH = 12

export async function scanSymbols(
  symbols: string[],
  portfolio: number,
  risk: number,
  onProgress?: (done: number, total: number) => void,
): Promise<{ results: Analysis[]; fetchedAt: string }> {
  const unique = [...new Set(symbols.map((s) => s.trim().toUpperCase()).filter(Boolean))]
  const batches: string[][] = []
  for (let i = 0; i < unique.length; i += BATCH) {
    batches.push(unique.slice(i, i + BATCH))
  }

  const merged: Analysis[] = []
  let done = 0
  let fetchedAt = new Date().toISOString()

  for (const batch of batches) {
    const params = new URLSearchParams({
      symbols: batch.join(','),
      portfolio: String(portfolio),
      risk: String(risk),
    })
    const res = await fetch(`/api/scan?${params}`)
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: string }
      throw new Error(err.error || `HTTP ${res.status}`)
    }
    const data = (await res.json()) as { results: Analysis[]; fetchedAt: string }
    merged.push(...data.results)
    fetchedAt = data.fetchedAt
    done += batch.length
    onProgress?.(done, unique.length)
  }

  const rank = (r: Analysis['rating']) =>
    r === 'overweight' ? 3 : r === 'neutral' ? 2 : r === 'underweight' ? 1 : 0

  merged.sort((a, b) => {
    const d = rank(b.rating) - rank(a.rating)
    if (d !== 0) return d
    return b.scorePct - a.scorePct
  })

  return { results: merged, fetchedAt }
}
