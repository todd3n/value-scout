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
    <aside className="detail" aria-label="Bolagsdetalj">
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
        <span className="chip chip-muted">Tillförlitlighet {a.conviction}</span>
      </div>

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
          <span>Största endagsfall</span>
          <strong className="neg">{fmtNum(a.maxDayDropPct, 1)}%</strong>
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
        <h3>Orsak till rörelsen</h3>
        <p>{a.dropReason}</p>
        <p className="fine">{a.dropReasonSource}</p>
      </section>

      <section className="detail-block">
        <h3>Bedömning</h3>
        <p>{a.thesis}</p>
      </section>

      {a.news.length > 0 && (
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
      ? status.currentSymbols.join(', ')
      : status.phase === 'cycle-pause'
        ? 'Väntar till nästa runda'
        : status.phase === 'error'
          ? status.lastError || 'Fel'
          : status.running
            ? 'Aktiv'
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
            <strong>{status.running ? 'Aktiv' : 'Stoppad'}</strong>
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
            <strong>
              {universeSize}
              <small>
                {' '}
                US {counts.usa} · UK {counts.uk} · SE {counts.se}
              </small>
            </strong>
          </div>
          <div>
            <span>Analyserade</span>
            <strong>
              {results.length}/{universeSize}
            </strong>
          </div>
        </div>

        <button type="button" className="bar-btn" onClick={() => setRunning(!status.running)}>
          {status.running ? 'Stoppa' : 'Starta'}
        </button>
      </header>

      <div className="progress-track" aria-hidden>
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="workspace">
        <aside className="sidebar">
          <p className="side-label">Kriterier</p>
          <p className="rule-box">
            Large caps med nedgång om ca 5–10 %, dokumenterad orsak (utdelning, rapport eller
            nyhet) och återhämtningspotential om minst 5 %. Signalerna är ovanliga.
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
              Runda {status.cycle || '—'} · {pct}%
            </p>
            <p>
              {status.lastUpdate
                ? `Uppdaterad ${new Date(status.lastUpdate).toLocaleTimeString('sv-SE')}`
                : 'Hämtar data…'}
            </p>
            <p className="disclaimer">
              Kurs- och bolagsdata från Yahoo Finance. Återhämtningsnivå beräknas lokalt. Ingen
              investeringsrådgivning.
            </p>
          </div>
        </aside>

        <main className="main">
          <div className="main-head">
            <h1>
              {tab === 'sniper' ? 'Köplägen' : tab === 'watch' ? 'Bevakning' : 'Alla bolag'}
            </h1>
            <p>
              {universeSize} bolag · USA, Storbritannien och Sverige · löpande uppdatering
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="empty">
              <p>
                {tab === 'sniper'
                  ? results.length === 0
                    ? 'Analys pågår. Resultat visas när data finns.'
                    : 'Inga köplägen för tillfället.'
                  : 'Inga poster i listan.'}
              </p>
              {status.currentSymbols.length > 0 && (
                <p className="scanning-now">{status.currentSymbols.join(' · ')}</p>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="grid">
                <thead>
                  <tr>
                    <th>Bolag</th>
                    <th>Mkt</th>
                    <th>Status</th>
                    <th>Nedgång</th>
                    <th>Uppsida</th>
                    <th>Orsak</th>
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
                      <td className="src">{a.dropReasonSource}</td>
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
