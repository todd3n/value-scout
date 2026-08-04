import { useCallback, useEffect, useRef, useState } from 'react'
import { scanSymbols, type Analysis } from '../api/client'
import { resolveWatchlist } from '../data/watchlists'

const BATCH = 8
const PAUSE_BETWEEN_BATCH_MS = 1200
const CYCLE_PAUSE_MS = 8000
const STORAGE_KEY = 'vs-live-cache-v1'

export type ScannerStatus = {
  running: boolean
  phase: 'idle' | 'scanning' | 'cycle-pause' | 'error'
  currentSymbols: string[]
  doneInCycle: number
  totalInCycle: number
  cycle: number
  lastError: string | null
  lastUpdate: string | null
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
    /* ignore quota */
  }
}

function mergeResults(prev: Analysis[], incoming: Analysis[]): Analysis[] {
  const map = new Map(prev.map((a) => [a.symbol, a]))
  for (const a of incoming) map.set(a.symbol, a)
  const rank = (r: Analysis['rating']) =>
    r === 'overweight' ? 3 : r === 'neutral' ? 2 : r === 'underweight' ? 1 : 0
  return [...map.values()].sort((a, b) => {
    const d = rank(b.rating) - rank(a.rating)
    if (d !== 0) return d
    return b.scorePct - a.scorePct
  })
}

export function useLiveScanner(portfolio: number, risk: number) {
  const [results, setResults] = useState<Analysis[]>(() =>
    typeof window !== 'undefined' ? loadCache() : [],
  )
  const [status, setStatus] = useState<ScannerStatus>({
    running: true,
    phase: 'idle',
    currentSymbols: [],
    doneInCycle: 0,
    totalInCycle: resolveWatchlist('all').length,
    cycle: 0,
    lastError: null,
    lastUpdate: null,
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
    const universe = resolveWatchlist('all').map((w) => w.symbol)

    async function sleep(ms: number) {
      await new Promise((r) => setTimeout(r, ms))
    }

    async function loop() {
      let cycle = 0
      while (abortRef.current === runId) {
        if (!runningRef.current) {
          setStatus((s) => ({ ...s, phase: 'idle', currentSymbols: [] }))
          await sleep(500)
          continue
        }

        cycle += 1
        let done = 0
        setStatus((s) => ({
          ...s,
          phase: 'scanning',
          cycle,
          doneInCycle: 0,
          totalInCycle: universe.length,
          lastError: null,
        }))

        for (let i = 0; i < universe.length; i += BATCH) {
          if (abortRef.current !== runId) return
          while (!runningRef.current && abortRef.current === runId) {
            setStatus((s) => ({ ...s, phase: 'idle', currentSymbols: [] }))
            await sleep(400)
          }
          if (abortRef.current !== runId) return

          const batch = universe.slice(i, i + BATCH)
          setStatus((s) => ({
            ...s,
            phase: 'scanning',
            currentSymbols: batch,
            doneInCycle: done,
            cycle,
          }))

          try {
            const data = await scanSymbols(
              batch,
              portfolioRef.current,
              riskRef.current,
            )
            if (abortRef.current !== runId) return
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
            await sleep(4000)
          }

          await sleep(PAUSE_BETWEEN_BATCH_MS)
        }

        if (abortRef.current !== runId) return
        setStatus((s) => ({
          ...s,
          phase: 'cycle-pause',
          currentSymbols: [],
          doneInCycle: universe.length,
        }))
        await sleep(CYCLE_PAUSE_MS)
      }
    }

    void loop()
    return () => {
      abortRef.current += 1
    }
  }, [])

  return { results, status, setRunning }
}
