import { useEffect, useMemo, useState } from 'react'
import type { Analysis } from '../api/client'
import { PAPER_TRADES_KEY, paperTradePnl, readLocal, resolvePaperTrade, writeLocal, type PaperTrade } from '../lib/portfolio'

function money(value: number, currency = 'USD') {
  try { return new Intl.NumberFormat('sv-SE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) } catch { return `${Math.round(value).toLocaleString('sv-SE')} ${currency}` }
}

export function PaperTradingPage({ results }: { results: Analysis[] }) {
  const [trades, setTrades] = useState<PaperTrade[]>(() => readLocal(PAPER_TRADES_KEY, []))
  const quotes = useMemo(() => Object.fromEntries(results.map((result) => [result.symbol, result])), [results])

  useEffect(() => { writeLocal(PAPER_TRADES_KEY, trades) }, [trades])
  useEffect(() => {
    setTrades((current) => current.map((trade) => {
      if (trade.status !== 'open') return trade
      const quote = quotes[trade.symbol]
      return resolvePaperTrade(trade, quote)
    }))
  }, [quotes])

  const open = trades.filter((trade) => trade.status === 'open')
  const closed = trades.filter((trade) => trade.status !== 'open')
  const wins = closed.filter((trade) => trade.status === 'won').length
  const closedPnl = closed.reduce((sum, trade) => sum + paperTradePnl(trade, quotes[trade.symbol]).pnl, 0)
  const openPnl = open.reduce((sum, trade) => sum + paperTradePnl(trade, quotes[trade.symbol]).pnl, 0)
  const totalEntry = trades.reduce((sum, trade) => sum + trade.entryPrice * trade.quantity, 0)
  const totalReturnPct = totalEntry ? (closedPnl / totalEntry) * 100 : 0
  const equityPath = [0, ...closed.slice().sort((a, b) => new Date(a.closedAt || a.openedAt).getTime() - new Date(b.closedAt || b.openedAt).getTime()).map((trade) => paperTradePnl(trade, quotes[trade.symbol]).pnl)].reduce<number[]>((path, pnl) => [...path, (path[path.length - 1] || 0) + pnl], [])
  let peak = 0
  const maxDrawdown = equityPath.reduce((max, value) => { peak = Math.max(peak, value); return Math.min(max, value - peak) }, 0)
  const maxDrawdownPct = totalEntry ? (maxDrawdown / totalEntry) * 100 : 0
  const opportunities = results.filter((result) => result.setup === 'sniper')

  function record(result: Analysis) {
    if (result.price == null || trades.some((trade) => trade.symbol === result.symbol && trade.status === 'open')) return
    const quantity = Math.max(1, result.suggestedShares || 1)
    setTrades((current) => [...current, { id: `${result.symbol}-${Date.now()}`, symbol: result.symbol, name: result.name, entryPrice: result.price!, targetPrice: result.bounceTarget, stopPrice: result.price! * 0.95, quantity, currency: result.currency, setupLabel: result.setupLabel, openedAt: new Date().toISOString(), status: 'open', source: result.dropReasonSource }])
  }

  function closeTrade(trade: PaperTrade) {
    const quote = quotes[trade.symbol]
    const exitPrice = quote?.price ?? trade.entryPrice
    setTrades((current) => current.map((item) => item.id === trade.id ? { ...item, status: 'closed', exitPrice, closedAt: new Date().toISOString() } : item))
  }

  return <main className="feature-page paper-page"><div className="feature-heading"><div><p className="eyebrow">PAPER VALIDATION LAB</p><h1>Paper trading</h1><p>Logga AI:ns köplägen som simulerade positioner. Inga riktiga order skickas. Resultaten blir bara en historik för att mäta om signalerna håller över tid.</p></div><span className="feature-badge">SIMULERADE ORDER · INGEN BROKER</span></div>
    <section className="metric-grid paper-metrics panel"><div><span>Öppna trades</span><strong>{open.length}</strong></div><div><span>Stängda trades</span><strong>{closed.length}</strong></div><div><span>Träffsäkerhet</span><strong>{closed.length ? `${Math.round(wins / closed.length * 100)}%` : '—'}</strong></div><div><span>Total avkastning</span><strong className={totalReturnPct >= 0 ? 'pos' : 'neg'}>{closed.length ? `${totalReturnPct.toFixed(1)}%` : '—'}</strong></div><div><span>Max drawdown</span><strong className="neg">{closed.length ? `${maxDrawdownPct.toFixed(1)}%` : '—'}</strong></div><div><span>Realiserat P/L</span><strong className={closedPnl >= 0 ? 'pos' : 'neg'}>{money(closedPnl)}</strong></div><div><span>Orealiserat P/L</span><strong className={openPnl >= 0 ? 'pos' : 'neg'}>{money(openPnl)}</strong></div></section>
    <section className="feature-grid"><section className="panel"><div className="section-heading"><div><p className="side-label">SIGNALER</p><h2>Nya köplägen</h2></div><span>{opportunities.length} signaler</span></div>{opportunities.length === 0 ? <div className="empty"><p>Inga nya köplägen just nu. Det är ett giltigt resultat.</p></div> : <div className="signal-list">{opportunities.slice(0, 12).map((result) => <div className="signal-row" key={result.symbol}><div><strong>{result.symbol}</strong><span>{result.name}</span></div><div><span className="chip chip-sniper">{result.setupLabel}</span><small>{result.price != null ? money(result.price, result.currency) : '—'}</small></div><button className="primary-btn compact" type="button" onClick={() => record(result)} disabled={trades.some((trade) => trade.symbol === result.symbol && trade.status === 'open')}>Paper trade</button></div>)}</div>}</section><section className="panel"><p className="side-label">METOD</p><h2>Regler för validering</h2><ul className="method-list"><li>Entry = priset när signalen registreras.</li><li>Mål = modellens återhämtningsnivå när den finns.</li><li>Stop = 5% under entry för jämförbar riskmätning.</li><li>Positionen stängs automatiskt när mål eller stop träffas, eller manuellt.</li><li>Resultatet är historik, inte bevis på framtida avkastning.</li></ul></section></section>
    <section className="panel"><div className="section-heading"><div><p className="side-label">LOGG</p><h2>Paper trades</h2></div><span>{trades.length} totalt</span></div>{trades.length === 0 ? <div className="empty"><p>Registrera en köpsignal ovan för att börja validera modellen.</p></div> : <div className="table-wrap"><table className="grid"><thead><tr><th>Symbol</th><th>Status</th><th>Entry</th><th>Mål / stop</th><th>Senast</th><th>P/L</th><th>Öppnad / stängd</th><th></th></tr></thead><tbody>{trades.slice().reverse().map((trade) => { const result = paperTradePnl(trade, quotes[trade.symbol]); return <tr key={trade.id}><td><strong>{trade.symbol}</strong><span>{trade.name}</span></td><td><span className={`chip chip-${trade.status === 'open' ? 'watch' : trade.status === 'won' ? 'sniper' : 'error'}`}>{trade.status === 'open' ? 'Öppen' : trade.status === 'won' ? 'Mål träffat' : trade.status === 'lost' ? 'Stop träffat' : 'Stängd'}</span></td><td>{money(trade.entryPrice, trade.currency)}</td><td>{money(trade.targetPrice ?? trade.entryPrice, trade.currency)} / {money(trade.stopPrice ?? trade.entryPrice * 0.95, trade.currency)}</td><td>{money(result.current, trade.currency)}</td><td className={result.pnl >= 0 ? 'pos' : 'neg'}>{money(result.pnl, trade.currency)} ({result.pnlPct.toFixed(1)}%)</td><td>{new Date(trade.openedAt).toLocaleDateString('sv-SE')}{trade.closedAt ? ` / ${new Date(trade.closedAt).toLocaleDateString('sv-SE')}` : ''}</td><td>{trade.status === 'open' && <button className="icon-btn" type="button" onClick={() => closeTrade(trade)} aria-label={`Stäng paper trade ${trade.symbol}`}>×</button>}</td></tr> })}</tbody></table></div>}</section>
    <p className="fine page-disclaimer">Paper trading använder simulerade positioner och historiska/aktuella marknadsdata. Det är inte investeringsrådgivning och skickar inga order till en mäklare.</p>
  </main>
}
