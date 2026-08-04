export type NewsItem = { title: string; publisher: string; link?: string }

export type DataSource = {
  field: string
  source: string
  detail: string
}

export type RawSniper = {
  symbol: string
  name: string
  currency: string
  price: number | null
  marketCap: number | null
  sector: string | null
  industry: string | null
  beta: number | null
  pe: number | null
  forwardPe: number | null
  profitMargin: number | null
  debtToEquity: number | null
  dayChangePct: number | null
  maxDayDropPct: number | null
  maxDayDropDate: string | null
  dropAgeTradingDays: number | null
  dropWhenLabel: string | null
  weekDrawdownPct: number | null
  weekHighDate: string | null
  stillDown: boolean
  recentHigh: number | null
  bounceTarget: number | null
  bounceUpsidePct: number | null
  streetTarget: number | null
  streetUpsidePct: number | null
  exDividendDate: string | null
  dividendDate: string | null
  earningsDate: string | null
  news: NewsItem[]
  qualityOk: boolean
  chart: { date: string; close: number }[]
  yahooUrl: string
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
  chart: { date: string; close: number }[]
  yahooUrl: string
  error?: string
}

function raw(v: unknown): number | null {
  if (v == null) return null
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'object' && v && 'raw' in v) {
    const n = (v as { raw: unknown }).raw
    return typeof n === 'number' && Number.isFinite(n) ? n : null
  }
  return null
}

function asIso(v: unknown): string | null {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  if (typeof v === 'string') return v
  if (typeof v === 'number') return new Date(v * (v < 1e12 ? 1000 : 1)).toISOString()
  return null
}

function daysFromNow(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return (t - Date.now()) / 86400000
}

function daysSince(iso: string | null): number | null {
  const d = daysFromNow(iso)
  return d == null ? null : -d
}

function isLargeCap(marketCap: number | null, currency: string, symbol: string): boolean {
  if (marketCap == null || marketCap <= 0) return false
  if (symbol.endsWith('.ST')) return marketCap >= 15_000_000_000 // SEK
  if (symbol.endsWith('.L') || currency === 'GBp' || currency === 'GBP') return marketCap >= 2_000_000_000
  return marketCap >= 8_000_000_000 // USD
}

function formatSvDate(d: Date): string {
  return d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

function tradingSessionsAgo(closes: { date: Date }[], dropDate: Date): number {
  let n = 0
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i].date.getTime() <= dropDate.getTime() + 12 * 3600000) break
    n++
  }
  return n
}

function yahooQuoteUrl(symbol: string): string {
  return `https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}`
}

