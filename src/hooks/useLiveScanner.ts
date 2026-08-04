import { useCallback, useEffect, useRef, useState } from 'react'
import { scanSymbols, type Analysis } from '../api/client'
import { resolveWatchlist } from '../data/watchlists'

const BATCH = 6
const PAUSE_BETWEEN_BATCH_MS = 1200
/** Keep scanning — short pause between full passes so values stay fresh. */
const CYCLE_PAUSE_MS = 90_000
const MAX_SNIPER = 3
const STORAGE_KEY = 'vs-sniper-v5'

export type ScannerStatus = {
  running: boolean
  phase: 'idle' | 'scanning' | 'cycle-pause' | 'error'
  currentSymbols: string[]
  doneInCycle: number
  totalInCycle: number
  cycle: number
  lastError: string | null
  lastUpdate: string | null
  nextUpdateAt: string | null
}

function loadCache(): Analysis[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as { results?: Analysis[] }
    return Array.isArray(parsed.results) ? parsed.results : []
  } catch {
    return []
  }
}

function saveCache(results: Analysis[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ results, savedAt: new Date().toISOString() }),
    )
  } catch {
    /* ignore */
  }
}

function finalize(results: Analysis[]): Analysis[] {
  const rank = (s: Analysis['setup']) =>
    s === 'sniper' ? 3 : s === 'watch' ? 2 : s === 'none' ? 1 : 0
  const sorted = [...results].sort((a, b) => {
    const d = rank(b.setup) - rank(a.setup)
    if (d !== 0) return d
    const ageA = a.dropAgeTradingDays ?? 99
    const ageB = b.dropAgeTradingDays ?? 99
    if (ageA !== ageB) return ageA - ageB
    return (a.maxDayDropPct ?? 0) - (b.maxDayDropPct ?? 0)
  })

  let sniperLeft = MAX_SNIPER
  return sorted.map((a) => {
    if (a.setup !== 'sniper') return a
    if (sniperLeft <= 0) {
      return {
        ...a,
        setup: 'watch' as const,
        setupLabel: 'Bevakning',
        rating: 'watch' as const,
        ratingLabel: 'Bevakning',
        suggestedAmount: 0,
        suggestedShares: 0,
        positionPct: 0,
      }
    }
    sniperLeft -= 1
    return a
  })
}

function mergeResults(prev: Analysis[], incoming: Analysis[]): Analysis[] {
  const map = new Map(prev.map((a) => [a.symbol, a]))
  for (const a of incoming) map.set(a.symbol, a)
  return finalize([...map.values()])
}

export function useLiveScanner(portfolio: number, risk: number) {
  const [results, setResults] = useState<Analysis[]>(() =>
    typeof window !== 'undefined' ? loadCache() : [],
  )
  const universe = resolveWatchlist('all')
  const [status, setStatus] = useState<ScannerStatus>({
    running: true,
    phase: 'idle',
    currentSymbols: [],
    doneInCycle: 0,
    totalInCycle: universe.length,
    cycle: 0,
    lastError: null,
    lastUpdate: null,
    nextUpdateAt: null,
  })

  const runningRef = useRef(true)
  const portfolioRef = useRef(portfolio)
  const riskRef = useRef(risk)
  const abortRef = useRef(0)

  useEffect(() => {
    portfolioRef.current = portfolio
    riskRef.current = risk
  }, [portfolio, risk])

  const setRunning = useCallback((on: boolean) => {
    runningRef.current = on
    setStatus((s) => ({ ...s, running: on, phase: on ? s.phase : 'idle' }))
  }, [])

  useEffect(() => {
    const runId = ++abortRef.current
    const symbols = resolveWatchlist('all').map((w) => w.symbol)

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms))
    }

    async function loop() {
      let cycle = 0
      while (abortRef.current === runId) {
        if (!runningRef.current) {
          setStatus((s) => ({ ...s, phase: 'idle', currentSymbols: [] }))
          await sleep(800)
          continue
        }

        cycle += 1
        let done = 0
        setStatus((s) => ({
          ...s,
          phase: 'scanning',
          cycle,
          doneInCycle: 0,
          totalInCycle: symbols.length,
          lastError: null,
          nextUpdateAt: null,
        }))

        for (let i = 0; i < symbols.length; i += BATCH) {
          if (abortRef.current !== runId) return
          while (!runningRef.current && abortRef.current === runId) {
            setStatus((s) => ({ ...s, phase: 'idle', currentSymbols: [] }))
            await sleep(500)
          }
          if (abortRef.current !== runId) return

          const batch = symbols.slice(i, i + BATCH)
          setStatus((s) => ({
            ...s,
            phase: 'scanning',
            currentSymbols: batch,
            doneInCycle: done,
            cycle,
          }))

          try {
            const data = await scanSymbols(batch, portfolioRef.current, riskRef.current)
            if (abortRef.current !== runId) return
            // Live-merge so kurs/graf uppdateras löpande under genomgången.
            setResults((prev) => {
              const next = mergeResults(prev, data.results)
              saveCache(next)
              return next
            })
            done += batch.length
            setStatus((s) => ({
              ...s,
              doneInCycle: done,
              lastUpdate: data.fetchedAt,
              lastError: null,
            }))
          } catch (e) {
            setStatus((s) => ({
              ...s,
              phase: 'error',
              lastError: e instanceof Error ? e.message : 'Scanfel',
            }))
            await sleep(5000)
          }

          await sleep(PAUSE_BETWEEN_BATCH_MS)
        }

        if (abortRef.current !== runId) return
        const nextAt = new Date(Date.now() + CYCLE_PAUSE_MS).toISOString()
        setStatus((s) => ({
          ...s,
          phase: 'cycle-pause',
          currentSymbols: [],
          doneInCycle: symbols.length,
          nextUpdateAt: nextAt,
        }))
        await sleep(CYCLE_PAUSE_MS)
      }
    }

    void loop()
    return () => {
      abortRef.current += 1
    }
  }, [])

  return { results, status, setRunning, universeSize: universe.length }
}
