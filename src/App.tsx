import { useMemo, useState } from 'react'
import type { Analysis } from './api/client'
import { useLiveScanner } from './hooks/useLiveScanner'
import { WATCHLISTS } from './data/watchlists'
import './App.css'

type Tab = 'sniper' | 'watch' | 'all'

function fmtNum(n: number | null | undefined, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('sv-SE', { maximumFractionDigits: digits })
}

function fmtPrice(n: number | null | undefined, currency: string) {
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

function DetailPanel({ a, onClose }: { a: Analysis; onClose: () => void }) {
  return (
    <aside className="detail" aria-label="Sniper-analys">
      <div className="detail-top">
        <div>
          <p className="detail-kicker">
            {a.symbol} · {marketOf(a.symbol)}
          </p>
          <h2>{a.name}</h2>
          <p className="detail-sub">{[a.sector, a.industry].filter(Boolean).join(' · ') || '—'}</p>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng">
          ×
        </button>
      </div>

      <div className="detail-rating">
        <span className={`chip chip-${a.setup}`}>{a.setupLabel}</span>
        <span className="chip chip-muted">Conviction {a.conviction}</span>
      </div>

      <div className="detail-kpis">
        <div>
          <span>Kurs</span>
          <strong>{fmtPrice(a.price, a.currency)}</strong>
        </div>
        <div>
          <span>Dag</span>
          <strong className={(a.dayChangePct ?? 0) < 0 ? 'neg' : 'pos'}>
            {a.dayChangePct != null ? `${fmtNum(a.dayChangePct, 2)}%` : '—'}
          </strong>
        </div>
        <div>
          <span>Max endagsfall</span>
          <strong className="neg">{fmtNum(a.maxDayDropPct, 1)}%</strong>
        </div>
        <div>
          <span>Bounce-mål</span>
          <strong>{fmtPrice(a.bounceTarget, a.currency)}</strong>
        </div>
        <div>
          <span>Uppsida till bounce</span>
          <strong className="pos">
            {a.bounceUpsidePct != null ? `+${fmtNum(a.bounceUpsidePct, 1)}%` : '—'}
          </strong>
        </div>
        <div>
          <span>Street-mål (lång)</span>
          <strong>{fmtPrice(a.streetTarget, a.currency)}</strong>
        </div>
      </div>

      <section className="detail-block highlight">
        <h3>Varför dippade den?</h3>
        <p>{a.dropReason}</p>
        <p className="fine">Källa: {a.dropReasonSource}</p>
      </section>

      <section className="detail-block">
        <h3>Thesis</h3>
        <p>{a.thesis}</p>
      </section>

      {a.news.length > 0 && (
        <section className="detail-block">
          <h3>Nyheter (Yahoo)</h3>
          <ul className="news">
            {a.news.map((n) => (
              <li key={n.title}>
                {n.link ? (
                  <a href={n.link} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                ) : (
                  n.title
                )}
                <span>{n.publisher}</span>
              </li>
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
        <h3>Varifrån kommer siffrorna?</h3>
        <ul className="sources">
          {a.sources.map((s) => (
            <li key={s.field}>
              <strong>{s.field}</strong>
              <span>
                {s.source} — {s.detail}
              </span>
            </li>
          ))}
        </ul>
        {a.fairValueMethod && <p className="fine">{a.fairValueMethod}</p>}
      </section>

      {a.setup === 'sniper' && (
        <section className="detail-block">
          <h3>Föreslagen sniper-size</h3>
          <p className="position">
            {fmtMoney(a.suggestedAmount, a.currency === 'GBp' ? 'GBP' : a.currency)} · {a.positionPct}%
            {a.suggestedShares > 0 ? ` · ${a.suggestedShares} st` : ''}
          </p>
        </section>
      )}

      <section className="detail-block">
        <h3>Score-detalj</h3>
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
  const [tab, setTab] = useState<Tab>('sniper')
  const [market, setMarket] = useState<'all' | 'US' | 'UK' | 'SE'>('all')
  const [selected, setSelected] = useState<string | null>(null)
  const [q, setQ] = useState('')

  const { results, status, setRunning, universeSize } = useLiveScanner(portfolio, risk)

  const counts = useMemo(
    () => ({
      sniper: results.filter((a) => a.setup === 'sniper').length,
      watch: results.filter((a) => a.setup === 'watch').length,
      usa: WATCHLISTS.usa.length,
      uk: WATCHLISTS.uk.length,
      se: WATCHLISTS.sweden.length,
    }),
    [results],
  )

  const filtered = useMemo(() => {
    let list = results.filter((a) => a.setup !== 'error')
    if (market !== 'all') list = list.filter((a) => marketOf(a.symbol) === market)
    if (tab === 'sniper') list = list.filter((a) => a.setup === 'sniper')
    if (tab === 'watch') list = list.filter((a) => a.setup === 'watch')
    if (q.trim()) {
      const s = q.trim().toLowerCase()
      list = list.filter(
        (a) =>
          a.symbol.toLowerCase().includes(s) ||
          a.name.toLowerCase().includes(s) ||
          a.dropReason.toLowerCase().includes(s),
      )
    }
    return list
  }, [results, tab, market, q])

  const selectedRow = results.find((a) => a.symbol === selected) ?? null
  const pct =
    status.totalInCycle > 0 ? Math.round((status.doneInCycle / status.totalInCycle) * 100) : 0

  const liveLabel =
    status.phase === 'scanning'
      ? `Scannar ${status.currentSymbols.join(', ')}`
      : status.phase === 'cycle-pause'
        ? 'Cykel klar — söker vidare snart'
        : status.phase === 'error'
          ? `Fel: ${status.lastError}`
          : status.running
            ? 'Standby'
            : 'Pausad'

  return (
    <div className={`shell ${selectedRow ? 'has-detail' : ''}`}>
      <header className="topbar">
        <div className="brand-block">
          <span className="mark" aria-hidden />
          <div>
            <strong>Value Scout</strong>
            <span>Sniper desk · large-cap dips</span>
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
            <span>Sniper nu</span>
            <strong>{counts.sniper}</strong>
          </div>
          <div>
            <span>Bevaka</span>
            <strong>{counts.watch}</strong>
          </div>
          <div>
            <span>Universe</span>
            <strong>
              {universeSize}
              <small>
                {' '}
                ({counts.usa}/{counts.uk}/{counts.se})
              </small>
            </strong>
          </div>
          <div>
            <span>Täckning</span>
            <strong>
              {results.length}/{universeSize}
            </strong>
          </div>
        </div>

        <button type="button" className="bar-btn" onClick={() => setRunning(!status.running)}>
          {status.running ? 'Pausa' : 'Starta'}
        </button>
      </header>

      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <p className="side-label">Sniper-regel</p>
          <p className="rule-box">
            Stora stabila bolag som tappat ca <strong>5–10%</strong> på kort tid, med{' '}
            <strong>skriven orsak</strong> (t.ex. ex-div, rapportöverreaktion, nyhet). Mål: möjlig
            studs ≈ <strong>5%+</strong> på ca en vecka. De flesta dagar: noll lägen.
          </p>

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
            Risk per sniper (%)
            <input
              type="number"
              min={0.5}
              max={4}
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
            <button
              type="button"
              className={tab === 'sniper' ? 'on' : ''}
              onClick={() => setTab('sniper')}
            >
              Sniper-lägen <em>{counts.sniper}</em>
            </button>
            <button
              type="button"
              className={tab === 'watch' ? 'on' : ''}
              onClick={() => setTab('watch')}
            >
              Bevaka <em>{counts.watch}</em>
            </button>
            <button type="button" className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              Alla scannade <em>{results.length}</em>
            </button>
          </nav>

          <label className="field">
            Sök
            <input
              type="search"
              placeholder="Ticker eller orsak…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <div className="side-foot">
            <p>
              Cykel {status.cycle || '—'} · {pct}%
            </p>
            <p>
              {status.lastUpdate
                ? `Senast ${new Date(status.lastUpdate).toLocaleTimeString('sv-SE')}`
                : 'Första batch pågår…'}
            </p>
            <p className="disclaimer">
              Data: Yahoo Finance (pris, chart, kalender, nyheter). Bounce-mål = egen beräkning.
              Ej rådgivning — sällsynta setups.
            </p>
          </div>
        </aside>

        <main className="main">
          <div className="main-head">
            <h1>
              {tab === 'sniper'
                ? 'Aktiva sniper-lägen'
                : tab === 'watch'
                  ? 'Bevaka (ofullständig edge)'
                  : 'Hela universe-status'}
            </h1>
            <p>
              Botten går kontinuerligt igenom {universeSize} large/mid-caps (100 USA · 100 UK · 100
              SE). Visar bara case när dip + orsak + bounce-potential finns.
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <p>
                {tab === 'sniper'
                  ? results.length === 0
                    ? 'Live-scan startar… sniper-lägen dyker bara upp när något faktiskt dippat med förklaring.'
                    : 'Inga sniper-lägen just nu — det är normalt. Systemet fortsätter leta.'
                  : 'Inga rader i denna vy ännu.'}
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
                    <th>Läge</th>
                    <th>Dip</th>
                    <th>Bounce</th>
                    <th>Varför</th>
                    <th>Källa</th>
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
                        <span className={`chip chip-${a.setup}`}>{a.setupLabel}</span>
                      </td>
                      <td className="neg">
                        {fmtNum(
                          Math.min(a.dayChangePct ?? 0, a.maxDayDropPct ?? 0, a.weekDrawdownPct ?? 0),
                          1,
                        )}
                        %
                      </td>
                      <td className="pos">
                        {a.bounceUpsidePct != null ? `+${fmtNum(a.bounceUpsidePct, 1)}%` : '—'}
                      </td>
                      <td className="why">{a.dropReason}</td>
                      <td className="src">{a.dropReasonSource.split('→')[0]?.trim() || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>

        {selectedRow && <DetailPanel a={selectedRow} onClose={() => setSelected(null)} />}
      </div>
    </div>
  )
}
