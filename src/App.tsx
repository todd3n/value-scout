import { useMemo, useState } from 'react'
import type { Analysis } from './api/client'
import { useLiveScanner } from './hooks/useLiveScanner'
import { resolveWatchlist } from './data/watchlists'
import './App.css'

type Tab = 'undervalued' | 'all' | 'neutral' | 'underweight'
type SortKey = 'score' | 'upside' | 'name' | 'pe'

function fmtNum(n: number | null, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('sv-SE', { maximumFractionDigits: digits })
}

function fmtPrice(n: number | null, currency: string) {
  if (n == null) return '—'
  const c = currency === 'GBp' ? 'p' : currency
  return `${fmtNum(n, 2)} ${c}`
}

function fmtMoney(n: number, currency: string) {
  const c = currency === 'GBp' ? 'GBP' : currency || 'SEK'
  try {
    return new Intl.NumberFormat('sv-SE', {
      style: 'currency',
      currency: c,
      maximumFractionDigits: 0,
    }).format(n)
  } catch {
    return `${Math.round(n).toLocaleString('sv-SE')} ${currency}`
  }
}

function marketOf(symbol: string) {
  if (symbol.endsWith('.ST')) return 'SE'
  if (symbol.endsWith('.L')) return 'UK'
  return 'US'
}