export async function fetchSniper(yf: any, symbol: string): Promise<RawSniper> {
  // ~1 month of bars for the chart; signal window stays last 5 sessions.
  const period1 = new Date(Date.now() - 40 * 86400000)
  const [quote, chartRes, summary] = await Promise.all([
    yf.quote(symbol),
    yf.chart(symbol, { period1, interval: '1d' }),
    yf.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryProfile',
        'summaryDetail',
        'financialData',
        'defaultKeyStatistics',
        'calendarEvents',
      ],
    }),
  ])

  const name = quote.shortName || quote.longName || symbol
  let news: NewsItem[] = []
  try {
    const q = name.replace(/\s+(ord|plc|ab|inc|corp|group).*$/i, '').slice(0, 40)
    const search = await yf.search(q || symbol)
    news = (search.news || [])
      .slice(0, 4)
      .map((n: any) => ({
        title: String(n.title || ''),
        publisher: String(n.publisher || 'Yahoo'),
        link: n.link ? String(n.link) : undefined,
      }))
      .filter((n: NewsItem) => n.title)
  } catch {
    news = []
  }

  const closes = (chartRes.quotes || [])
    .filter((c: any) => c && c.close != null && c.date)
    .map((c: any) => ({
      date: new Date(c.date),
      close: Number(c.close),
    }))

  // Only measure day-to-day drops inside the last 5 trading sessions.
  const LOOKBACK = 5
  const start = Math.max(1, closes.length - LOOKBACK)
  let maxDayDropPct: number | null = null
  let maxDayDropDate: string | null = null
  let maxDayDropDateObj: Date | null = null
  for (let i = start; i < closes.length; i++) {
    const prev = closes[i - 1].close
    const cur = closes[i].close
    if (prev <= 0) continue
    const d = ((cur - prev) / prev) * 100
    if (maxDayDropPct == null || d < maxDayDropPct) {
      maxDayDropPct = d
      maxDayDropDateObj = closes[i].date
      maxDayDropDate = closes[i].date.toISOString()
    }
  }

  const dropAgeTradingDays =
    maxDayDropDateObj != null ? tradingSessionsAgo(closes, maxDayDropDateObj) : null

  let dropWhenLabel: string | null = null
  if (maxDayDropDateObj != null && maxDayDropPct != null) {
    const age = dropAgeTradingDays ?? 0
    const when =
      age === 0
        ? 'i dag'
        : age === 1
          ? 'i går'
          : `för ${age} handelsdagar sedan`
    dropWhenLabel = `${maxDayDropPct.toFixed(1).replace('.', ',')} % ${formatSvDate(maxDayDropDateObj)} (${when})`
  }

  const window = closes.slice(-LOOKBACK)
  const last = window[window.length - 1]?.close ?? quote.regularMarketPrice ?? null
  let recentHigh: number | null = null
  let weekHighDate: string | null = null
  for (const c of window) {
    if (recentHigh == null || c.close > recentHigh) {
      recentHigh = c.close
      weekHighDate = c.date.toISOString()
    }
  }

  const weekDrawdownPct =
    last != null && recentHigh != null && recentHigh > 0
      ? ((last - recentHigh) / recentHigh) * 100
      : null

  // Still "down" = has not recovered most of the move (still ≥4% under recent high).
  const stillDown = weekDrawdownPct != null && weekDrawdownPct <= -4

  const bounceTarget = recentHigh
  const bounceUpsidePct =
    last != null && bounceTarget != null && last > 0
      ? ((bounceTarget - last) / last) * 100
      : null

  const fd = summary.financialData ?? {}
  const sp = summary.summaryProfile ?? {}
  const sd = summary.summaryDetail ?? {}
  const cal = summary.calendarEvents ?? {}
  const streetTarget = raw(fd.targetMeanPrice)
  const price = quote.regularMarketPrice ?? last
  const streetUpsidePct =
    price != null && streetTarget != null && price > 0
      ? ((streetTarget - price) / price) * 100
      : null

  const currency = quote.currency || 'USD'
  const marketCap = quote.marketCap ?? raw(summary.price?.marketCap) ?? null
  const profitMargin = raw(fd.profitMargins)
  const pe = quote.trailingPE ?? raw(sd.trailingPE)
  const qualityOk =
    isLargeCap(marketCap, currency, symbol) && (profitMargin == null || profitMargin > -0.05)

  const chart = closes.slice(-30).map((c: { date: Date; close: number }) => ({
    date: c.date.toISOString(),
    close: c.close,
  }))

  return {
    symbol,
    name,
    currency,
    price,
    marketCap,
    sector: sp.sector ?? null,
    industry: sp.industry ?? null,
    beta: quote.beta ?? raw(sd.beta),
    pe,
    forwardPe: quote.forwardPE ?? raw(sd.forwardPE),
    profitMargin,
    debtToEquity: raw(fd.debtToEquity),
    dayChangePct: quote.regularMarketChangePercent ?? null,
    maxDayDropPct,
    maxDayDropDate,
    dropAgeTradingDays,
    dropWhenLabel,
    weekDrawdownPct,
    weekHighDate,
    stillDown,
    recentHigh,
    bounceTarget,
    bounceUpsidePct,
    streetTarget,
    streetUpsidePct,
    exDividendDate: asIso(cal.exDividendDate),
    dividendDate: asIso(cal.dividendDate),
    earningsDate: asIso(cal.earnings?.earningsDate?.[0]),
    news,
    qualityOk,
    chart,
    yahooUrl: yahooQuoteUrl(symbol),
  }
}

