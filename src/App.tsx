import { useMemo, useState } from 'react'
import { scanSymbols, type Analysis } from './api/client'
import { resolveWatchlist, type ListKey } from './data/watchlists'
import './App.css'

function fmtMoney(n: number, currency = 'SEK') {
  const c = currency === 'GBp' ? 'GBP' : currency
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

function fmtNum(n: number | null, digits = 1) {
  if (n == null || !Number.isFinite(n)) return '—'
  return n.toLocaleString('sv-SE', { maximumFractionDigits: digits })
}

function fmtCap(n: number | null, currency: string) {
  if (n == null) return '—'
  const abs = Math.abs(n)
  const c = currency === 'GBp' ? 'GBP' : currency
  if (abs >= 1e12) return `${(n / 1e12).toFixed(2)} T ${c}`
  if (abs >= 1e9) return `${(n / 1e9).toFixed(1)} B ${c}`
  if (abs >= 1e6) return `${(n / 1e6).toFixed(0)} M ${c}`
  return fmtMoney(n, c)
}

function ResearchNote({ a }: { a: Analysis }) {
  const [open, setOpen] = useState(false)
  return (
    <article className={`note rating-${a.rating}`}>
      <header className="note-head">
        <div>
          <div className="note-title-row">
            <h3>{a.name}</h3>
            <span className={`rating-pill rating-${a.rating}`}>{a.ratingLabel}</span>
          </div>
          <p className="meta">
            <code>{a.symbol}</code>
            {a.sector ? ` · ${a.sector}` : ''}
            {a.industry ? ` · ${a.industry}` : ''}
            {' · '}conviction {a.conviction}
            {' · '}data {a.dataQuality}%
          </p>
        </div>
      </header>

      {a.error ? (
        <p className="error-msg">{a.error}</p>
      ) : (
        <>
          <div className="kpi-grid">
            <div>
              <span className="label">Kurs</span>
              <strong>
                {a.price != null ? `${fmtNum(a.price, 2)} ${a.currency}` : '—'}
              </strong>
            </div>
            <div>
              <span className="label">Fair value</span>
              <strong>
                {a.fairValue != null ? `${fmtNum(a.fairValue, 2)} ${a.currency}` : '—'}
              </strong>
            </div>
            <div>
              <span className="label">Uppsida / nedsida</span>
              <strong className={a.upsidePct != null && a.upsidePct > 0 ? 'pos' : a.upsidePct != null && a.upsidePct < 0 ? 'neg' : ''}>
                {a.upsidePct != null ? `${a.upsidePct > 0 ? '+' : ''}${fmtNum(a.upsidePct, 1)}%` : '—'}
              </strong>
            </div>
            <div>
              <span className="label">Model score</span>
              <strong>
                {fmtNum(a.scorePct, 1)}%
              </strong>
            </div>
            <div>
              <span className="label">P/E · Fwd</span>
              <strong>
                {fmtNum(a.metrics.pe)} · {fmtNum(a.metrics.forwardPe)}
              </strong>
            </div>
            <div>
              <span className="label">EV/EBITDA · P/B</span>
              <strong>
                {fmtNum(a.metrics.evEbitda)} · {fmtNum(a.metrics.pb)}
              </strong>
            </div>
            <div>
              <span className="label">Market cap</span>
              <strong>{fmtCap(a.marketCap, a.currency)}</strong>
            </div>
            <div>
              <span className="label">Position (modell)</span>
              <strong>
                {fmtMoney(a.suggestedAmount, a.currency === 'SEK' ? 'SEK' : a.currency === 'GBp' ? 'GBP' : a.currency)}
              </strong>
              <span className="hint">{a.positionPct}% · {a.suggestedShares} st</span>
            </div>
          </div>

          {a.thesis && <p className="thesis">{a.thesis}</p>}

          {(a.catalysts.length > 0 || a.risks.length > 0 || a.reasons.length > 0) && (
            <div className="callouts">
              {a.reasons.map((r) => (
                <span key={r} className="tag good">
                  {r}
                </span>
              ))}
              {a.catalysts.map((c) => (
                <span key={c} className="tag catalyst">
                  {c}
                </span>
              ))}
              {a.risks.map((r) => (
                <span key={r} className="tag bad">
                  {r}
                </span>
              ))}
            </div>
          )}

          <button type="button" className="linkish" onClick={() => setOpen((v) => !v)}>
            {open ? 'Dölj factor-modell' : 'Visa factor-modell & metod'}
          </button>
          {open && (
            <div className="model-detail">
              {a.fairValueMethod && (
                <p className="method-line">
                  <strong>Fair value:</strong> {a.fairValueMethod}
                </p>
              )}
              <ul className="breakdown">
                {a.breakdown.map((b) => (
                  <li key={b.key}>
                    <span>
                      {b.label}{' '}
                      <em>
                        {b.points}/{b.max}
                      </em>
                    </span>
                    <span className="note-text">{b.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </article>
  )
}

export default function App() {
  const [listKey, setListKey] = useState<ListKey>('all')
  const [custom, setCustom] = useState('')
  const [portfolio, setPortfolio] = useState(500_000)
  const [risk, setRisk] = useState(2)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [results, setResults] = useState<Analysis[] | null>(null)
  const [fetchedAt, setFetchedAt] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'overweight' | 'neutral' | 'underweight'>('all')

  const universe = useMemo(() => resolveWatchlist(listKey), [listKey])

  const symbols = useMemo(() => {
    const fromList = universe.map((w) => w.symbol)
    const extra = custom
      .split(/[\s,;]+/)
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean)
    return [...new Set([...fromList, ...extra])]
  }, [universe, custom])

  async function runScan() {
    setLoading(true)
    setError(null)
    setProgress('Initierar research-pipeline…')
    try {
      const data = await scanSymbols(symbols, portfolio, risk, (done, total) => {
        setProgress(`Analyserar ${done}/${total} bolag…`)
      })
      setResults(data.results)
      setFetchedAt(data.fetchedAt)
      setProgress(null)
      setFilter('all')
    } catch (e) {
      setResults(null)
      setError(e instanceof Error ? e.message : 'Något gick fel')
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  const filtered =
    results?.filter((r) => (filter === 'all' ? true : r.rating === filter)) ?? []
  const ow = results?.filter((r) => r.rating === 'overweight').length ?? 0
  const neu = results?.filter((r) => r.rating === 'neutral').length ?? 0
  const uw = results?.filter((r) => r.rating === 'underweight').length ?? 0

  return (
    <div className="app">
      <header className="hero">
        <p className="brand">Value Scout</p>
        <p className="desk">Equity Research Desk · USA · UK · Sverige</p>
        <h1>Institutionell screening av undervärderade storbolag</h1>
        <p className="lede">
          Multi-faktoranalys i stil med sell-side research: Overweight / Neutral / Underweight,
          fair value, investment thesis och modellbaserad position. Data från Yahoo Finance —
          inte personlig rådgivning.
        </p>
        <div className="hero-cta">
          <a href="#scan" className="btn primary">
            Kör full research-scan
          </a>
          <a href="#method" className="btn ghost">
            Metodik
          </a>
        </div>
      </header>

      <aside className="disclaimer" role="note">
        <strong>Disclaimer:</strong> Detta är ett kvantitativt analysverktyg, inte
        investeringsrådgivning från JPMorgan eller någon bank. Modellen kan ta fel. Gör egen
        due diligence.
      </aside>

      <section id="scan" className="panel">
        <h2>Research universe</h2>
        <p className="section-lede">
          OMXS30, stora FTSE 100-namn och amerikanska large caps. Full scan tar några minuter —
          resultaten rankas efter rating och model score.
        </p>

        <div className="controls">
          <label>
            Marknad
            <select
              value={listKey}
              onChange={(e) => setListKey(e.target.value as ListKey)}
            >
              <option value="all">Alla — USA + UK + Sverige ({resolveWatchlist('all').length})</option>
              <option value="usa">USA large cap ({resolveWatchlist('usa').length})</option>
              <option value="uk">UK / FTSE ({resolveWatchlist('uk').length})</option>
              <option value="sweden">Sverige / OMXS30 ({resolveWatchlist('sweden').length})</option>
            </select>
          </label>
          <label>
            Portfölj (SEK)
            <input
              type="number"
              min={1000}
              step={10000}
              value={portfolio}
              onChange={(e) => setPortfolio(Number(e.target.value) || 0)}
            />
          </label>
          <label>
            Riskbudget (% / namn)
            <input
              type="number"
              min={0.5}
              max={5}
              step={0.5}
              value={risk}
              onChange={(e) => setRisk(Number(e.target.value) || 1)}
            />
          </label>
          <label className="span-2">
            Egna tickers (Yahoo)
            <input
              type="text"
              placeholder="t.ex. AAPL, SHEL.L, VOLV-B.ST"
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
            />
          </label>
        </div>

        <p className="ticker-preview">
          Universe: <strong>{symbols.length}</strong> tickers
          {listKey === 'all'
            ? ' (batchas automatiskt för stabil Yahoo-hämtning)'
            : ''}
        </p>

        <button type="button" className="btn primary" disabled={loading} onClick={runScan}>
          {loading ? progress || 'Kör analys…' : 'Publicera research-scan'}
        </button>
        {progress && !error && <p className="progress">{progress}</p>}
        {error && <p className="error-msg">{error}</p>}
      </section>

      {results && (
        <section className="results">
          <div className="results-head">
            <div>
              <h2>Research output</h2>
              {fetchedAt && (
                <p className="meta">
                  As of {new Date(fetchedAt).toLocaleString('sv-SE')} · {results.length} namn
                </p>
              )}
            </div>
            <div className="summary-pills">
              <button
                type="button"
                className={filter === 'all' ? 'active' : ''}
                onClick={() => setFilter('all')}
              >
                Alla {results.length}
              </button>
              <button
                type="button"
                className={filter === 'overweight' ? 'active ow' : 'ow'}
                onClick={() => setFilter('overweight')}
              >
                Overweight {ow}
              </button>
              <button
                type="button"
                className={filter === 'neutral' ? 'active' : ''}
                onClick={() => setFilter('neutral')}
              >
                Neutral {neu}
              </button>
              <button
                type="button"
                className={filter === 'underweight' ? 'active uw' : 'uw'}
                onClick={() => setFilter('underweight')}
              >
                Underweight {uw}
              </button>
            </div>
          </div>

          {filter === 'overweight' && ow === 0 && (
            <p className="empty-filter">Inga Overweight i denna scan — prova lägre filter eller annan marknad.</p>
          )}

          <div className="notes">
            {filtered.map((a) => (
              <ResearchNote key={a.symbol} a={a} />
            ))}
          </div>
        </section>
      )}

      <section id="method" className="method">
        <h2>Metodik (factor-modell)</h2>
        <p>
          Vi viktar trailing/forward P/E, PEG, EV/EBITDA, P/B, FCF-yield, ROE/marginaler,
          balansräkning, tillväxt, street-konsensus och 52-veckorsläge. Fair value blendas från
          analytikermål och normaliserad forward-EPS när data finns. Rating:
          <strong> Overweight</strong> (undervärderad), <strong>Neutral</strong>,{' '}
          <strong>Underweight</strong>. Position sizing skalas med conviction och data quality —
          cap ~10% av portfölj.
        </p>
        <p className="section-lede" style={{ marginTop: '1rem' }}>
          Ramverket speglar hur en disciplined sell-side-analytiker tänker kring risk/reward —
          men ersätter inte fundamental deep-dive, management-möten eller egen scenarioanalys.
        </p>
      </section>

      <section className="guide">
        <h2>Kapitalallokering i praktiken</h2>
        <ol className="steps">
          <li>
            <h3>1. Buffert &amp; ISK</h3>
            <p>2–3 månaders buffert, därefter ISK hos Avanza/Nordnet. Lång horisont (5–10+ år).</p>
          </li>
          <li>
            <h3>2. Core i index, satellite i stock-picks</h3>
            <p>
              Majoriteten i bred global indexfond; Overweight-namn som satelliter med strikt
              positionsstorlek.
            </p>
          </li>
          <li>
            <h3>3. DCA &amp; diversifiering</h3>
            <p>Månadsspara. 10–15 bolag över sektorer om du kör aktier — undvik concentration risk.</p>
          </li>
        </ol>
      </section>

      <footer className="footer">
        <p>Value Scout Research · Yahoo Finance · ej rådgivning · ej affiliated med JPMorgan</p>
      </footer>
    </div>
  )
}
