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
  weekDrawdownPct: number | null
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

export async function fetchSniper(yf: any, symbol: string): Promise<RawSniper> {
  const period1 = new Date(Date.now() - 21 * 86400000)
  const [quote, chart, summary] = await Promise.all([
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
    news = (search.news || []).slice(0, 4).map((n: any) => ({
      title: String(n.title || ''),
      publisher: String(n.publisher || 'Yahoo'),
      link: n.link ? String(n.link) : undefined,
    })).filter((n: NewsItem) => n.title)
  } catch {
    news = []
  }

  const closes = (chart.quotes || [])
    .filter((c: any) => c && c.close != null && c.date)
    .map((c: any) => ({
      date: new Date(c.date),
      close: Number(c.close),
    }))

  let maxDayDropPct: number | null = null
  let maxDayDropDate: string | null = null
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1].close
    const cur = closes[i].close
    if (prev <= 0) continue
    const d = ((cur - prev) / prev) * 100
    if (maxDayDropPct == null || d < maxDayDropPct) {
      maxDayDropPct = d
      maxDayDropDate = closes[i].date.toISOString()
    }
  }

  const window = closes.slice(-6)
  const last = window[window.length - 1]?.close ?? quote.regularMarketPrice ?? null
  const recentHigh =
    window.length > 0 ? Math.max(...window.map((c: { close: number }) => c.close)) : null
  const weekDrawdownPct =
    last != null && recentHigh != null && recentHigh > 0
      ? ((last - recentHigh) / recentHigh) * 100
      : null

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
    isLargeCap(marketCap, currency, symbol) &&
    (profitMargin == null || profitMargin > -0.05) &&
    (pe == null || pe > 0 || pe < 0) // allow missing PE

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
    weekDrawdownPct,
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
  }
}

function explainDrop(m: RawSniper): { reason: string; source: string; strength: number } {
  const exAgo = daysSince(m.exDividendDate)
  const earnIn = daysFromNow(m.earningsDate)
  const earnAgo = daysSince(m.earningsDate)

  if (exAgo != null && exAgo >= -1 && exAgo <= 7) {
    return {
      reason: `Ex-dividend senaste ${Math.max(0, Math.round(exAgo))} dag(ar) — kursen justeras oftast ner ungefär motsvarande utdelningen (mekanisk, inte bolagskris).`,
      source: 'Yahoo Finance → calendarEvents.exDividendDate',
      strength: 3,
    }
  }
  if (earnAgo != null && earnAgo >= 0 && earnAgo <= 5) {
    return {
      reason: `Rapport nyligen (${Math.round(earnAgo)} dag sedan). Marknaden omprisar efter earnings — sniper-case om reaktionen ser överdriven ut mot kvalitetsbolag.`,
      source: 'Yahoo Finance → calendarEvents.earnings',
      strength: 3,
    }
  }
  if (earnIn != null && earnIn >= -1 && earnIn <= 3) {
    return {
      reason: `Earnings inom ${Math.ceil(Math.max(earnIn, 0))} dag(ar). Volatilitet kring rapport — högre risk, ej klassisk sniper utan tydlig överreaktion.`,
      source: 'Yahoo Finance → calendarEvents.earnings',
      strength: 1,
    }
  }
  if (m.news[0]) {
    return {
      reason: `Nyhetsdriven rörelse: “${m.news[0].title}” (${m.news[0].publisher}).`,
      source: 'Yahoo Finance search/news',
      strength: 2,
    }
  }
  if ((m.maxDayDropPct ?? 0) <= -5 || (m.weekDrawdownPct ?? 0) <= -5) {
    return {
      reason:
        'Skarp kursnedgång utan tydlig kalenderhändelse i Yahoo — kräver manuell check (makro, sektor, orderflöde). Ej automatiskt sniper-läge.',
      source: 'Yahoo Finance chart (prisdata) — orsak ej bekräftad',
      strength: 0,
    }
  }
  return {
    reason: 'Ingen material dip eller förklarande händelse just nu.',
    source: '—',
    strength: 0,
  }
}

