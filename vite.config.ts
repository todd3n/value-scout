import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import YahooFinance from 'yahoo-finance2'
import { analyzeSymbols } from './server/analyze.ts'

function yahooApiPlugin(): Plugin {
  const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] })
  return {
    name: 'yahoo-api',
    configureServer(server) {
      server.middlewares.use('/api/scan', async (req, res) => {
        try {
          const url = new URL(req.url ?? '', 'http://localhost')
          const symbols = (url.searchParams.get('symbols') || '')
            .split(',')
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean)
          const portfolio = Number(url.searchParams.get('portfolio') || '100000')
          const riskPct = Number(url.searchParams.get('risk') || '2')
          if (!symbols.length) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ error: 'symbols required' }))
            return
          }
          const results = await analyzeSymbols(yf, symbols, portfolio, riskPct)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ results, fetchedAt: new Date().toISOString() }))
        } catch (e) {
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'scan failed' }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), yahooApiPlugin()],
})
