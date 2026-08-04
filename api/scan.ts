import type { VercelRequest, VercelResponse } from '@vercel/node'
import YahooFinance from 'yahoo-finance2'
import { analyzeSymbols } from '../server/analyze.js'

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const symbols = String(req.query.symbols || '')
      .split(',')
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    const portfolio = Number(req.query.portfolio || 100000)
    const risk = Number(req.query.risk || 2)
    if (!symbols.length) {
      res.status(400).json({ error: 'symbols required' })
      return
    }
    const results = await analyzeSymbols(yf, symbols, portfolio, risk)
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=300')
    res.status(200).json({ results, fetchedAt: new Date().toISOString() })
  } catch (e) {
    res.status(500).json({ error: e instanceof Error ? e.message : 'scan failed' })
  }
}
