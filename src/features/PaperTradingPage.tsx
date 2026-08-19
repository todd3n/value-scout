import { useEffect, useMemo, useRef, useState } from 'react'
import { loadPaperHistory, loadPaperMonitorStatus, savePaperHistory, type Analysis, type PaperMonitorStatus } from '../api/client'
import { PAPER_TRADES_KEY, TRADE_EVENTS_KEY, buildEntryDecision, formatTradeTimestamp, mergePaperHistory, paperTradePnl, paperTradeReviewDates, readLocal, resolvePaperTrade, writeLocal, type PaperTrade, type TradeEvent } from '../lib/portfolio'
import { marketForSymbol, marketStatus } from '../lib/marketHours'

function money(value: number, currency = 'USD') {
  try { return new Intl.NumberFormat('sv-SE', { style: 'currency', currency, maximumFractionDigits: 0 }).format(value) } catch { return `${Math.round(value).toLocaleString('sv-SE')} ${currency}` }
}

export function PaperTradingPage({ results }: { results: Analysis[] }) {
  const [trades, setTrades] = useState<PaperTrade[]>(() => readLocal<PaperTrade[]>(PAPER_TRADES_KEY, []))
  const [events, setEvents] = useState<TradeEvent[]>(() => readLocal<TradeEvent[]>(TRADE_EVENTS_KEY, []))
  const [historyReady, setHistoryReady] = useState(false)
  const [monitor, setMonitor] = useState<PaperMonitorStatus | null>(null)
  const previousTrades = useRef(trades)
  const quotes = useMemo(() => Object.fromEntries(results.map((result) => [result.symbol, result])), [results])

  useEffect(() => {
    let cancelled = false
    loadPaperHistory().then((remote) => {
      if (cancelled) return
      if (remote) {
        const localTrades = readLocal<PaperTrade[]>(PAPER_TRADES_KEY, [])
        const localEvents = readLocal<TradeEvent[]>(TRADE_EVENTS_KEY, [])
        const merged = mergePaperHistory({ trades: remote.trades || [], events: remote.events || [] }, { trades: localTrades, events: localEvents })
        setTrades(merged.trades)
        setEvents(merged.events)
      }
      setHistoryReady(true)
    }).catch(() => setHistoryReady(true))
    return () => { cancelled = true }
  }, [])
  useEffect(() => { void loadPaperMonitorStatus().then(setMonitor) }, [])
  useEffect(() => { if (historyReady) writeLocal(PAPER_TRADES_KEY, trades) }, [trades, historyReady])
  useEffect(() => { if (historyReady) writeLocal(TRADE_EVENTS_KEY, events) }, [events, historyReady])
  useEffect(() => {
    if (!historyReady) return
    const timer = window.setTimeout(() => { void savePaperHistory(trades, events) }, 250)
    return () => window.clearTimeout(timer)
  }, [trades, events, historyReady])
  useEffect(() => {
    const closedNow = trades.filter((trade) => trade.status !== 'open' && previousTrades.current.some((before) => before.id === trade.id && before.status === 'open'))
    if (closedNow.length) setEvents((current) => [...current, ...closedNow.map((trade): TradeEvent => ({ id: `${trade.id}-sell-${trade.closedAt || Date.now()}`, tradeId: trade.id, orderId: `${trade.orderId || trade.id}-SELL`, action: 'sell', symbol: trade.symbol, name: trade.name, market: trade.market || 'USA', quantity: trade.quantity, price: trade.exitPrice ?? trade.entryPrice, currency: trade.currency, reason: trade.exitDecision?.summary || (trade.status === 'won' ? 'Automatiskt såld eftersom målpriset träffades.' : trade.status === 'lost' ? 'Automatiskt såld eftersom stop-nivån träffades.' : 'Såld manuellt från paper trading.'), source: trade.exitDecision?.source || trade.source, status: 'closed', occurredAt: trade.closedAt || new Date().toISOString(), decisionKind: trade.exitDecision?.kind, evidence: trade.exitDecision?.evidence, dataAsOf: trade.exitDecision?.dataAsOf }))])
    previousTrades.current = trades
  }, [trades])
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

  function buyReason(result: Analysis) {
    return result.buyReasons?.[0]?.text || result.reasons?.[0] || result.thesis || `AI:n klassar signalen som ${result.setupLabel.toLowerCase()}.`
  }

  function record(result: Analysis) {
    const market = marketForSymbol(result.symbol, result.currency)
    const price = result.price
    if (price == null || (result.dataQuality ?? 0) < 60 || !marketStatus(market).isOpen || trades.some((trade) => trade.symbol === result.symbol && trade.status === 'open')) return
    const quantity = Math.max(1, result.suggestedShares || 1)
    const tradeId = `${result.symbol}-${Date.now()}`
    const orderId = `PAPER-${new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${result.symbol}`
    const reason = buyReason(result)
    const openedAt = new Date().toISOString()
    const source = result.buyReasons?.[0]?.source || result.dropReasonSource
    const entryDecision = buildEntryDecision({ reason, source, price, targetPrice: result.bounceTarget, stopPrice: price * 0.95, dataQuality: result.dataQuality, dataAsOf: openedAt })
    const dates = paperTradeReviewDates(openedAt)
    setTrades((current) => [...current, { id: tradeId, orderId, orderStatus: 'filled', symbol: result.symbol, name: result.name, market, reason, entryPrice: price, targetPrice: result.bounceTarget, stopPrice: price * 0.95, quantity, currency: result.currency, setupLabel: result.setupLabel, openedAt, filledAt: openedAt, reviewAt: dates.reviewAt, expiresAt: dates.expiresAt, status: 'open', source, dataQuality: result.dataQuality, entryDecision }])
    setEvents((current) => [...current, { id: `${tradeId}-received`, tradeId, orderId, action: 'buy', symbol: result.symbol, name: result.name, market, quantity, price, currency: result.currency, reason: 'Paper-order mottagen efter marknads-, pris- och datakvalitetskontroll.', source, status: 'received', occurredAt: openedAt, decisionKind: 'entry', evidence: entryDecision.evidence, dataAsOf: openedAt }, { id: `${tradeId}-filled`, tradeId, orderId, action: 'buy', symbol: result.symbol, name: result.name, market, quantity, price, currency: result.currency, reason, source, status: 'filled', occurredAt: openedAt, decisionKind: 'entry', evidence: entryDecision.evidence, dataAsOf: openedAt }])
  }

  function closeTrade(trade: PaperTrade) {
    const quote = quotes[trade.symbol]
    const exitPrice = quote?.price ?? trade.entryPrice
    const closedAt = new Date().toISOString()
    setTrades((current) => current.map((item) => item.id === trade.id ? { ...item, status: 'closed', orderStatus: 'closed', exitPrice, closedAt, exitDecision: { kind: 'manual', summary: 'Positionen stängdes manuellt i VS:s paper trading.', evidence: [`Senaste simulerade pris ${exitPrice.toFixed(2)}.`, 'Ingen riktig order skickades.'], source: quote?.dropReasonSource || item.source, dataAsOf: closedAt, decidedAt: closedAt } } : item))
  }

  return <main className="feature-page paper-page"><div className="feature-heading"><div><p className="eyebrow">PAPER VALIDATION LAB</p><h1>Paper trading</h1><p>Logga AI:ns köplägen som simulerade positioner. Inga riktiga order skickas. Resultaten blir bara en historik för att mäta om signalerna håller över tid.</p></div><span className="feature-badge">SIMULERADE ORDER · INGEN BROKER</span></div>
    <section className="order-desk panel"><div><p className="side-label">ORDERCENTER</p><h2>Gör ett köp med kontroll</h2><p className="order-copy">Varje simulerad order får tid, pris, marknad, status och förklaring. Riktiga order är inte aktiverade eftersom ingen mäklare är ansluten.</p></div><div className="order-status"><span className="status-dot"></span><strong>SÄKERT LÄGE · PAPER TRADING</strong><small>För riktiga köp krävs mäklare, API-behörighet och separat bekräftelse.</small></div></section>
    <section className="monitor-strip" aria-live="polite"><span className={monitor?.enabled ? 'monitor-led active' : 'monitor-led'}></span><div><strong>{monitor?.enabled ? 'BAKGRUNDSBEVAKNING AKTIV' : 'BAKGRUNDSBEVAKNING FÖRBEREDD'}</strong><small>{monitor?.enabled ? `Kontroll var ${monitor.intervalMinutes} minut under aktiv marknad. Senast: ${formatTradeTimestamp(monitor.lastRunAt || undefined)}.` : 'Aktiveras efter publicering; öppna positioner bevakas då även när sidan är stängd.'}</small></div><em>{monitor?.lastSummary || 'Hämtar status…'}</em></section>
    <section className="metric-grid paper-metrics panel"><div><span>Öppna trades</span><strong>{open.length}</strong></div><div><span>Stängda trades</span><strong>{closed.length}</strong></div><div><span>Träffsäkerhet</span><strong>{closed.length ? `${Math.round(wins / closed.length * 100)}%` : '—'}</strong></div><div><span>Total avkastning</span><strong className={totalReturnPct >= 0 ? 'pos' : 'neg'}>{closed.length ? `${totalReturnPct.toFixed(1)}%` : '—'}</strong></div><div><span>Max drawdown</span><strong className="neg">{closed.length ? `${maxDrawdownPct.toFixed(1)}%` : '—'}</strong></div><div><span>Realiserat P/L</span><strong className={closedPnl >= 0 ? 'pos' : 'neg'}>{money(closedPnl)}</strong></div><div><span>Orealiserat P/L</span><strong className={openPnl >= 0 ? 'pos' : 'neg'}>{money(openPnl)}</strong></div></section>
    <section className="feature-grid"><section className="panel"><div className="section-heading"><div><p className="side-label">SIGNALER</p><h2>Nya köplägen</h2></div><span>{opportunities.length} signaler</span></div>{opportunities.length === 0 ? <div className="empty"><p>Inga nya köplägen just nu. Det är ett giltigt resultat.</p></div> : <div className="signal-list">{opportunities.slice(0, 12).map((result) => { const market = marketForSymbol(result.symbol, result.currency); const status = marketStatus(market); const alreadyOpen = trades.some((trade) => trade.symbol === result.symbol && trade.status === 'open'); const dataOk = (result.dataQuality ?? 0) >= 60; const canBuy = status.isOpen && !alreadyOpen && result.price != null && dataOk; const blockedTitle = !status.isOpen ? `${status.label} är stängd. Öppet ${status.hours}.` : alreadyOpen ? 'Det finns redan en öppen paper trade.' : !dataOk ? `Datakvalitet ${result.dataQuality ?? 0}/100 är under VS:s miniminivå 60.` : undefined; return <div className="signal-row" key={result.symbol}><div><strong>{result.symbol}</strong><span>{result.name}</span></div><div><span className="chip chip-sniper">{result.setupLabel}</span><small>{result.price != null ? money(result.price, result.currency) : '—'} · Data {result.dataQuality ?? 0}/100</small></div><div><button className="primary-btn compact" type="button" onClick={() => record(result)} disabled={!canBuy} title={blockedTitle}>{!status.isOpen ? 'Börsen stängd' : alreadyOpen ? 'Redan köpt' : !dataOk ? 'Data ej godkänd' : 'Lägg paper-order'}</button>{!status.isOpen && <small>{status.label}: stängt · {status.hours}</small>}</div></div>})}</div>}</section><section className="panel"><p className="side-label">METOD</p><h2>VS:s beslutsregler</h2><ul className="method-list"><li>Order fylls bara när marknaden är öppen, pris finns och datakvaliteten är minst 60/100.</li><li>Entry, källor, mål och riskgräns sparas tillsammans med ordern.</li><li>VS bevakar målpris, stop, försämrad signal, 14-dagars review och 30-dagars maxinnehav.</li><li>Varje sälj loggar exakt beslut, bevis och datum för den data som användes.</li><li>Resultatet är research och paper trading, inte bevis på framtida avkastning.</li></ul></section></section>
    <section className="panel"><div className="section-heading"><div><p className="side-label">LOGG</p><h2>Paper trades</h2></div><span>{trades.length} totalt</span></div>{trades.length === 0 ? <div className="empty"><p>Registrera en köpsignal ovan för att börja validera modellen.</p></div> : <div className="table-wrap"><table className="grid"><thead><tr><th>Symbol</th><th>Köporsak</th><th>Status</th><th>Entry</th><th>Mål / stop</th><th>Senast</th><th>P/L</th><th>Öppnad / stängd</th><th></th></tr></thead><tbody>{trades.slice().reverse().map((trade) => { const result = paperTradePnl(trade, quotes[trade.symbol]); return <tr key={trade.id}><td><strong>{trade.symbol}</strong><span>{trade.name}</span></td><td>{trade.reason ?? 'AI-köpläge registrerat.'}</td><td><span className={`chip chip-${trade.status === 'open' ? 'watch' : trade.status === 'won' ? 'sniper' : 'error'}`}>{trade.status === 'open' ? 'Öppen' : trade.status === 'won' ? 'Mål träffat' : trade.status === 'lost' ? 'Stop träffat' : 'Stängd'}</span></td><td>{money(trade.entryPrice, trade.currency)}</td><td>{money(trade.targetPrice ?? trade.entryPrice, trade.currency)} / {money(trade.stopPrice ?? trade.entryPrice * 0.95, trade.currency)}</td><td>{money(result.current, trade.currency)}</td><td className={result.pnl >= 0 ? 'pos' : 'neg'}>{money(result.pnl, trade.currency)} ({result.pnlPct.toFixed(1)}%)</td><td>{formatTradeTimestamp(trade.openedAt)}{trade.closedAt ? ` / ${formatTradeTimestamp(trade.closedAt)}` : ''}</td><td>{trade.status === 'open' && <button className="icon-btn" type="button" onClick={() => closeTrade(trade)} aria-label={`Stäng paper trade ${trade.symbol}`}>×</button>}</td></tr> })}</tbody></table></div>}</section>
    <section className="panel transaction-panel"><div className="section-heading"><div><p className="side-label">AUDIT LOGG</p><h2>Köp och sälj</h2></div><span>{events.length} händelser</span></div>{events.length === 0 ? <div className="empty compact-empty"><p>Inga köp eller sälj har loggats ännu.</p></div> : <div className="table-wrap"><table className="grid audit-grid"><thead><tr><th>Tid</th><th>Order-ID</th><th>Åtgärd</th><th>Marknad</th><th>Symbol</th><th>Antal</th><th>Pris</th><th>Varför</th><th>Status</th></tr></thead><tbody>{events.slice().reverse().map((event) => <tr key={event.id}><td>{new Date(event.occurredAt).toLocaleString('sv-SE')}</td><td className="order-id">{event.orderId}</td><td><span className={`action-badge ${event.action}`}>{event.action === 'buy' ? 'KÖP' : 'SÄLJ'}</span></td><td>{event.market}</td><td><strong>{event.symbol}</strong><span>{event.name}</span></td><td>{event.quantity}</td><td>{money(event.price, event.currency)}</td><td className="audit-reason">{event.reason}</td><td><span className={`order-status-badge ${event.status}`}>{event.status === 'filled' ? 'Fylld' : event.status === 'closed' ? 'Stängd' : event.status === 'received' ? 'Mottagen' : 'Avvisad'}</span></td></tr>)}</tbody></table></div>}</section>
    <section className="panel decision-journal"><div className="section-heading"><div><p className="side-label">BESLUTSJOURNAL</p><h2>Varför VS agerade</h2></div><span>{trades.length} positioner</span></div>{trades.length === 0 ? <div className="empty compact-empty"><p>När VS lägger en paper-order visas beslut, källor och bevis här.</p></div> : <div className="decision-list">{trades.slice().reverse().map((trade) => <article className="decision-card" key={`${trade.id}-decisions`}><div><span className="decision-kind buy">KÖP</span><strong>{trade.symbol} · {formatTradeTimestamp(trade.openedAt)}</strong></div><p>{trade.entryDecision?.summary || trade.reason || 'AI-köpläge registrerat.'}</p><small>Källa: {trade.entryDecision?.source || trade.source} · Data: {formatTradeTimestamp(trade.entryDecision?.dataAsOf || trade.openedAt)}</small>{trade.entryDecision?.evidence?.length ? <ul>{trade.entryDecision.evidence.map((item) => <li key={item}>{item}</li>)}</ul> : null}{trade.exitDecision && <><hr/><div><span className="decision-kind sell">SÄLJ</span><strong>{formatTradeTimestamp(trade.closedAt)}</strong></div><p>{trade.exitDecision.summary}</p><small>Källa: {trade.exitDecision.source} · Data: {formatTradeTimestamp(trade.exitDecision.dataAsOf)}</small><ul>{trade.exitDecision.evidence.map((item) => <li key={item}>{item}</li>)}</ul></>}</article>)}</div>}</section>
    <p className="fine page-disclaimer">Paper trading använder simulerade positioner och källmärkta marknadsdata. Det är research och analys, inte personlig finansiell rådgivning, och skickar inga order till en mäklare.</p>
  </main>
}