function explainDrop(m: RawSniper): { reason: string; source: string; strength: number } {
  const exAgo = daysSince(m.exDividendDate)
  const earnIn = daysFromNow(m.earningsDate)
  const earnAgo = daysSince(m.earningsDate)

  if (exAgo != null && exAgo >= -1 && exAgo <= 7) {
    return {
      reason: `Ex-dividend för ${Math.max(0, Math.round(exAgo))} handelsdag(ar) sedan. Kursjustering kopplad till utdelning.`,
      source: 'Yahoo Finance, kalender (ex-dividend)',
      strength: 3,
    }
  }
  if (earnAgo != null && earnAgo >= 0 && earnAgo <= 5) {
    return {
      reason: `Delårsrapport publicerad för ${Math.round(earnAgo)} dag(ar) sedan. Prissättning efter rapport.`,
      source: 'Yahoo Finance, kalender (earnings)',
      strength: 3,
    }
  }
  if (earnIn != null && earnIn >= -1 && earnIn <= 3) {
    return {
      reason: `Rapport väntas inom ${Math.ceil(Math.max(earnIn, 0))} dag(ar). Förhöjd volatilitet.`,
      source: 'Yahoo Finance, kalender (earnings)',
      strength: 1,
    }
  }
  if (m.news[0]) {
    return {
      reason: `${m.news[0].title} (${m.news[0].publisher})`,
      source: 'Yahoo Finance, nyheter',
      strength: 2,
    }
  }
  if ((m.maxDayDropPct ?? 0) <= -5 || (m.weekDrawdownPct ?? 0) <= -5) {
    return {
      reason: 'Nedgång utan identifierad kalenderhändelse. Orsak ej verifierad.',
      source: 'Yahoo Finance, kursdata',
      strength: 0,
    }
  }
  return {
    reason: 'Ingen relevant nedgång eller händelse.',
    source: '—',
    strength: 0,
  }
}

