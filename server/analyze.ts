export type RawMetrics = {
  symbol: string
  name: string
  currency: string
  price: number | null
  marketCap: number | null
  pe: number | null
  forwardPe: number | null
  peg: number | null
  pb: number | null
  ps: number | null
  evEbitda: number | null
  profitMargin: number | null
  operatingMargin: number | null
  roe: number | null
  roa: number | null
  debtToEquity: number | null
  currentRatio: number | null
  freeCashflow: number | null
  operatingCashflow: number | null
  revenueGrowth: number | null
  earningsGrowth: number | null
  epsTrailing: number | null
  epsForward: number | null
  targetMean: number | null
  targetHigh: number | null
  targetLow: number | null
  recommendation: string | null
  numberOfAnalystOpinions: number | null
  fiftyTwoWeekLow: number | null
  fiftyTwoWeekHigh: number | null
  sector: string | null
  industry: string | null
  dividendYield: number | null
  beta: number | null
  earningsGrowthTrend: number | null
}

export type ScoreBreakdown = {
  key: string
  label: string
  points: number
  max: number
  note: string
}

export type Rating = 'overweight' | 'neutral' | 'underweight' | 'insufficient'

export type Analysis = {
  symbol: string
  name: string
  currency: string
  price: number | null
  marketCap: number | null
  sector: string | null
  industry: string | null
  metrics: RawMetrics
  score: number
  maxScore: number
  scorePct: number
  conviction: 'hög' | 'medel' | 'låg'
  rating: Rating
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
  breakdown: ScoreBreakdown[]
  suggestedAmount: number
  suggestedShares: number
  positionPct: number
  dataQuality: number
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

function pct(v: number | null): number | null {
  if (v == null) return null
  // Yahoo sometimes returns 0.15, sometimes 15
  return Math.abs(v) < 1 ? v * 100 : v
}

function fcfYield(m: RawMetrics): number | null {
  if (m.freeCashflow == null || m.marketCap == null || m.marketCap <= 0) return null
  return (m.freeCashflow / m.marketCap) * 100
}

export async function fetchMetrics(yf: any, symbol: string): Promise<RawMetrics> {
  const [quote, summary] = await Promise.all([
    yf.quote(symbol),
    yf.quoteSummary(symbol, {
      modules: [
        'price',
        'summaryDetail',
        'defaultKeyStatistics',
        'financialData',
        'summaryProfile',
        'earningsTrend',
      ],
    }),
  ])

  const sd = summary.summaryDetail ?? {}
  const ks = summary.defaultKeyStatistics ?? {}
  const fd = summary.financialData ?? {}
  const pr = summary.price ?? {}
  const sp = summary.summaryProfile ?? {}
  const trends = summary.earningsTrend?.trend ?? []
  const nextYear = trends.find((t: { period?: string }) => t.period === '+1y')
  const growth = raw(nextYear?.growth)

  return {
    symbol,
    name: quote.shortName || quote.longName || pr.shortName || symbol,
    currency: quote.currency || pr.currency || 'USD',
    price: quote.regularMarketPrice ?? raw(pr.regularMarketPrice),
    marketCap: quote.marketCap ?? raw(pr.marketCap),
    pe: quote.trailingPE ?? raw(sd.trailingPE),
    forwardPe: quote.forwardPE ?? raw(sd.forwardPE),
    peg: raw(ks.pegRatio),
    pb: quote.priceToBook ?? raw(ks.priceToBook),
    ps: raw(sd.priceToSalesTrailing12Months),
    evEbitda: raw(ks.enterpriseToEbitda),
    profitMargin: raw(fd.profitMargins),
    operatingMargin: raw(fd.operatingMargins),
    roe: raw(fd.returnOnEquity),
    roa: raw(fd.returnOnAssets),
    debtToEquity: raw(fd.debtToEquity),
    currentRatio: raw(fd.currentRatio),
    freeCashflow: raw(fd.freeCashflow),
    operatingCashflow: raw(fd.operatingCashflow),
    revenueGrowth: raw(fd.revenueGrowth),
    earningsGrowth: raw(fd.earningsGrowth),
    epsTrailing: quote.epsTrailingTwelveMonths ?? raw(ks.trailingEps),
    epsForward: quote.epsForward ?? raw(ks.forwardEps),
    targetMean: raw(fd.targetMeanPrice),
    targetHigh: raw(fd.targetHighPrice),
    targetLow: raw(fd.targetLowPrice),
    recommendation: fd.recommendationKey ?? null,
    numberOfAnalystOpinions: raw(fd.numberOfAnalystOpinions),
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow ?? raw(sd.fiftyTwoWeekLow),
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh ?? raw(sd.fiftyTwoWeekHigh),
    sector: sp.sector ?? null,
    industry: sp.industry ?? null,
    dividendYield: raw(sd.dividendYield),
    beta: quote.beta ?? raw(sd.beta),
    earningsGrowthTrend: growth,
  }
}

function scoreBand(
  value: number,
  bands: { max: number; points: number; label: string }[],
  unit: string,
): { points: number; note: string } {
  for (const b of bands) {
    if (value < b.max) return { points: b.points, note: `${unit} ${value.toFixed(1)} — ${b.label}` }
  }
  const last = bands[bands.length - 1]
  return { points: last.points, note: `${unit} ${value.toFixed(1)} — ${last.label}` }
}

export function scoreMetrics(m: RawMetrics): Omit<
  Analysis,
  'suggestedAmount' | 'suggestedShares' | 'positionPct'
> {
  const breakdown: ScoreBreakdown[] = []
  const reasons: string[] = []
  const risks: string[] = []
  const catalysts: string[] = []
  let coveredMax = 0
  let coveredPts = 0

  const add = (key: string, label: string, points: number, max: number, note: string, present: boolean) => {
    breakdown.push({ key, label, points: present ? points : 0, max, note })
    if (present) {
      coveredMax += max
      coveredPts += points
    }
  }

  // 1. Trailing P/E
  if (m.pe != null && m.pe > 0) {
    const { points, note } = scoreBand(
      m.pe,
      [
        { max: 12, points: 16, label: 'klar rabatt mot historisk value-benchmark' },
        { max: 16, points: 13, label: 'attraktiv multipel' },
        { max: 22, points: 9, label: 'i linje med bred marknad' },
        { max: 30, points: 4, label: 'premie — tillväxt måste leverera' },
        { max: 1e9, points: 1, label: 'högt prissatt mot vinst' },
      ],
      'P/E',
    )
    add('pe', 'Trailing P/E', points, 16, note, true)
    if (points >= 13) reasons.push('Attraktiv trailing P/E')
    if (points <= 4) risks.push('Hög vinstmultipel ökar nedsidesrisk vid earnings miss')
  } else {
    add('pe', 'Trailing P/E', 0, 16, m.pe != null && m.pe <= 0 ? 'Negativ vinst — multipel ej meningsfull' : 'Data saknas', false)
    if (m.pe != null && m.pe <= 0) risks.push('Negativ eller volatil vinst tynger värderingscase')
  }

  // 2. Forward P/E
  if (m.forwardPe != null && m.forwardPe > 0) {
    const { points, note } = scoreBand(
      m.forwardPe,
      [
        { max: 11, points: 12, label: 'billig på forward-earnings' },
        { max: 15, points: 9, label: 'attraktiv forward' },
        { max: 22, points: 6, label: 'neutral forward' },
        { max: 32, points: 3, label: 'dyr forward' },
        { max: 1e9, points: 1, label: 'aggressiv prissättning' },
      ],
      'Fwd P/E',
    )
    add('fpe', 'Forward P/E', points, 12, note, true)
    if (points >= 9) {
      reasons.push('Låg forward P/E')
      catalysts.push('Earnings-revisioner kan driva rerating om forward håller')
    }
  } else {
    add('fpe', 'Forward P/E', 0, 12, 'Saknas', false)
  }

  // 3. PEG
  if (m.peg != null && m.peg > 0) {
    const { points, note } = scoreBand(
      m.peg,
      [
        { max: 0.85, points: 12, label: 'growth till rabatt (klassisk value+growth)' },
        { max: 1.2, points: 9, label: 'rimligt prissatt tillväxt' },
        { max: 1.8, points: 5, label: 'tillväxt delvis inprisad' },
        { max: 1e9, points: 1, label: 'dyr tillväxt' },
      ],
      'PEG',
    )
    add('peg', 'PEG', points, 12, note, true)
    if (points >= 9) reasons.push('PEG understödjer undervärdering vs tillväxt')
  } else {
    add('peg', 'PEG', 0, 12, 'Saknas', false)
  }

  // 4. EV/EBITDA
  if (m.evEbitda != null && m.evEbitda > 0) {
    const { points, note } = scoreBand(
      m.evEbitda,
      [
        { max: 7, points: 10, label: 'stark EV-rabatt' },
        { max: 10, points: 8, label: 'attraktiv enterprise-multipel' },
        { max: 14, points: 5, label: 'neutral' },
        { max: 20, points: 2, label: 'premie' },
        { max: 1e9, points: 0, label: 'dyr på EV' },
      ],
      'EV/EBITDA',
    )
    add('ev', 'EV/EBITDA', points, 10, note, true)
    if (points >= 8) reasons.push('Attraktiv EV/EBITDA')
  } else {
    add('ev', 'EV/EBITDA', 0, 10, 'Saknas', false)
  }

  // 5. P/B
  if (m.pb != null && m.pb > 0) {
    const { points, note } = scoreBand(
      m.pb,
      [
        { max: 1.0, points: 8, label: 'under bokfört — deep value-signal' },
        { max: 2.0, points: 6, label: 'rimlig P/B' },
        { max: 4.0, points: 3, label: 'immateriell premium' },
        { max: 1e9, points: 1, label: 'hög P/B' },
      ],
      'P/B',
    )
    add('pb', 'P/B', points, 8, note, true)
    if (m.pb < 1) reasons.push('Handlas under bokfört värde')
  } else {
    add('pb', 'P/B', 0, 8, 'Saknas', false)
  }

  // 6. FCF yield
  const fcfY = fcfYield(m)
  if (fcfY != null) {
    let p = 2
    let n = `FCF-yield ${fcfY.toFixed(1)}%`
    if (fcfY >= 7) {
      p = 10
      n += ' — stark cash conversion'
      reasons.push('Hög free-cash-flow-yield')
      catalysts.push('Överskotts-FCF möjliggör buybacks/utdelning/deleveraging')
    } else if (fcfY >= 4) {
      p = 8
      n += ' — solid'
    } else if (fcfY >= 2) {
      p = 5
      n += ' — måttlig'
    } else if (fcfY > 0) {
      p = 2
      n += ' — tunn'
    } else {
      p = 0
      n += ' — negativ FCF'
      risks.push('Negativ free cash flow begränsar kapitalallokering')
    }
    add('fcf', 'FCF-yield', p, 10, n, true)
  } else {
    add('fcf', 'FCF-yield', 0, 10, 'Saknas', false)
  }

  // 7. Profitability quality (ROE + margins)
  {
    const roePct = pct(m.roe)
    const marginPct = pct(m.profitMargin)
    let p = 0
    const parts: string[] = []
    if (roePct != null) {
      if (roePct > 20) {
        p += 5
        parts.push(`ROE ${roePct.toFixed(0)}% (excellent)`)
        reasons.push('Hög avkastning på eget kapital')
      } else if (roePct > 12) {
        p += 3
        parts.push(`ROE ${roePct.toFixed(0)}%`)
      } else if (roePct > 0) {
        p += 1
        parts.push(`ROE ${roePct.toFixed(0)}% (svag)`)
      } else {
        parts.push('Negativ ROE')
        risks.push('Negativ ROE signalerar svag kapitalavkastning')
      }
    }
    if (marginPct != null) {
      if (marginPct > 15) {
        p += 5
        parts.push(`marginal ${marginPct.toFixed(0)}%`)
      } else if (marginPct > 8) {
        p += 3
        parts.push(`marginal ${marginPct.toFixed(0)}%`)
      } else if (marginPct > 0) {
        p += 1
        parts.push(`tunn marginal ${marginPct.toFixed(0)}%`)
      } else {
        risks.push('Negativ vinstmarginal')
      }
    }
    const present = roePct != null || marginPct != null
    add('quality', 'Kvalitet (ROE/marginal)', Math.min(10, p), 10, parts.join('; ') || 'Saknas', present)
  }

  // 8. Balance sheet
  if (m.debtToEquity != null) {
    const dte = m.debtToEquity > 10 ? m.debtToEquity / 100 : m.debtToEquity
    let p = 0
    let n = `D/E ${dte.toFixed(2)}`
    if (dte < 0.4) {
      p = 8
      n += ' — konservativ skuldsättning'
      reasons.push('Stark balansräkning')
    } else if (dte < 1) {
      p = 5
      n += ' — hanterbar'
    } else if (dte < 2) {
      p = 2
      n += ' — elevated leverage'
      risks.push('Förhöjd skuldsättning vid refinansiering/räntechock')
    } else {
      p = 0
      n += ' — hög leverage'
      risks.push('Hög leverage — kreditrisk i downside-scenario')
    }
    if (m.currentRatio != null && m.currentRatio < 1) {
      p = Math.max(0, p - 2)
      risks.push('Current ratio under 1 — likviditetsstress')
    }
    add('debt', 'Balansräkning', p, 8, n, true)
  } else {
    add('debt', 'Balansräkning', 0, 8, 'Saknas', false)
  }

  // 9. Growth
  {
    const eg = pct(m.earningsGrowth) ?? pct(m.earningsGrowthTrend)
    const rg = pct(m.revenueGrowth)
    let p = 0
    const parts: string[] = []
    if (eg != null) {
      if (eg > 15) {
        p += 5
        parts.push(`EPS-tillväxt ${eg.toFixed(0)}%`)
        catalysts.push('Positiv earnings-momentum stöder rerating')
      } else if (eg > 5) {
        p += 3
        parts.push(`EPS-tillväxt ${eg.toFixed(0)}%`)
      } else if (eg > -5) {
        p += 1
        parts.push(`flat EPS ${eg.toFixed(0)}%`)
      } else {
        parts.push(`EPS kontraktion ${eg.toFixed(0)}%`)
        risks.push('Negativ earnings-trend')
      }
    }
    if (rg != null) {
      if (rg > 10) {
        p += 3
        parts.push(`omsättning +${rg.toFixed(0)}%`)
      } else if (rg > 0) {
        p += 2
        parts.push(`omsättning +${rg.toFixed(0)}%`)
      } else {
        p += 0
        parts.push(`omsättning ${rg.toFixed(0)}%`)
      }
    }
    const present = eg != null || rg != null
    add('growth', 'Tillväxt', Math.min(8, p), 8, parts.join('; ') || 'Saknas', present)
  }

  // 10. Street target / consensus
  let upsidePct: number | null = null
  if (m.price != null && m.targetMean != null && m.price > 0) {
    upsidePct = ((m.targetMean - m.price) / m.price) * 100
    let p = 0
    let n = `Konsensusmål ${upsidePct >= 0 ? '+' : ''}${upsidePct.toFixed(1)}%`
    if (m.numberOfAnalystOpinions != null) n += ` (n=${Math.round(m.numberOfAnalystOpinions)})`
    if (upsidePct > 25) {
      p = 10
      n += ' — material uppsida'
      reasons.push('Street ser material uppsida till målkurs')
      catalysts.push('Gap till konsensusmålkurs kan stängas vid delivery')
    } else if (upsidePct > 12) {
      p = 7
      n += ' — positiv'
    } else if (upsidePct > 0) {
      p = 4
      n += ' — begränsad uppsida'
    } else if (upsidePct > -15) {
      p = 2
      n += ' — handlas nära/över mål'
    } else {
      p = 0
      n += ' — material nedsida vs street'
      risks.push('Handlas över street-konsensus — begränsat safety margin')
    }
    add('target', 'Street-konsensus', p, 10, n, true)
  } else {
    add('target', 'Street-konsensus', 0, 10, 'Saknas', false)
  }

  // 11. 52w positioning (mean-reversion / crowding)
  if (m.price != null && m.fiftyTwoWeekLow != null && m.fiftyTwoWeekHigh != null) {
    const span = m.fiftyTwoWeekHigh - m.fiftyTwoWeekLow
    const pos = span > 0 ? (m.price - m.fiftyTwoWeekLow) / span : 0.5
    let p = 0
    let n = `${(pos * 100).toFixed(0)}% av 52v-band`
    if (pos < 0.25) {
      p = 6
      n += ' — nära cykelbotten (contrarian entry)'
      reasons.push('Nära 52-veckorslägsta')
    } else if (pos < 0.5) {
      p = 4
      n += ' — undre halvan'
    } else if (pos < 0.75) {
      p = 2
      n += ' — övre halvan'
    } else {
      p = 1
      n += ' — nära topp — crowded long-risk'
      risks.push('Nära 52-veckorshögsta — asymmetriska odds försämras')
    }
    add('range', '52-veckorsläge', p, 6, n, true)
  } else {
    add('range', '52-veckorsläge', 0, 6, 'Saknas', false)
  }

  const score = breakdown.reduce((s, b) => s + b.points, 0)
  const maxScore = breakdown.reduce((s, b) => s + b.max, 0)
  const scorePct = coveredMax > 0 ? coveredPts / coveredMax : 0
  const dataQuality = Math.round((coveredMax / maxScore) * 100)

  // Fair value: prefer street mean; blend with forward PE * eps if available
  let fairValue: number | null = null
  let fairValueMethod: string | null = null
  if (m.targetMean != null && m.targetMean > 0) {
    fairValue = m.targetMean
    fairValueMethod = 'Street mean target'
    if (m.epsForward != null && m.epsForward > 0 && m.forwardPe != null && m.forwardPe > 0) {
      // sanity: also note implied
      const sectorPe = Math.min(22, Math.max(12, m.forwardPe * 0.9))
      const modelFv = m.epsForward * sectorPe
      fairValue = m.targetMean * 0.7 + modelFv * 0.3
      fairValueMethod = '70% street target + 30% normaliserad fwd-P/E × EPS'
      if (m.price != null && m.price > 0) {
        upsidePct = ((fairValue - m.price) / m.price) * 100
      }
    }
  } else if (m.epsForward != null && m.epsForward > 0) {
    fairValue = m.epsForward * 16
    fairValueMethod = 'Normaliserad 16× forward EPS (base-case)'
    if (m.price != null && m.price > 0) {
      upsidePct = ((fairValue - m.price) / m.price) * 100
    }
  }

  let rating: Rating = 'insufficient'
  let ratingLabel = 'Otillräcklig data'
  let verdict: Analysis['verdict'] = 'unknown'
  let verdictLabel = 'Otillräcklig data'
  let conviction: Analysis['conviction'] = 'låg'

  if (dataQuality >= 45) {
    if (scorePct >= 0.68 && (upsidePct == null || upsidePct > -5)) {
      rating = 'overweight'
      ratingLabel = 'Overweight'
      verdict = 'undervalued'
      verdictLabel = 'Undervärderad — Overweight'
    } else if (scorePct >= 0.48) {
      rating = 'neutral'
      ratingLabel = 'Neutral'
      verdict = 'fair'
      verdictLabel = 'Rimligt värderad — Neutral'
    } else {
      rating = 'underweight'
      ratingLabel = 'Underweight'
      verdict = 'overvalued'
      verdictLabel = 'Dyr relative — Underweight'
    }
    conviction =
      dataQuality >= 75 && Math.abs(scorePct - 0.5) > 0.18
        ? 'hög'
        : dataQuality >= 55
          ? 'medel'
          : 'låg'
  }

  const thesis = buildThesis(m, {
    rating,
    scorePct,
    upsidePct,
    fairValue,
    fcfY,
    reasons,
    risks,
  })

  return {
    symbol: m.symbol,
    name: m.name,
    currency: m.currency,
    price: m.price,
    marketCap: m.marketCap,
    sector: m.sector,
    industry: m.industry,
    metrics: m,
    score,
    maxScore,
    scorePct: Math.round(scorePct * 1000) / 10,
    conviction,
    rating,
    ratingLabel,
    verdict,
    verdictLabel,
    upsidePct: upsidePct != null ? Math.round(upsidePct * 10) / 10 : null,
    fairValue: fairValue != null ? Math.round(fairValue * 100) / 100 : null,
    fairValueMethod,
    thesis,
    catalysts: catalysts.slice(0, 4),
    risks: risks.slice(0, 5),
    reasons: reasons.slice(0, 5),
    breakdown,
    dataQuality,
  }
}

function buildThesis(
  m: RawMetrics,
  ctx: {
    rating: Rating
    scorePct: number
    upsidePct: number | null
    fairValue: number | null
    fcfY: number | null
    reasons: string[]
    risks: string[]
  },
): string {
  const sector = m.sector || 'sektorn'
  const name = m.name
  const pe = m.pe != null && m.pe > 0 ? `trailing P/E ${m.pe.toFixed(1)}×` : null
  const fpe = m.forwardPe != null && m.forwardPe > 0 ? `forward P/E ${m.forwardPe.toFixed(1)}×` : null
  const mult = [pe, fpe].filter(Boolean).join(' / ') || 'begränsad multipeldata'

  if (ctx.rating === 'insufficient') {
    return `${name}: datatäckningen är för tunn för en institutionell rating. Avvakta tills nyckeltal (vinst, kassaflöde, konsensus) är tillgängliga innan position tas.`
  }

  if (ctx.rating === 'overweight') {
    return (
      `${name} (${sector}) handlas till ${mult}, vilket i vårt ramverk indikerar en asymmetrisk risk/reward till uppsidan` +
      (ctx.upsidePct != null ? ` (estim. uppsida ca ${ctx.upsidePct.toFixed(0)}% mot fair value)` : '') +
      `. ${ctx.reasons[0] ? ctx.reasons[0] + '. ' : ''}` +
      (ctx.fcfY != null && ctx.fcfY > 4
        ? `Free-cash-flow-yield på ${ctx.fcfY.toFixed(1)}% ger balansräkningsstöd för kapitalåterföring. `
        : '') +
      `Vi ser Overweight: entry motiveras av värdering + kvalitet, men positionera med riskbudget — ` +
      (ctx.risks[0] ? `primär risk: ${ctx.risks[0].toLowerCase()}.` : 'bevaka earnings-revisioner och makrosensitivity.')
    )
  }

  if (ctx.rating === 'neutral') {
    return (
      `${name} prissätts ungefär i linje med vårt base-case (${mult}). ` +
      `Score ${Math.round(ctx.scorePct * 100)}% av tillgänglig modellvikt ger Neutral: varken klar rabatt eller uppenbar bubbelpremie. ` +
      `Lämplig som core/hold snarare än aggressiv add — vänta på mer attraktiv entry eller tydligare catalyst innan sizing ökas.`
    )
  }

  return (
    `${name} ser dyr ut i vårt multi-faktor-ramverk (${mult}` +
    (ctx.upsidePct != null && ctx.upsidePct < 0
      ? `, ca ${Math.abs(ctx.upsidePct).toFixed(0)}% över fair value`
      : '') +
    `). Underweight: risk/reward är asymmetrisk till nedsidan om tillväxt/marginaler missar. ` +
    (ctx.risks[0] ? `${ctx.risks[0]}. ` : '') +
    `Preferera vänta på retracement eller tydlig fundamental förbättring innan ny kapital allokeras.`
  )
}

export function positionSize(
  analysis: Omit<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'>,
  portfolio: number,
  riskPct: number,
): Pick<Analysis, 'suggestedAmount' | 'suggestedShares' | 'positionPct'> {
  const base = Math.max(0.5, Math.min(riskPct, 5))
  const convictionMult =
    analysis.conviction === 'hög' ? 1.15 : analysis.conviction === 'medel' ? 1 : 0.75
  const ratingMult =
    analysis.rating === 'overweight' ? 1 : analysis.rating === 'neutral' ? 0.45 : 0.15
  const quality = analysis.dataQuality / 100
  const positionPct = Math.min(
    10,
    base * (0.55 + analysis.scorePct / 100) * convictionMult * ratingMult * (0.7 + 0.3 * quality),
  )
  const amount = Math.max(0, portfolio * (positionPct / 100))
  const shares =
    analysis.price && analysis.price > 0 ? Math.floor(amount / analysis.price) : 0
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

function emptyAnalysis(symbol: string, error: string): Analysis {
  return {
    symbol,
    name: symbol,
    currency: '—',
    price: null,
    marketCap: null,
    sector: null,
    industry: null,
    metrics: {
      symbol,
      name: symbol,
      currency: '—',
      price: null,
      marketCap: null,
      pe: null,
      forwardPe: null,
      peg: null,
      pb: null,
      ps: null,
      evEbitda: null,
      profitMargin: null,
      operatingMargin: null,
      roe: null,
      roa: null,
      debtToEquity: null,
      currentRatio: null,
      freeCashflow: null,
      operatingCashflow: null,
      revenueGrowth: null,
      earningsGrowth: null,
      epsTrailing: null,
      epsForward: null,
      targetMean: null,
      targetHigh: null,
      targetLow: null,
      recommendation: null,
      numberOfAnalystOpinions: null,
      fiftyTwoWeekLow: null,
      fiftyTwoWeekHigh: null,
      sector: null,
      industry: null,
      dividendYield: null,
      beta: null,
      earningsGrowthTrend: null,
    },
    score: 0,
    maxScore: 100,
    scorePct: 0,
    conviction: 'låg',
    rating: 'insufficient',
    ratingLabel: 'Kunde inte hämtas',
    verdict: 'unknown',
    verdictLabel: 'Kunde inte hämtas',
    upsidePct: null,
    fairValue: null,
    fairValueMethod: null,
    thesis: '',
    catalysts: [],
    risks: [],
    reasons: [],
    breakdown: [],
    suggestedAmount: 0,
    suggestedShares: 0,
    positionPct: 0,
    dataQuality: 0,
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

  const out = await mapPool(unique, 4, async (symbol) => {
    try {
      const metrics = await fetchMetrics(yf, symbol)
      const scored = scoreMetrics(metrics)
      const size = positionSize(scored, portfolio, riskPct)
      return { ...scored, ...size }
    } catch (e) {
      return emptyAnalysis(symbol, e instanceof Error ? e.message : 'Fel')
    }
  })

  return out.sort((a, b) => {
    const rank = (r: Rating) =>
      r === 'overweight' ? 3 : r === 'neutral' ? 2 : r === 'underweight' ? 1 : 0
    const d = rank(b.rating) - rank(a.rating)
    if (d !== 0) return d
    return b.scorePct - a.scorePct
  })
}
