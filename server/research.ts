export type ResearchHit = {
  title: string
  source: string
  url?: string
  publishedAt?: string
  kind: 'catalyst' | 'risk' | 'context'
}

export type ResearchBundle = {
  hits: ResearchHit[]
  buyReasons: { text: string; source: string }[]
  risks: { text: string; source: string }[]
  summaryWhy: string
  summaryRisk: string
}

const RISK_WORDS =
  /\b(lawsuit|probe|investigation|downgrade|cut guidance|misses|missed|fraud|recall|bankrupt|default|layoff|restructuring|profit.?warning|nedskrivning|varning|stämning|utredning|sänker|missar|sec charges|short.?seller|fine|penalty)\b/i

const CATALYST_WORDS =
  /\b(oversold|bargain|undervalued|buy the dip|ex.?dividend|beat|raises guidance|upgrade|buyback|repurchase|attractive|opportunity|värdering|köpvärd|utdelning|återköp|höjer|överträffar)\b/i

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function parseRssItems(xml: string): { title: string; link: string; pubDate?: string; source?: string }[] {
  const items: { title: string; link: string; pubDate?: string; source?: string }[] = []
  const chunks = xml.split(/<item>/i).slice(1)
  for (const chunk of chunks.slice(0, 8)) {
    const title = chunk.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/i)
    const link = chunk.match(/<link>(.*?)<\/link>/i)
    const pub = chunk.match(/<pubDate>(.*?)<\/pubDate>/i)
    const src = chunk.match(/<source[^>]*>(.*?)<\/source>/i)
    const t = stripHtml((title?.[1] || title?.[2] || '').trim())
    const l = (link?.[1] || '').trim()
    if (!t) continue
    items.push({
      title: t,
      link: l,
      pubDate: pub?.[1],
      source: src?.[1] ? stripHtml(src[1]) : undefined,
    })
  }
  return items
}

function classifyTitle(title: string): ResearchHit['kind'] {
  if (RISK_WORDS.test(title)) return 'risk'
  if (CATALYST_WORDS.test(title)) return 'catalyst'
  return 'context'
}

function baseSymbol(symbol: string): string {
  return symbol.replace(/\.(ST|L|DE|PA|AS|OL|CO|HE)$/i, '').replace(/-B$/i, '').replace(/-A$/i, '')
}

