import assert from 'node:assert/strict'
import { holdingMetrics, paperTradePnl, readLocal, resolvePaperTrade, writeLocal } from '../src/lib/portfolio.ts'

const holding = { id: 'aapl-1', symbol: 'AAPL', type: 'stock', quantity: 10, averageCost: 100, currency: 'USD', addedAt: '2026-08-17T00:00:00.000Z' }
const quote = { symbol: 'AAPL', price: 110 }
const metrics = holdingMetrics(holding, quote)
assert.equal(metrics.marketValue, 1100)
assert.equal(metrics.pnl, 100)
assert.equal(metrics.pnlPct, 10)

const trade = { id: 'trade-1', symbol: 'AAPL', name: 'Apple', entryPrice: 100, targetPrice: 120, stopPrice: 95, quantity: 2, currency: 'USD', setupLabel: 'Köpläge', openedAt: '2026-08-17T00:00:00.000Z', status: 'open', source: 'Yahoo Finance' }
const tradePnl = paperTradePnl(trade, { symbol: 'AAPL', price: 115 })
assert.equal(tradePnl.pnl, 30)
assert.equal(tradePnl.pnlPct, 15)
const targetTrade = resolvePaperTrade(trade, { symbol: 'AAPL', price: 121 })
assert.equal(targetTrade.status, 'won')
assert.equal(targetTrade.exitPrice, 121)
const store = new Map()
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
writeLocal('holdings', [holding])
assert.deepEqual(readLocal('holdings', []), [holding])
console.log('portfolio-test: passed for valuation, P/L, auto-close, and local persistence')
