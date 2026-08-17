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

export type PaperTrade = {
  id: string
  symbol: string
  name: string
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
}

export const HOLDINGS_KEY = 'value-scout-holdings-v1'
export const PAPER_TRADES_KEY = 'value-scout-paper-trades-v1'

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

export function resolvePaperTrade(trade: PaperTrade, quote?: Analysis): PaperTrade {
  if (trade.status !== 'open' || quote?.price == null) return trade
  const hitTarget = trade.targetPrice != null && quote.price >= trade.targetPrice
  const hitStop = trade.stopPrice != null && quote.price <= trade.stopPrice
  if (!hitTarget && !hitStop) return trade
  return { ...trade, status: hitTarget ? 'won' : 'lost', exitPrice: quote.price, closedAt: new Date().toISOString() }
}