export function scoreSniper(m: RawSniper): Omit<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'> {
  const sources: DataSource[] = [
    {
      field: 'Pris / dagschange',
      source: 'Yahoo Finance quote',
      detail: 'regularMarketPrice, regularMarketChangePercent',
    },
    {
      field: 'Dip / veckodragning',
      source: 'Yahoo Finance chart (1d)',
      detail: 'Senaste ~15 handelsdagar: max endagsfall + dragning från 5-dagars stängningshögsta',
    },
    {
      field: 'Utdelning / rapport',
      source: 'Yahoo Finance quoteSummary.calendarEvents',
      detail: 'exDividendDate, earningsDate',
    },
    {
      field: 'Nyheter (varför)',
      source: 'Yahoo Finance search news',
      detail: 'Senaste headlines kopplade till bolagsnamn',
    },
    {
      field: 'Street-mål (ej sniper-target)',
      source: 'Yahoo Finance financialData.targetMeanPrice',
      detail: 'Analytikerkonsensus — långsiktig, INTE veckomål',
    },
    {
      field: 'Sniper bounce-mål',
      source: 'Egen beräkning från Yahoo chart',
      detail: 'Åter mot senaste 5–6 dagars högsta stängning (mean-reversion), inte DCF',
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
  const sharp =
    (day != null && day <= -4.5) ||
    (maxDrop != null && maxDrop <= -5) ||
    (week != null && week <= -5.5)

  // Dip magnitude
  {
    let pts = 0
    const worst = Math.min(day ?? 0, maxDrop ?? 0, week ?? 0)
    let note = `Värsta signal ${worst.toFixed(1)}%`
    if (worst <= -10) {
      pts = 30
      note += ' — kraftig dip (5–10%+ zon)'
      reasons.push(`Kraftig nedgång (${worst.toFixed(1)}%)`)
    } else if (worst <= -7) {
      pts = 24
      note += ' — tydlig sniper-zon'
      reasons.push(`Tydlig dip (${worst.toFixed(1)}%)`)
    } else if (worst <= -5) {
      pts = 18
      note += ' — intressant'
      reasons.push(`Dip ca ${worst.toFixed(1)}%`)
    } else if (worst <= -3.5) {
      pts = 8
      note += ' — mild'
    } else {
      pts = 0
      note += ' — ingen köpläge-dip'
    }
    breakdown.push({ key: 'dip', label: 'Dip-storlek', points: pts, max: 30, note })
  }

  // Explainable reason
  {
    const pts = explain.strength === 3 ? 25 : explain.strength === 2 ? 16 : explain.strength === 1 ? 6 : 0
    breakdown.push({
      key: 'why',
      label: 'Förklarad orsak',
      points: pts,
      max: 25,
      note: explain.reason.slice(0, 140),
    })
    if (pts >= 16) reasons.push('Orsak identifierad')
    if (pts === 0 && sharp) risks.push('Dip utan bekräftad orsak — skippa tills du vet varför')
  }

  // Quality / large stable
  {
    let pts = 0
    let note = m.qualityOk ? 'Large-cap filter OK' : 'Under large-cap-tröskel / osäker kvalitet'
    if (m.qualityOk) {
      pts = 20
      reasons.push('Stort / bevakat bolag')
    }
    if (m.profitMargin != null && m.profitMargin > 0.08) {
      pts = Math.min(25, pts + 5)
      note += ' · lönsam'
    }
    if (m.beta != null && m.beta > 1.6) {
      pts = Math.max(0, pts - 5)
      risks.push('Hög beta — studs kan utebli')
      note += ' · hög beta'
    }
    breakdown.push({ key: 'quality', label: 'Stabilitet / storlek', points: pts, max: 25, note })
  }

  // Bounce asymmetry (path to +5%)
  {
    const up = m.bounceUpsidePct
    let pts = 0
    let note = up == null ? 'Saknas' : `Upside till pre-dip stängning ${up.toFixed(1)}%`
    if (up != null && up >= 5) {
      pts = 20
      note += ' — teoretisk veckostuds ≥5% om mean-reversion'
      catalysts.push(`Mean-reversion mot ${m.bounceTarget?.toFixed(2)} kan ge ~${up.toFixed(1)}%`)
    } else if (up != null && up >= 3) {
      pts = 10
      note += ' — begränsad'
    } else {
      pts = 2
    }
    breakdown.push({ key: 'bounce', label: 'Vecko-uppsida (bounce)', points: pts, max: 20, note })
  }

  const score = breakdown.reduce((s, b) => s + b.points, 0)
  const maxScore = breakdown.reduce((s, b) => s + b.max, 0)
  const scorePct = maxScore > 0 ? (score / maxScore) * 100 : 0

  let setup: Setup = 'none'
  let setupLabel = 'Inget läge'
  if (!m.qualityOk && !sharp) {
    setup = 'none'
    setupLabel = 'Inget läge'
  } else if (sharp && explain.strength >= 2 && scorePct >= 55 && (m.bounceUpsidePct ?? 0) >= 4.5) {
    setup = 'sniper'
    setupLabel = 'Sniper-läge'
  } else if (sharp && m.qualityOk) {
    setup = 'watch'
    setupLabel = 'Bevaka — ofullständig edge'
  } else {
    setup = 'none'
    setupLabel = 'Inget läge'
  }

  if (setup === 'sniper') {
    risks.push('Ingen garanti för +5% på en vecka — edge är probabilistisk')
  }

  const fairValue = m.bounceTarget
  const fairValueMethod =
    'Sniper-mål = senaste 5–6 dagars högsta stängning (Yahoo chart). Street-mål från analytiker visas separat och är INTE veckomålet.'

  const thesis =
    setup === 'sniper'
      ? `${m.name} är ett large-cap-case med skarp nedgång och identifierad orsak. ${explain.reason} Modellen siktar på mean-reversion mot pre-dip (${m.bounceTarget != null ? m.bounceTarget.toFixed(2) : '—'} ${m.currency}), ca ${m.bounceUpsidePct?.toFixed(1) ?? '—'}% — i linje med en vecko-edge runt 5%+ om studsen kommer. Det är sällsynt: de flesta dagar finns inget läge.`
      : setup === 'watch'
        ? `${m.name} har rört sig neråt men edge är ofullständig (saknad/svag orsak, för liten bounce, eller lägre score). Bevaka — köp inte blint.`
        : `${m.name}: inget sniper-läge just nu. Botten scannar kontinuerligt efter 5–10% dippar i stabila bolag med förklaring (utdelning, rapportöverreaktion, tydlig nyhet).`

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
    dataQuality: Math.min(100, 40 + (m.news.length > 0 ? 15 : 0) + (m.exDividendDate || m.earningsDate ? 20 : 0) + (m.maxDayDropPct != null ? 25 : 0)),
    verdict: setup === 'sniper' ? 'undervalued' : setup === 'watch' ? 'fair' : 'unknown',
    verdictLabel: setupLabel,
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
    weekDrawdownPct: null,
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

  const rank = (s: Setup) => (s === 'sniper' ? 3 : s === 'watch' ? 2 : s === 'none' ? 1 : 0)
  return out.sort((a, b) => {
    const d = rank(b.setup) - rank(a.setup)
    if (d !== 0) return d
    return (a.maxDayDropPct ?? 0) - (b.maxDayDropPct ?? 0)
  })
}

/** @deprecated alias kept for older imports */
export const fetchMetrics = fetchSniper
export const scoreMetrics = scoreSniper