function DetailPanel({
  a,
  onClose,
}: {
  a: Analysis
  onClose: () => void
}) {
  return (
    <aside className="detail" aria-label="Bolagsanalys">
      <div className="detail-top">
        <div>
          <p className="detail-kicker">{a.symbol} · {marketOf(a.symbol)}</p>
          <h2>{a.name}</h2>
          <p className="detail-sub">
            {[a.sector, a.industry].filter(Boolean).join(' · ') || '—'}
          </p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng">
          ×
        </button>
      </div>

      <div className="detail-rating">
        <span className={`chip chip-${a.rating}`}>{a.ratingLabel}</span>
        <span className="chip chip-muted">Conviction {a.conviction}</span>
        <span className="chip chip-muted">Data {a.dataQuality}%</span>
      </div>

      <div className="detail-kpis">
        <div>
          <span>Kurs</span>
          <strong>{fmtPrice(a.price, a.currency)}</strong>
        </div>
        <div>
          <span>Fair value</span>
          <strong>{fmtPrice(a.fairValue, a.currency)}</strong>
        </div>
        <div>
          <span>Uppsida</span>
          <strong className={a.upsidePct && a.upsidePct > 0 ? 'pos' : a.upsidePct && a.upsidePct < 0 ? 'neg' : ''}>
            {a.upsidePct != null ? `${a.upsidePct > 0 ? '+' : ''}${fmtNum(a.upsidePct, 1)}%` : '—'}
          </strong>
        </div>
        <div>
          <span>Score</span>
          <strong>{fmtNum(a.scorePct, 1)}%</strong>
        </div>
      </div>

      <section className="detail-block">
        <h3>Varför</h3>
        <p>{a.thesis || 'Analys pågår eller data saknas.'}</p>
      </section>

      {a.reasons.length > 0 && (
        <section className="detail-block">
          <h3>Stödjande faktorer</h3>
          <ul>
            {a.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      {a.catalysts.length > 0 && (
        <section className="detail-block">
          <h3>Katalysatorer</h3>
          <ul>
            {a.catalysts.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>
      )}

      {a.risks.length > 0 && (
        <section className="detail-block">
          <h3>Risker</h3>
          <ul className="risks">
            {a.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="detail-block">
        <h3>Nyckeltal</h3>
        <dl className="metrics">
          <div>
            <dt>P/E</dt>
            <dd>{fmtNum(a.metrics.pe)}</dd>
          </div>
          <div>
            <dt>Fwd P/E</dt>
            <dd>{fmtNum(a.metrics.forwardPe)}</dd>
          </div>
          <div>
            <dt>PEG</dt>
            <dd>{fmtNum(a.metrics.peg)}</dd>
          </div>
          <div>
            <dt>EV/EBITDA</dt>
            <dd>{fmtNum(a.metrics.evEbitda)}</dd>
          </div>
          <div>
            <dt>P/B</dt>
            <dd>{fmtNum(a.metrics.pb)}</dd>
          </div>
          <div>
            <dt>ROE</dt>
            <dd>{fmtNum(a.metrics.roe != null ? (Math.abs(a.metrics.roe) < 1 ? a.metrics.roe * 100 : a.metrics.roe) : null)}%</dd>
          </div>
        </dl>
      </section>

      <section className="detail-block">
        <h3>Föreslagen position</h3>
        <p className="position">
          {fmtMoney(a.suggestedAmount, a.currency === 'GBp' ? 'GBP' : a.currency)} · {a.positionPct}% av
          portfölj
          {a.suggestedShares > 0 ? ` · ${a.suggestedShares} aktier` : ''}
        </p>
        {a.fairValueMethod && <p className="fine">{a.fairValueMethod}</p>}
      </section>

      <section className="detail-block">
        <h3>Factor-modell</h3>
        <table className="factor-table">
          <tbody>
            {a.breakdown.map((b) => (
              <tr key={b.key}>
                <td>
                  {b.label}
                  <span>{b.note}</span>
                </td>
                <td>
                  {b.points}/{b.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </aside>
  )
}

export default function App() {
  const [portfolio, setPortfolio] = useState(500_000)
  const [risk, setRisk] = useState(2)
  const [tab, setTab] = useState<Tab>('undervalued')
  const [sort, setSort] = useState<SortKey>('score')
  const [market, setMarket] = useState<'all' | 'US' | 'UK' | 'SE'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const { results, status, setRunning } = useLiveScanner(portfolio, risk)
  const universeSize = resolveWatchlist('all').length

  const filtered = useMemo(() => {
    let list = results.filter((a) => !a.error)
    if (market !== 'all') list = list.filter((a) => marketOf(a.symbol) === market)
    if (tab === 'undervalued') list = list.filter((a) => a.rating === 'overweight')
    else if (tab === 'neutral') list = list.filter((a) => a.rating === 'neutral')
    else if (tab === 'underweight') list = list.filter((a) => a.rating === 'underweight')
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.symbol.toLowerCase().includes(s) ||
          a.name.toLowerCase().includes(s) ||
          (a.sector ?? '').toLowerCase().includes(s),
      )
    }
    const sorted = [...list]
    sorted.sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name, 'sv')
      if (sort === 'upside') return (b.upsidePct ?? -999) - (a.upsidePct ?? -999)
      if (sort === 'pe') return (a.metrics.pe ?? 999) - (b.metrics.pe ?? 999)
      return b.scorePct - a.scorePct
    })
    return sorted
  }, [results, tab, sort, market, q])

  const selectedRow = results.find((a) => a.symbol === selected) ?? null
  const ow = results.filter((a) => a.rating === 'overweight').length
  const neu = results.filter((a) => a.rating === 'neutral').length
  const uw = results.filter((a) => a.rating === 'underweight').length
  const pct =
    status.totalInCycle > 0
      ? Math.round((status.doneInCycle / status.totalInCycle) * 100)
      : 0

  const liveLabel =
    status.phase === 'scanning'
      ? `Analyserar ${status.currentSymbols.join(', ')}`
      : status.phase === 'cycle-pause'
        ? 'Cykel klar — nästa runda strax'
        : status.phase === 'error'
          ? `Fel: ${status.lastError}`
          : status.running
            ? 'Väntar…'
            : 'Pausad'

  return (
    <div className={`shell ${selectedRow ? 'has-detail' : ''}`}>
      <header className="topbar">
        <div className="brand-block">
          <span className="mark" aria-hidden />
          <div>
            <strong>Value Scout</strong>
            <span>Equity Research · Live screening</span>
          </div>
        </div>

        <div className="live-pill" data-phase={status.phase}>
          <span className="pulse" aria-hidden />
          <div>
            <strong>{status.running ? 'LIVE' : 'PAUS'}</strong>
            <span>{liveLabel}</span>
          </div>
        </div>

        <div className="top-stats">
          <div>
            <span>Undervärderade</span>
            <strong>{ow}</strong>
          </div>
          <div>
            <span>Neutral</span>
            <strong>{neu}</strong>
          </div>
          <div>
            <span>Underweight</span>
            <strong>{uw}</strong>
          </div>
          <div>
            <span>Täckning</span>
            <strong>
              {results.length}/{universeSize}
            </strong>
          </div>
        </div>

        <button
          type="button"
          className="bar-btn"
          onClick={() => setRunning(!status.running)}
        >
          {status.running ? 'Pausa' : 'Starta'}
        </button>
      </header>

      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <p className="side-label">Portfölj</p>
          <label className="field">
            Kapital (SEK)
            <input
              type="number"
              min={10000}
              step={10000}
              value={portfolio}
              onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
            />
          </label>
          <label className="field">
            Risk per namn (%)
            <input
              type="number"
              min={0.5}
              max={5}
              step={0.5}
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value) || 1)}
            />
          </label>

          <p className="side-label">Marknad</p>
          <div className="seg">
            {(['all', 'US', 'UK', 'SE'] as const).map((m) => (
              <button
                key={m}
                type="button"
                className={market === m ? 'on' : ''}
                onClick={() => setMarket(m)}
              >
                {m === 'all' ? 'Alla' : m}
              </button>
            ))}
          </div>

          <p className="side-label">Vy</p>
          <nav className="side-nav">
            <button type="button" className={tab === 'undervalued' ? 'on' : ''} onClick={() => setTab('undervalued')}>
              Undervärderade <em>{ow}</em>
            </button>
            <button type="button" className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              Alla analyserade <em>{results.length}</em>
            </button>
            <button type="button" className={tab === 'neutral' ? 'on' : ''} onClick={() => setTab('neutral')}>
              Neutral <em>{neu}</em>
            </button>
            <button type="button" className={tab === 'underweight' ? 'on' : ''} onClick={() => setTab('underweight')}>
              Underweight <em>{uw}</em>
            </button>
          </nav>

          <p className="side-label">Sortering</p>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
            <option value="score">Model score</option>
            <option value="upside">Uppsida</option>
            <option value="pe">Lägst P/E</option>
            <option value="name">Namn</option>
          </select>

          <label className="field">
            Sök
            <input
              type="search"
              placeholder="Ticker, bolag, sektor…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <div className="side-foot">
            <p>
              Cykel {status.cycle || '—'} · {pct}% denna runda
            </p>
            <p>
              {status.lastUpdate
                ? `Uppdaterad ${new Date(status.lastUpdate).toLocaleTimeString('sv-SE')}`
                : 'Väntar på första batch…'}
            </p>
            <p className="disclaimer">
              Ej investeringsrådgivning. Kontinuerlig screening via Yahoo Finance.
            </p>
          </div>
        </aside>

        <main className="main">
          <div className="main-head">
            <h1>
              {tab === 'undervalued'
                ? 'Undervärderade bolag'
                : tab === 'neutral'
                  ? 'Neutral rating'
                  : tab === 'underweight'
                    ? 'Underweight'
                    : 'Research-universum'}
            </h1>
            <p>
              Systemet scannar USA, UK och Sverige i bakgrunden och uppdaterar listan löpande med
              rating och motivering.
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <p>
                {results.length === 0
                  ? 'Live-screening startar… första resultaten dyker upp inom några sekunder.'
                  : 'Inga bolag matchar filtret just nu. Byt vy eller vänta på nästa batch.'}
              </p>
              {status.currentSymbols.length > 0 && (
                <p className="scanning-now">Nu: {status.currentSymbols.join(' · ')}</p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>Bolag</th>
                    <th>Mkt</th>
                    <th>Rating</th>
                    <th>Kurs</th>
                    <th>Fair value</th>
                    <th>Uppsida</th>
                    <th>P/E</th>
                    <th>Score</th>
                    <th>Varför (kort)</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => (
                    <tr
                      key={a.symbol}
                      className={selected === a.symbol ? 'selected' : ''}
                      onClick={() => setSelected(a.symbol)}
                    >
                      <td>
                        <strong>{a.name}</strong>
                        <span>{a.symbol}</span>
                      </td>
                      <td>{marketOf(a.symbol)}</td>
                      <td>
                        <span className={`chip chip-${a.rating}`}>{a.ratingLabel}</span>
                      </td>
                      <td>{fmtPrice(a.price, a.currency)}</td>
                      <td>{fmtPrice(a.fairValue, a.currency)}</td>
                      <td className={a.upsidePct && a.upsidePct > 0 ? 'pos' : a.upsidePct && a.upsidePct < 0 ? 'neg' : ''}>
                        {a.upsidePct != null
                          ? `${a.upsidePct > 0 ? '+' : ''}${fmtNum(a.upsidePct, 1)}%`
                          : '—'}
                      </td>
                      <td>{fmtNum(a.metrics.pe)}</td>
                      <td>
                        <div className="score-cell">
                          <span>{fmtNum(a.scorePct, 0)}%</span>
                          <i style={{ width: `${Math.min(100, a.scorePct)}%` }} />
                        </div>
                      </td>
                      <td className="why">
                        {a.reasons[0] || a.thesis.slice(0, 90) || '—'}
                        {a.reasons[0] ? '' : a.thesis.length > 90 ? '…' : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {selectedRow && (
          <DetailPanel a={selectedRow} onClose={() => setSelected(null)} />
        )}
      </div>
    </div>
  )
}
