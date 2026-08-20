import type { Analysis } from '../api/client'

export type HoldingType = 'stock' | 'fund'

export type PortfolioHolding = {
  id: string
  symbol: string
  type: HoldingType
  quantity: number
  averageCost: number
  currency: string
  addedAt: string
}

export type PaperTradeStatus = 'open' | 'won' | 'lost' | 'expired' | 'closed'
export type TradeAction = 'buy' | 'sell'
export type PaperOrderStatus = 'received' | 'filled' | 'closed' | 'rejected'
export type PaperDecisionKind = 'entry' | 'target' | 'stop' | 'signal_exit' | 'time_exit' | 'manual'

export type PaperDecision = {
  kind: PaperDecisionKind
  summary: string
  evidence: string[]
  source: string
  dataAsOf: string
  decidedAt: string
  signalDate?: string
}

export type TradeEvent = {
  id: string
  tradeId: string
  orderId: string
  action: TradeAction
  symbol: string
  name: string
  market: 'USA' | 'UK' | 'Sverige'
  quantity: number
  price: number
  currency: string
  reason: string
  source: string
  status: PaperOrderStatus
  occurredAt: string
  decisionKind?: PaperDecisionKind
  evidence?: string[]
  dataAsOf?: string
}

export type PaperTrade = {
  id: string
  symbol: string
  name: string
  market?: 'USA' | 'UK' | 'Sverige'
  orderId?: string
  orderStatus?: PaperOrderStatus
  reason?: string
  entryPrice: number
  targetPrice: number | null
  stopPrice: number | null
  quantity: number
  currency: string
  setupLabel: string
  openedAt: string
  closedAt?: string
  exitPrice?: number
  status: PaperTradeStatus
  source: string
  dataQuality?: number
  filledAt?: string
  reviewAt?: string
  expiresAt?: string
  entryDecision?: PaperDecision
  exitDecision?: PaperDecision
}

export const HOLDINGS_KEY = 'value-scout-holdings-v1'
export const PAPER_TRADES_KEY = 'value-scout-paper-trades-v1'
export const TRADE_EVENTS_KEY = 'value-scout-trade-events-v1'

export function readLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function writeLocal<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value))
}

export function mergePaperHistory(remote: { trades: PaperTrade[]; events: TradeEvent[] }, local: { trades: PaperTrade[]; events: TradeEvent[] }) {
  const merge = <T extends { id: string }>(remoteItems: T[], localItems: T[], timestamp: (item: T) => string | undefined) => {
    const merged = new Map(remoteItems.map((item) => [item.id, item]))
    localItems.forEach((item) => {
      const current = merged.get(item.id)
      if (!current || new Date(timestamp(item) || 0).getTime() > new Date(timestamp(current) || 0).getTime()) merged.set(item.id, item)
    })
    return Array.from(merged.values())
  }
  return {
    trades: merge(remote.trades, local.trades, (trade) => trade.closedAt || trade.openedAt),
    events: merge(remote.events, local.events, (event) => event.occurredAt),
  }
}

export function formatTradeTimestamp(iso?: string) {
  return iso ? new Date(iso).toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' }) : '—'
}

export function formatSignalDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('sv-SE', { dateStyle: 'medium' }) : '—'
}

/** Replaces relative labels in a stored signal with the actual market date so old
 * journal entries cannot become misleading when read on a later day. */
export function formatArchivedSignalReason(reason: string, signalDate?: string, recordedAt?: string) {
  const absoluteDate = formatSignalDate(signalDate || recordedAt)
  return reason.replace(/\((?:i dag|i går|för \d+ handelsdagar sedan)\)/i, `(${absoluteDate})`)
}

export function fundQuoteWarning(symbol: string, hasQuote: boolean) {
  return hasQuote ? '' : `Kursdata saknas för fondkod: ${symbol}. Innehavet sparas, men analysen använder inte en aktuell fondkurs.`
}