export function scoreSniper(m: RawSniper): Omit<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'> {
  const sources: DataSource[] = [
    {
      field: 'Senaste kurs',
      source: 'Yahoo Finance',
      detail: 'Live-/fördröjd börskurs',
    },
    {
      field: 'Nedgång',
      source: 'Yahoo Finance',
      detail: 'Dagliga stängningskurser, ca 15 handelsdagar',
    },
    {
      field: 'Utdelning och rapport',
      source: 'Yahoo Finance',
      detail: 'Bolagskalender',
    },
    {
      field: 'Nyheter',
      source: 'Yahoo Finance',
      detail: 'Senaste rubriker',
    },
    {
      field: 'Analytikermål',
      source: 'Yahoo Finance',
      detail: 'Konsensus målkurs (längre horisont)',
    },
    {
      field: 'Återhämtningsnivå',
      source: 'Beräknad',
      detail: 'Senaste 5–6 dagars högsta stängning',
    },
  ]

  const explain = explainDrop(m)
  const breakdown: Analysis['breakdown'] = []
  const reasons: string[] = []
  const catalysts: string[] = []
  const risks: string[] = []

  const day = m.dayChangePct
  const maxDrop = m.maxDayDropPct
  const week = m.weekDrawdownPct
  const age = m.dropAgeTradingDays
  const fresh = age != null && age <= 3
  const sharp =
    fresh &&
    ((maxDrop != null && maxDrop <= -5.5) || (day != null && day <= -5 && age === 0))

  {
    let pts = 0
    const worst = Math.min(day ?? 0, maxDrop ?? 0, week ?? 0)
    let note = m.dropWhenLabel || `${worst.toFixed(1)}%`
    if (!fresh) {
      pts = 0
      note = m.dropWhenLabel
        ? `${m.dropWhenLabel} · för gammal (>3 handelsdagar)`
        : 'Ingen färsk nedgång'
    } else if (worst <= -10) {
      pts = 30
      note += ' · kraftig'
      reasons.push(m.dropWhenLabel || `Nedgång ${worst.toFixed(1)}%`)
    } else if (worst <= -7) {
      pts = 24
      note += ' · tydlig'
      reasons.push(m.dropWhenLabel || `Nedgång ${worst.toFixed(1)}%`)
    } else if (worst <= -5.5) {
      pts = 16
      note += ' · på gränsen'
      reasons.push(m.dropWhenLabel || `Nedgång ${worst.toFixed(1)}%`)
    } else {
      pts = 0
      note += ' · under tröskel'
    }
    if (!m.stillDown) {
      pts = Math.min(pts, 4)
      note += ' · har återhämtats'
      risks.push('Kursen har redan återhämtat merparten av fallet')
    }
    breakdown.push({ key: 'dip', label: 'Nedgång', points: pts, max: 30, note })
  }

  {
    let strength = explain.strength
    if (strength === 2 && (age == null || age > 1)) strength = 1
    const pts = strength === 3 ? 25 : strength === 2 ? 14 : strength === 1 ? 4 : 0
    breakdown.push({
      key: 'why',
      label: 'Orsak',
      points: pts,
      max: 25,
      note: explain.reason.slice(0, 140),
    })
    if (pts >= 14) reasons.push('Identifierad orsak')
    if (pts < 14 && sharp) risks.push('Svag eller saknad orsak')
  }

  {
    let pts = 0
    let note = m.qualityOk ? 'Uppfyller storlekskrav' : 'Under storlekskrav'
    if (m.qualityOk) {
      pts = 20
      reasons.push('Large cap')
    }
    if (m.profitMargin != null && m.profitMargin > 0.08) {
      pts = Math.min(25, pts + 5)
      note += ' · positiv marginal'
    }
    if (m.beta != null && m.beta > 1.6) {
      pts = Math.max(0, pts - 5)
      risks.push('Hög beta')
      note += ' · hög beta'
    }
    breakdown.push({ key: 'quality', label: 'Bolagskvalitet', points: pts, max: 25, note })
  }

  {
    const up = m.bounceUpsidePct
    let pts = 0
    let note = up == null ? 'Saknas' : `${up.toFixed(1)}% till återhämtningsnivå`
    if (m.stillDown && up != null && up >= 5.5) {
      pts = 20
      note += ' · ≥5,5%'
      catalysts.push(
        `Återhämtning till ${m.bounceTarget?.toFixed(2)} ${m.currency} ≈ ${up.toFixed(1)}%`,
      )
    } else if (m.stillDown && up != null && up >= 4) {
      pts = 8
      note += ' · begränsad'
    } else {
      pts = 0
      note += ' · otillräcklig'
    }
    breakdown.push({ key: 'bounce', label: 'Återhämtningspotential', points: pts, max: 20, note })
  }

  const score = breakdown.reduce((s, b) => s + b.points, 0)
  const maxScore = breakdown.reduce((s, b) => s + b.max, 0)
  const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0

  let setup: Setup = 'none'
  let setupLabel = '—'
  const reasonOk =
    explain.strength >= 3 || (explain.strength >= 2 && age != null && age <= 1)
  if (
    sharp &&
    m.stillDown &&
    m.qualityOk &&
    reasonOk &&
    scorePct >= 62 &&
    (m.bounceUpsidePct ?? 0) >= 5.5
  ) {
    setup = 'sniper'
    setupLabel = 'Köpläge'
  } else if (sharp && m.stillDown && m.qualityOk) {
    setup = 'watch'
    setupLabel = 'Bevakning'
  }

  if (setup === 'sniper') {
    risks.push('Kortsiktig återhämtning är inte garanterad')
  }

  const fairValue = m.bounceTarget
  const fairValueMethod =
    'Återhämtningsnivå = högsta stängning senaste 5 handelsdagar (Yahoo). Analytikermål avser längre horisont.'

  const targetStr =
    m.bounceTarget != null ? `${m.bounceTarget.toFixed(2)} ${m.currency}` : '—'
  const upStr = m.bounceUpsidePct != null ? `${m.bounceUpsidePct.toFixed(1)}%` : '—'
  const when = m.dropWhenLabel ? `Nedgång ${m.dropWhenLabel}. ` : ''

  const thesis =
    setup === 'sniper'
      ? `${m.name}: ${when}${explain.reason} Återhämtningsnivå ${targetStr} ≈ ${upStr}.`
      : setup === 'watch'
        ? `${m.name}: ${when}Uppfyller inte alla krav för köpläge.`
        : `${m.name}: Inget aktuellt köpläge.`

  return {
    symbol: m.symbol,
    name: m.name,
    currency: m.currency,
    price: m.price,
    marketCap: m.marketCap,
    sector: m.sector,
    industry: m.industry,
    metrics: {
      pe: m.pe,
      forwardPe: m.forwardPe,
      profitMargin: m.profitMargin,
      debtToEquity: m.debtToEquity,
      beta: m.beta,
      dayChangePct: m.dayChangePct,
      maxDayDropPct: m.maxDayDropPct,
      weekDrawdownPct: m.weekDrawdownPct,
    },
    setup,
    setupLabel,
    rating: setup,
    ratingLabel: setupLabel,
    conviction: setup === 'sniper' ? (scorePct >= 70 ? 'hög' : 'medel') : 'låg',
    scorePct: Math.round(scorePct * 10) / 10,
    score,
    maxScore,
    dayChangePct: m.dayChangePct,
    maxDayDropPct: m.maxDayDropPct,
    maxDayDropDate: m.maxDayDropDate,
    dropAgeTradingDays: m.dropAgeTradingDays,
    dropWhenLabel: m.dropWhenLabel,
    weekDrawdownPct: m.weekDrawdownPct,
    bounceTarget: m.bounceTarget,
    bounceUpsidePct: m.bounceUpsidePct != null ? Math.round(m.bounceUpsidePct * 10) / 10 : null,
    fairValue,
    fairValueMethod,
    upsidePct: m.bounceUpsidePct != null ? Math.round(m.bounceUpsidePct * 10) / 10 : null,
    streetTarget: m.streetTarget,
    dropReason: explain.reason,
    dropReasonSource: explain.source,
    sources,
    news: m.news,
    thesis,
    reasons: reasons.slice(0, 5),
    catalysts: catalysts.slice(0, 4),
    risks: risks.slice(0, 5),
    breakdown,
    dataQuality: Math.min(
      100,
      40 +
        (m.news.length > 0 ? 15 : 0) +
        (m.exDividendDate || m.earningsDate ? 20 : 0) +
        (m.maxDayDropPct != null ? 25 : 0),
    ),
    verdict: setup === 'sniper' ? 'undervalued' : setup === 'watch' ? 'fair' : 'unknown',
    verdictLabel: setupLabel,
    chart: m.chart,
    yahooUrl: m.yahooUrl,
  }
}

