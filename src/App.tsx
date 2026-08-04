import { useMemo, useState } from 'react'
import type { Analysis } from './api/client'
import { yahooUrlFor } from './api/client'
import { useLiveScanner } from './hooks/useLiveScanner'
import { PriceChart } from './components/PriceChart'
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
    <aside className="detail" aria-label="Bolagsdetalj">
      <div className="detail-top">
        <div>
          <p className="detail-kicker">
            {a.symbol} · {marketOf(a.symbol)}
          </p>
          <h2>{a.name}</h2>
          <p className="detail-sub">{[a.sector, a.industry].filter(Boolean).join(' · ') || '—'}</p>
          <a
            className="yahoo-link"
            href={a.yahooUrl || yahooUrlFor(a.symbol)}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
          >
            Öppna på Yahoo Finance
          </a>
        </div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="Stäng">
          ×
        </button>
      </div>

      <div className="detail-rating">
        <span className={`chip chip-${a.setup}`}>{a.setupLabel}</span>
        {a.dropWhenLabel && <span className="chip chip-muted">{a.dropWhenLabel}</span>}
      </div>

      <section className="detail-block chart-block">
        <h3>Kurs · 30 handelsdagar</h3>
        <PriceChart
          points={a.chart || []}
          dropDate={a.maxDayDropDate}
          bounceTarget={a.bounceTarget}
          currency={a.currency}
        />
        {a.bounceTarget != null && (
          <p className="fine">Streckad linje = återhämtningsnivå. Punkt = noterad nedgångsdag.</p>
        )}
      </section>

      <div className="detail-kpis">
        <div>
          <span>Kurs</span>
          <strong>{fmtPrice(a.price, a.currency)}</strong>
        </div>
        <div>
          <span>I dag</span>
          <strong className={(a.dayChangePct ?? 0) < 0 ? 'neg' : 'pos'}>
            {a.dayChangePct != null ? `${fmtNum(a.dayChangePct, 2)}%` : '—'}
          </strong>
        </div>
        <div>
          <span>Nedgång (när)</span>
          <strong className="neg">{a.dropWhenLabel || '—'}</strong>
        </div>
        <div>
          <span>Återhämtningsnivå</span>
          <strong>{fmtPrice(a.bounceTarget, a.currency)}</strong>
        </div>
        <div>
          <span>Potentiell uppsida</span>
          <strong className="pos">
            {a.bounceUpsidePct != null ? `+${fmtNum(a.bounceUpsidePct, 1)}%` : '—'}
          </strong>
        </div>
        <div>
          <span>Analytikermål</span>
          <strong>{fmtPrice(a.streetTarget, a.currency)}</strong>
        </div>
      </div>

      <section className="detail-block highlight">
        <h3>Varför eventuellt köpläge</h3>
        {(a.buyReasons?.length ?? 0) > 0 ? (
          <ul className="sourced-list">
            {a.buyReasons.map((r) => (
              <li key={r.text + r.source}>
                <span>{r.text}</span>
                <em>{r.source}</em>
              </li>
            ))}
          </ul>
        ) : (
          <p>{a.dropReason}</p>
        )}
        <p className="fine">{a.dropReasonSource}</p>
      </section>

      <section className="detail-block">
        <h3>Risker</h3>
        {(a.riskItems?.length ?? 0) > 0 ? (
          <ul className="sourced-list risks">
            {a.riskItems.map((r) => (
              <li key={r.text + r.source}>
                <span>{r.text}</span>
                <em>{r.source}</em>
              </li>
            ))}
          </ul>
        ) : a.risks.length > 0 ? (
          <ul className="risks">
            {a.risks.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        ) : (
          <p>Inga särskilda riskflaggor just nu.</p>
        )}
      </section>

      <section className="detail-block">
        <h3>Bedömning</h3>
        <p>{a.thesis}</p>
      </section>

      {(a.researchHits?.length ?? 0) > 0 && (
        <section className="detail-block">
          <h3>Källor i media</h3>
          <ul className="news">
            {a.researchHits.slice(0, 6).map((n) => (
              <li key={n.title + n.source}>
                {n.url ? (
                  <a href={n.url} target="_blank" rel="noreferrer">
                    {n.title}
                  </a>
                ) : (
                  n.title
                )}
                <span>
                  {n.source}
                  {n.kind !== 'context' ? ` · ${n.kind === 'risk' ? 'risk' : 'katalysator'}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {a.news.length > 0 && !(a.researchHits?.length > 0) && (
        <section className="detail-block">
          <h3>Nyheter</h3>
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

      <section className="detail-block">
        <h3>Datakällor</h3>
        <ul className="sources">
          {a.sources.map((s) => (
            <li key={s.field}>
              <strong>{s.field}</strong>
              <span>
                {s.source}. {s.detail}
              </span>
            </li>
          ))}
        </ul>
        {a.fairValueMethod && <p className="fine">{a.fairValueMethod}</p>}
      </section>

      {a.setup === 'sniper' && (
        <section className="detail-block">
          <h3>Föreslagen position</h3>
          <p className="position">
            {fmtMoney(a.suggestedAmount, a.currency === 'GBp' ? 'GBP' : a.currency)} · {a.positionPct}%
            {a.suggestedShares > 0 ? ` · ${a.suggestedShares} st` : ''}
          </p>
        </section>
      )}

      <section className="detail-block">
        <h3>Modellpoäng</h3>
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
      ? `Genomgång ${pct}%`
      : status.phase === 'cycle-pause'
        ? status.nextUpdateAt
          ? `Nästa ${new Date(status.nextUpdateAt).toLocaleString('sv-SE', {
              hour: '2-digit',
              minute: '2-digit',
              day: 'numeric',
              month: 'short',
            })}`
          : 'Väntar'
        : status.phase === 'error'
          ? status.lastError || 'Fel'
          : status.running
            ? 'Redo'
            : 'Stoppad'

  return (
    <div className={`shell ${selectedRow ? 'has-detail' : ''}`}>
      <header className="topbar">
        <div className="brand-block">
          <span className="mark" aria-hidden />
          <div>
            <strong>Value Scout</strong>
            <span>Marknadsbevakning</span>
          </div>
        </div>

        <div className="live-pill" data-phase={status.phase}>
          <span className="pulse" aria-hidden />
          <div>
            <strong>
              {status.phase === 'scanning'
                ? 'Genomgång'
                : status.phase === 'cycle-pause'
                  ? 'Klar'
                  : status.running
                    ? 'Aktiv'
                    : 'Stoppad'}
            </strong>
            <span>{liveLabel}</span>
          </div>
        </div>

        <div className="top-stats">
          <div>
            <span>Köplägen</span>
            <strong>{counts.sniper}</strong>
          </div>
          <div>
            <span>Bevakning</span>
            <strong>{counts.watch}</strong>
          </div>
          <div>
            <span>Urval</span>
            <strong>{universeSize}</strong>
          </div>
          <div>
            <span>Senast</span>
            <strong>
              {status.lastUpdate
                ? new Date(status.lastUpdate).toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </strong>
          </div>
        </div>

        <button type="button" className="bar-btn" onClick={() => setRunning(!status.running)}>
          {status.running ? 'Stoppa' : 'Starta'}
        </button>
      </header>

      <div className="progress-track" aria-hidden>
        <div
          className="progress-fill"
          style={{ width: status.phase === 'scanning' ? `${pct}%` : status.phase === 'cycle-pause' ? '100%' : '0%' }}
        />
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <p className="side-label">Kriterier</p>
          <p className="rule-box">
            Endast nedgångar senaste <strong>3 handelsdagarna</strong>, fortfarande nere, med
            dokumenterad orsak från kalender och nyheter (Google News, Yahoo, valfritt Finnhub).
            Max <strong>3 köplägen</strong>. Varje setup visar varför och vilka risker som finns,
            med källa.
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
            Risk per position (%)
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

          <p className="side-label">Lista</p>
          <nav className="side-nav">
            <button
              type="button"
              className={tab === 'sniper' ? 'on' : ''}
              onClick={() => setTab('sniper')}
            >
              Köplägen <em>{counts.sniper}</em>
            </button>
            <button
              type="button"
              className={tab === 'watch' ? 'on' : ''}
              onClick={() => setTab('watch')}
            >
              Bevakning <em>{counts.watch}</em>
            </button>
            <button type="button" className={tab === 'all' ? 'on' : ''} onClick={() => setTab('all')}>
              Alla <em>{results.length}</em>
            </button>
          </nav>

          <label className="field">
            Sök
            <input
              type="search"
              placeholder="Bolag eller ticker"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </label>

          <div className="side-foot">
            <p>
              {status.phase === 'scanning'
                ? `Analyserar ${status.doneInCycle}/${status.totalInCycle}`
                : status.nextUpdateAt
                  ? `Nästa genomgång ${new Date(status.nextUpdateAt).toLocaleString('sv-SE')}`
                  : '—'}
            </p>
            <p className="disclaimer">
              Kurs: Yahoo. Orsak/risk: Google News, nyckeltal (+ Finnhub om nyckel). Ingen rådgivning.
            </p>
          </div>
        </aside>

        <main className="main">
          <div className="main-head">
            <div>
              <h1>
                {tab === 'sniper' ? 'Köplägen' : tab === 'watch' ? 'Bevakning' : 'Alla bolag'}
              </h1>
              <p>
                {tab === 'sniper'
                  ? 'Färska nedgångar med datum och orsak. Tom lista är normalt.'
                  : `${universeSize} bolag · US ${counts.usa} · UK ${counts.uk} · SE ${counts.se}`}
              </p>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <p>
                {tab === 'sniper'
                  ? status.phase === 'scanning' && results.length === 0
                    ? 'Första genomgången pågår. Listan publiceras när den är klar.'
                    : 'Inga köplägen just nu.'
                  : 'Inga poster.'}
              </p>
            </div>
          ) : (
            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>Bolag</th>
                    <th>Mkt</th>
                    <th>Status</th>
                    <th>Kurs</th>
                    <th>När / nedgång</th>
                    <th>Uppsida</th>
                    <th>Orsak</th>
                    <th></th>
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
                      <td className="price-cell">
                        {fmtPrice(a.price, a.currency)}
                        <span
                          className={
                            (a.dayChangePct ?? 0) < 0
                              ? 'neg'
                              : (a.dayChangePct ?? 0) > 0
                                ? 'pos'
                                : ''
                          }
                        >
                          {a.dayChangePct != null
                            ? `${a.dayChangePct > 0 ? '+' : ''}${fmtNum(a.dayChangePct, 2)}%`
                            : ''}
                        </span>
                      </td>
                      <td className="when">{a.dropWhenLabel || '—'}</td>
                      <td className="pos">
                        {a.bounceUpsidePct != null ? `+${fmtNum(a.bounceUpsidePct, 1)}%` : '—'}
                      </td>
                      <td className="why">{a.dropReason}</td>
                      <td>
                        <a
                          className="row-yahoo"
                          href={a.yahooUrl || yahooUrlFor(a.symbol)}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                        >
                          Yahoo
                        </a>
                      </td>
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