export function holdingMetrics(holding: PortfolioHolding, quote?: Analysis) {
  const currentPrice = quote?.price ?? holding.averageCost
  const marketValue = currentPrice * holding.quantity
  const costBasis = holding.averageCost * holding.quantity
  const pnl = marketValue - costBasis
  return { currentPrice, marketValue, costBasis, pnl, pnlPct: costBasis ? (pnl / costBasis) * 100 : 0 }
}

export function paperTradePnl(trade: PaperTrade, quote?: Analysis) {
  const current = trade.status === 'open' ? quote?.price ?? trade.entryPrice : trade.exitPrice ?? trade.entryPrice
  return { current, pnl: (current - trade.entryPrice) * trade.quantity, pnlPct: trade.entryPrice ? ((current - trade.entryPrice) / trade.entryPrice) * 100 : 0 }
}

function plusDays(iso: string, days: number) {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function buildEntryDecision(input: {
  reason: string
  source: string
  price: number
  targetPrice: number | null
  stopPrice: number | null
  dataQuality?: number
  dataAsOf: string
  signalDate?: string
}): PaperDecision {
  const target = input.targetPrice != null ? `Målpris ${input.targetPrice.toFixed(2)}.` : 'Inget separat målpris kunde beräknas.'
  const stop = input.stopPrice != null ? `Riskgräns ${input.stopPrice.toFixed(2)}.` : 'Ingen stop-nivå kunde beräknas.'
  return {
    kind: 'entry',
    summary: input.reason,
    evidence: [
      `Entrypris ${input.price.toFixed(2)}.`,
      target,
      stop,
      `Datakvalitet ${input.dataQuality ?? 0}/100.`,
      ...(input.signalDate ? [`Kursnedgång noterad ${formatSignalDate(input.signalDate)}.`] : []),
    ],
    source: input.source,
    dataAsOf: input.dataAsOf,
    decidedAt: input.dataAsOf,
    signalDate: input.signalDate,
  }
}

export function resolvePaperTrade(trade: PaperTrade, quote?: Analysis, now = new Date()): PaperTrade {
  if (trade.status !== 'open' || quote?.price == null) return trade
  const dataAsOf = now.toISOString()
  const hitTarget = trade.targetPrice != null && quote.price >= trade.targetPrice
  const hitStop = trade.stopPrice != null && quote.price <= trade.stopPrice
  const signalInvalid = quote.setup === 'none' || quote.setup === 'error'
  const timeExit = trade.expiresAt != null && now.getTime() >= new Date(trade.expiresAt).getTime()
  if (!hitTarget && !hitStop && !signalInvalid && !timeExit) return trade
  const kind: PaperDecisionKind = hitTarget ? 'target' : hitStop ? 'stop' : signalInvalid ? 'signal_exit' : 'time_exit'
  const summary = hitTarget
    ? 'VS stänger positionen eftersom målpriset träffades.'
    : hitStop
      ? 'VS stänger positionen eftersom riskgränsen träffades.'
      : signalInvalid
        ? 'VS stänger positionen eftersom köpsignalen inte längre är giltig i den senaste analysen.'
        : 'VS stänger positionen eftersom maximal innehavstid har nåtts utan avslutad tes.'
  const decision: PaperDecision = {
    kind,
    summary,
    evidence: [`Senaste pris ${quote.price.toFixed(2)}.`, quote.dropReason || 'Ingen ny orsak tillgänglig.', `Setup: ${quote.setupLabel}.`],
    source: quote.dropReasonSource || trade.source,
    dataAsOf,
    decidedAt: dataAsOf,
  }
  return {
    ...trade,
    status: hitTarget ? 'won' : hitStop ? 'lost' : timeExit ? 'expired' : 'closed',
    orderStatus: 'closed',
    exitPrice: quote.price,
    closedAt: dataAsOf,
    exitDecision: decision,
  }
}


export function paperTradeReviewDates(openedAt: string) {
  return { reviewAt: plusDays(openedAt, 14), expiresAt: plusDays(openedAt, 30) }
}
