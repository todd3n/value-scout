import { useEffect, useMemo, useState } from 'react'
import { scanSymbols, type Analysis } from '../api/client'
import { holdingMetrics, HOLDINGS_KEY, readLocal, writeLocal, type HoldingType, type PortfolioHolding } from '../lib/portfolio'

const API_BASE = 'https://3000-i41dbe2935xmpsi1wpvd3-9e36b5fa.us2.manus.computer'

type PortfolioAnalysis = { summary: string; strengths: string[]; risks: string[]; followUps: string[]; disclaimer: string }

function money(value: number, currency = 'SEK') {
  try { return new Intl.NumberFormat('sv-SE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) } catch { return `${Math.round(value).toLocaleString('sv-SE')} ${currency}` }
}

function pct(value: number) { return `${value >= 0 ? '+' : ''}${value.toFixed(1).replace('.', ',')}%` }

export function PortfolioPage({ results }: { results: Analysis[] }) {
  const [holdings, setHoldings] = useState<PortfolioHolding[]>(() => readLocal(HOLDINGS_KEY, []))
  const [quotes, setQuotes] = useState<Record<string, Analysis>>({})
  const [symbol, setSymbol] = useState('')
  const [type, setType] = useState<HoldingType>('stock')
  const [quantity, setQuantity] = useState('')
  const [averageCost, setAverageCost] = useState('')
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    writeLocal(HOLDINGS_KEY, holdings)
    const next = { ...quotes }
    results.forEach((quote) => { next[quote.symbol] = quote })
    setQuotes(next)
  }, [holdings, results])

  const rows = useMemo(() => holdings.map((holding) => ({ holding, metrics: holdingMetrics(holding, quotes[holding.symbol]) })), [holdings, quotes])
  const totalValue = rows.reduce((sum, row) => sum + row.metrics.marketValue, 0)
  const totalCost = rows.reduce((sum, row) => sum + row.metrics.costBasis, 0)
  const totalPnl = totalValue - totalCost
  const largest = rows.slice().sort((a, b) => b.metrics.marketValue - a.metrics.marketValue)[0]

  function addHolding(event: React.FormEvent) {
    event.preventDefault()
    const normalized = symbol.trim().toUpperCase()
    const qty = Number(quantity)
    const cost = Number(averageCost)
    if (!normalized || !Number.isFinite(qty) || qty <= 0 || !Number.isFinite(cost) || cost <= 0) {
      setError('Fyll i ticker, antal och genomsnittligt inköpspris.')
      return
    }
    setHoldings((current) => [...current, { id: `${normalized}-${Date.now()}`, symbol: normalized, type, quantity: qty, averageCost: cost, currency: 'SEK', addedAt: new Date().toISOString() }])
    setSymbol(''); setQuantity(''); setAverageCost(''); setError('')
  }

  async function runAnalysis() {
    if (!holdings.length) { setError('Lägg till minst ett innehav först.'); return }
    setLoading(true); setError('')
    try {
      const symbols = holdings.map((holding) => holding.symbol)
      const response = await scanSymbols(symbols, totalValue || 100000, 2)
      const next = { ...quotes }
      response.results.forEach((quote) => { next[quote.symbol] = quote })
      setQuotes(next)
      const payload = holdings.map((holding) => {
        const metrics = holdingMetrics(holding, next[holding.symbol])
        return { symbol: holding.symbol, type: holding.type, quantity: holding.quantity, averageCost: holding.averageCost, currency: holding.currency, ...metrics }
      })
      const aiResponse = await fetch(`${API_BASE}/api/value-scout/portfolio-analysis`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ holdings: payload }) })
      if (!aiResponse.ok) throw new Error(`AI-analys misslyckades (${aiResponse.status})`)
      const body = await aiResponse.json() as { analysis?: PortfolioAnalysis; error?: string }
      if (!body.analysis) throw new Error(body.error || 'AI-analys saknar resultat')
      setAnalysis(body.analysis)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Kunde inte analysera portföljen.')
    } finally { setLoading(false) }
  }

  return <main className="feature-page portfolio-page">
    <div className="feature-heading"><div><p className="eyebrow">PORTFOLIO INTELLIGENCE</p><h1>Din portfölj</h1><p>Registrera aktier och fonder. Marknadsvärden hämtas från tillgänglig kursdata och AI:n pekar ut koncentration, risker och frågor att följa upp.</p></div><span className="feature-badge">SIMULERING · INGEN ORDER</span></div>
    <section className="feature-grid">
      <form className="panel form-panel" onSubmit={addHolding}>
        <p className="side-label">NYTT INNEHAV</p><h2>Lägg till position</h2>
        <label className="field">Ticker eller fondkod<input value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="AAPL eller fondkod" /></label>
        <label className="field">Tillgångstyp<select value={type} onChange={(e) => setType(e.target.value as HoldingType)}><option value="stock">Aktie</option><option value="fund">Fond</option></select></label>
        <div className="form-row"><label className="field">Antal<input type="number" min="0" step="any" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="10" /></label><label className="field">Snittpris<input type="number" min="0" step="any" value={averageCost} onChange={(e) => setAverageCost(e.target.value)} placeholder="180" /></label></div>
        <button className="primary-btn" type="submit">Lägg till innehav</button>
        {error && <p className="error-banner" role="alert">{error}</p>}
        <p className="fine">Användaren ansvarar för att ticker och inköpspris är korrekta. Detta är inte investeringsrådgivning.</p>
      </form>
      <section className="panel summary-panel"><p className="side-label">ÖVERSIKT</p><h2>Portföljens signal</h2><div className="metric-grid"><div><span>Marknadsvärde</span><strong>{money(totalValue)}</strong></div><div><span>Resultat</span><strong className={totalPnl >= 0 ? 'pos' : 'neg'}>{money(totalPnl)}</strong></div><div><span>Avkastning</span><strong className={totalCost && totalPnl >= 0 ? 'pos' : 'neg'}>{totalCost ? pct(totalPnl / totalCost * 100) : '—'}</strong></div><div><span>Största post</span><strong>{largest?.holding.symbol || '—'}</strong></div></div><button className="primary-btn" type="button" onClick={runAnalysis} disabled={loading || holdings.length === 0}>{loading ? 'Analyserar portfölj…' : 'Kör AI-analys'}</button></section>
    </section>
    <section className="panel"><div className="section-heading"><div><p className="side-label">INNEHAV</p><h2>Registrerade positioner</h2></div><span>{holdings.length} poster</span></div>{holdings.length === 0 ? <div className="empty"><p>Din portfölj är tom. Lägg till första innehavet ovan.</p></div> : <div className="table-wrap"><table className="grid"><thead><tr><th>Ticker</th><th>Typ</th><th>Antal</th><th>Senaste kurs</th><th>Värde</th><th>Resultat</th><th></th></tr></thead><tbody>{rows.map(({ holding, metrics }) => <tr key={holding.id}><td><strong>{holding.symbol}</strong></td><td>{holding.type === 'fund' ? 'Fond' : 'Aktie'}</td><td>{holding.quantity}</td><td>{money(metrics.currentPrice, holding.currency)}</td><td>{money(metrics.marketValue, holding.currency)}</td><td className={metrics.pnl >= 0 ? 'pos' : 'neg'}>{money(metrics.pnl, holding.currency)} ({pct(metrics.pnlPct)})</td><td><button className="icon-btn" type="button" aria-label={`Ta bort ${holding.symbol}`} onClick={() => setHoldings((current) => current.filter((item) => item.id !== holding.id))}>×</button></td></tr>)}</tbody></table></div>}</section>
    {analysis && <section className="ai-report panel"><div className="section-heading"><div><p className="side-label">AI-RAPPORT</p><h2>Portföljens analys</h2></div><span className="chip chip-watch">KÄLLBASERAD</span></div><p className="report-summary">{analysis.summary}</p><div className="report-columns"><div><h3>Styrkor</h3><ul>{analysis.strengths.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Risker</h3><ul className="risks">{analysis.risks.map((item) => <li key={item}>{item}</li>)}</ul></div><div><h3>Följ upp</h3><ul>{analysis.followUps.map((item) => <li key={item}>{item}</li>)}</ul></div></div><p className="fine">{analysis.disclaimer}</p></section>}
  </main>
}