export function positionSize(
  a: Omit<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'>,
  portfolio: number,
  riskPct: number,
): Pick<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'> {
  if (a.setup !== 'sniper') {
    return { suggestedAmount: 0, suggestedShares: 0, positionPct: 0 }
  }
  const base = Math.max(0.5, Math.min(riskPct, 4))
  const positionPct = Math.min(6, base * (0.7 + a.scorePct / 100))
  const amount = portfolio * (positionPct / 100)
  const shares = a.price && a.price > 0 ? Math.floor(amount / a.price) : 0
  return {
    suggestedAmount: Math.round(amount),
    suggestedShares: shares,
    positionPct: Math.round(positionPct * 10) / 10,
  }
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      results[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()))
  return results
}

function empty(symbol: string, error: string): Analysis {
  const base = scoreSniper({
    symbol,
    name: symbol,
    currency: '—',
    price: null,
    marketCap: null,
    sector: null,
    industry: null,
    beta: null,
    pe: null,
    forwardPe: null,
    profitMargin: null,
    debtToEquity: null,
    dayChangePct: null,
    maxDayDropPct: null,
    maxDayDropDate: null,
    dropAgeTradingDays: null,
    dropWhenLabel: null,
    weekDrawdownPct: null,
    weekHighDate: null,
    stillDown: false,
    recentHigh: null,
    bounceTarget: null,
    bounceUpsidePct: null,
    streetTarget: null,
    streetUpsidePct: null,
    exDividendDate: null,
    dividendDate: null,
    earningsDate: null,
    news: [],
    qualityOk: false,
    chart: [],
    yahooUrl: yahooQuoteUrl(symbol),
  })
  return {
    ...base,
    ...positionSize(base, 0, 0),
    setup: 'error',
    setupLabel: 'Fel',
    rating: 'error',
    ratingLabel: 'Fel',
    error,
  }
}

export async function analyzeSymbols(
  yf: any,
  symbols: string[],
  portfolio: number,
  riskPct: number,
): Promise<Analysis[]> {
  const unique = [...new Set(symbols.map((s) => s.trim()).filter(Boolean))].slice(0, 40)
  const out = await mapPool(unique, 3, async (symbol) => {
    try {
      const rawM = await fetchSniper(yf, symbol)
      const scored = scoreSniper(rawM)
      return { ...scored, ...positionSize(scored, portfolio, riskPct) }
    } catch (e) {
      return empty(symbol, e instanceof Error ? e.message : 'Fel')
    }
  })

  return out.sort((a, b) => {
    const rank = (s: Setup) => (s === 'sniper' ? 3 : s === 'watch' ? 2 : s === 'none' ? 1 : 0)
    const d = rank(b.setup) - rank(a.setup)
    if (d !== 0) return d
    // Prefer fresher drops when ranking köplägen
    const ageA = a.dropAgeTradingDays ?? 99
    const ageB = b.dropAgeTradingDays ?? 99
    if (ageA !== ageB) return ageA - ageB
    return (a.maxDayDropPct ?? 0) - (b.maxDayDropPct ?? 0)
  })
}

/** @deprecated alias kept for older imports */
export const fetchMetrics = fetchSniper
export const scoreMetrics = scoreSniper