async function fetchGoogleNews(query: string, locale: { hl: string; gl: string; ceid: string }): Promise<ResearchHit[]> {
  const url =
    `https://news.google.com/rss/search?q=${encodeURIComponent(query)}` +
    `&hl=${locale.hl}&gl=${locale.gl}&ceid=${locale.ceid}`
  const res = await fetch(url, {
    headers: { 'User-Agent': 'ValueScoutResearch/1.0' },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) return []
  const xml = await res.text()
  return parseRssItems(xml).map((it) => ({
    title: it.title,
    source: it.source ? `Google News / ${it.source}` : 'Google News',
    url: it.link || undefined,
    publishedAt: it.pubDate ? new Date(it.pubDate).toISOString() : undefined,
    kind: classifyTitle(it.title),
  }))
}

async function fetchFinnhubNews(symbol: string): Promise<ResearchHit[]> {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return []
  const ticker = baseSymbol(symbol)
  if (symbol.includes('.')) return [] // Finnhub free tier is mainly US
  const to = new Date()
  const from = new Date(Date.now() - 7 * 86400000)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const url =
    `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(ticker)}` +
    `&from=${fmt(from)}&to=${fmt(to)}&token=${encodeURIComponent(key)}`
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
  if (!res.ok) return []
  const data = (await res.json()) as any[]
  if (!Array.isArray(data)) return []
  return data.slice(0, 6).map((n) => ({
    title: String(n.headline || n.title || ''),
    source: `Finnhub / ${n.source || 'news'}`,
    url: n.url ? String(n.url) : undefined,
    publishedAt: n.datetime ? new Date(n.datetime * 1000).toISOString() : undefined,
    kind: classifyTitle(String(n.headline || '')),
  })).filter((h) => h.title)
}

function localeForSymbol(symbol: string) {
  if (symbol.endsWith('.ST')) return { hl: 'sv', gl: 'SE', ceid: 'SE:sv' }
  if (symbol.endsWith('.L')) return { hl: 'en-GB', gl: 'GB', ceid: 'GB:en' }
  return { hl: 'en-US', gl: 'US', ceid: 'US:en' }
}

export type FundContext = {
  name: string
  symbol: string
  dropWhenLabel: string | null
  stillDown: boolean
  maxDayDropPct: number | null
  bounceUpsidePct: number | null
  dayChangePct: number | null
  pe: number | null
  debtToEquity: number | null
  profitMargin: number | null
  beta: number | null
  exDividendDate: string | null
  earningsDate: string | null
  yahooNews: { title: string; publisher: string; link?: string }[]
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return null
  return (Date.now() - t) / 86400000
}

function daysFromNow(iso: string | null): number | null {
  const d = daysSince(iso)
  return d == null ? null : -d
}

function fundamentalRisks(ctx: FundContext): { text: string; source: string }[] {
  const out: { text: string; source: string }[] = []
  const dte = ctx.debtToEquity
  if (dte != null) {
    // Yahoo oftast i "procentlik" form (t.ex. 41 ≈ 0,41); ibland redan som kvot.
    const v = dte >= 5 ? dte / 100 : dte
    if (v >= 2) out.push({ text: `Hög skuldsättning (D/E ca ${v.toFixed(1)}).`, source: 'Yahoo Finance, nyckeltal' })
    else if (v >= 1.2) out.push({ text: `Förhöjd skuldsättning (D/E ca ${v.toFixed(1)}).`, source: 'Yahoo Finance, nyckeltal' })
  }
  if (ctx.profitMargin != null && ctx.profitMargin < 0) {
    out.push({ text: 'Negativ vinstmarginal.', source: 'Yahoo Finance, nyckeltal' })
  }
  if (ctx.beta != null && ctx.beta > 1.5) {
    out.push({ text: `Hög beta (${ctx.beta.toFixed(2)}) — större svängningar än marknaden.`, source: 'Yahoo Finance, nyckeltal' })
  }
  if (ctx.pe != null && ctx.pe > 35 && (ctx.maxDayDropPct ?? 0) > -8) {
    out.push({ text: `Hög P/E (${ctx.pe.toFixed(0)}) trots nedgång — värderingsrisk kvarstår.`, source: 'Yahoo Finance, nyckeltal' })
  }
  const earnIn = daysFromNow(ctx.earningsDate)
  if (earnIn != null && earnIn >= -1 && earnIn <= 5) {
    out.push({
      text: `Rapport inom ${Math.ceil(Math.max(earnIn, 0))} dag(ar) — resultat kan förvärra eller förlänga fallet.`,
      source: 'Yahoo Finance, bolagskalender',
    })
  }
  if ((ctx.bounceUpsidePct ?? 0) < 6 && ctx.stillDown) {
    out.push({ text: 'Begränsad teoretisk uppsida till senaste topp.', source: 'Beräknad från kursdata' })
  }
  out.push({
    text: 'Kortsiktig återhämtning är inte garanterad; nyheter och makro kan fortsätta pressa kursen.',
    source: 'Modell / generell marknadsrisk',
  })
  return out.slice(0, 6)
}

function fundamentalCatalysts(ctx: FundContext): { text: string; source: string }[] {
  const out: { text: string; source: string }[] = []
  if (ctx.dropWhenLabel && ctx.stillDown) {
    out.push({
      text: `Färsk nedgång som fortfarande håller: ${ctx.dropWhenLabel}.`,
      source: 'Yahoo Finance, dagliga stängningar',
    })
  }
  const exAgo = daysSince(ctx.exDividendDate)
  if (exAgo != null && exAgo >= -1 && exAgo <= 7) {
    out.push({
      text: `Ex-dividend nyligen (${Math.max(0, Math.round(exAgo))} dag(ar) sedan) — del av fallet kan vara teknisk kursjustering.`,
      source: 'Yahoo Finance, bolagskalender',
    })
  }
  const earnAgo = daysSince(ctx.earningsDate)
  if (earnAgo != null && earnAgo >= 0 && earnAgo <= 5) {
    out.push({
      text: `Rapport för ${Math.round(earnAgo)} dag(ar) sedan — möjligt köpläge om marknaden överreagerat.`,
      source: 'Yahoo Finance, bolagskalender',
    })
  }
  if ((ctx.bounceUpsidePct ?? 0) >= 5.5 && ctx.stillDown) {
    out.push({
      text: `Återhämtning till senaste topp ger ca ${ctx.bounceUpsidePct!.toFixed(1)} % uppsida.`,
      source: 'Beräknad från Yahoo-kursdata',
    })
  }
  return out
}

function dedupeHits(hits: ResearchHit[]): ResearchHit[] {
  const seen = new Set<string>()
  const out: ResearchHit[] = []
  for (const h of hits) {
    const key = h.title.toLowerCase().slice(0, 80)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(h)
  }
  return out
}

export async function gatherResearch(
  ctx: FundContext,
  opts: { deep?: boolean } = {},
): Promise<ResearchBundle> {
  const deep = opts.deep !== false
  const locale = localeForSymbol(ctx.symbol)
  const cleanName = ctx.name.replace(/\s+(ord|plc|ab|inc|corp|group|holdings?).*$/i, '').trim()

  let g1: ResearchHit[] = []
  let g2: ResearchHit[] = []
  let finn: ResearchHit[] = []

  if (deep) {
    ;[g1, g2, finn] = await Promise.all([
      fetchGoogleNews(`${cleanName} stock OR shares`, locale).catch(() => [] as ResearchHit[]),
      fetchGoogleNews(`${cleanName} earnings OR guidance OR downgrade OR lawsuit`, locale).catch(
        () => [] as ResearchHit[],
      ),
      fetchFinnhubNews(ctx.symbol).catch(() => [] as ResearchHit[]),
    ])
  }

  const yahooHits: ResearchHit[] = ctx.yahooNews.map((n) => ({
    title: n.title,
    source: `Yahoo Finance / ${n.publisher}`,
    url: n.link,
    kind: classifyTitle(n.title),
  }))

  const hits = deep ? dedupeHits([...g1, ...g2, ...finn, ...yahooHits]).slice(0, 12) : yahooHits.slice(0, 4)

  const buyReasons = [
    ...fundamentalCatalysts(ctx),
    ...hits
      .filter((h) => h.kind === 'catalyst')
      .slice(0, 3)
      .map((h) => ({ text: h.title, source: h.source })),
  ]

  const contextExplain = hits
    .filter((h) => h.kind === 'context')
    .slice(0, 2)
    .map((h) => ({
      text: `Nyhetsläge: ${h.title}`,
      source: h.source,
    }))

  const newsRisks = hits
    .filter((h) => h.kind === 'risk')
    .slice(0, 4)
    .map((h) => ({ text: h.title, source: h.source }))

  const risks = [...newsRisks, ...fundamentalRisks(ctx)]
  const whyAll = [...buyReasons, ...contextExplain]

  const summaryWhy =
    whyAll.length > 0
      ? whyAll
          .slice(0, 3)
          .map((w) => w.text)
          .join(' ')
      : 'Ingen tydlig extern katalysator identifierad utöver kursrörelsen.'

  const summaryRisk =
    risks.length > 0
      ? risks
          .slice(0, 3)
          .map((r) => r.text)
          .join(' ')
      : 'Riskprofil ej fullt kartlagd.'

  return {
    hits,
    buyReasons: whyAll.slice(0, 6),
    risks: risks.slice(0, 7),
    summaryWhy,
    summaryRisk,
  }
}
