import assert from 'node:assert/strict'

const store = new Map()
globalThis.localStorage = { getItem: (key) => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) }
const responses = []
globalThis.fetch = async (url, options = {}) => {
  responses.push({ url, options })
  if (options.method === 'PUT') return { ok: true, json: async () => ({ ok: true }) }
  return { ok: true, json: async () => ({ trades: [{ id: 'remote-1', openedAt: '2026-08-17T10:00:00.000Z' }], events: [] }) }
}

const { getPaperInstallationId, loadPaperHistory, savePaperHistory } = await import('../src/api/client.ts')
const { mergePaperHistory } = await import('../src/lib/portfolio.ts')

const installationId = getPaperInstallationId()
assert.match(installationId, /^[A-Za-z0-9_-]{16,128}$/)
const loaded = await loadPaperHistory()
assert.equal(loaded.trades[0].id, 'remote-1')
assert.equal(await savePaperHistory([], []), true)
assert.equal(responses.filter((item) => item.options.method === 'PUT').length, 1)

const remote = { trades: [{ id: 't1', openedAt: '2026-08-17T10:00:00.000Z', status: 'open' }], events: [] }
const staleLocal = { trades: [{ id: 't1', openedAt: '2026-08-17T09:00:00.000Z', status: 'closed' }], events: [] }
assert.equal(mergePaperHistory(remote, staleLocal).trades[0].status, 'open')
const newerLocal = { trades: [{ id: 't1', openedAt: '2026-08-17T11:00:00.000Z', status: 'closed' }], events: [] }
assert.equal(mergePaperHistory(remote, newerLocal).trades[0].status, 'closed')
console.log('paper-history-test: passed for installation id, load/save transport, offline-safe fallback contract, and stale-data merge')
