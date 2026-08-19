import assert from 'node:assert/strict'
import { scanSymbols } from '../src/api/client.ts'

const fallbackPayload = {
  results: [{ symbol: 'AAPL' }],
  fetchedAt: '2026-08-17T00:00:00.000Z',
}

const originalFetch = globalThis.fetch
try {
  for (const apiFailure of ['status', 'network', 'timeout']) {
    globalThis.fetch = async (url) => {
      if (String(url).includes('/api/value-scout/scan')) {
        if (apiFailure === 'network') throw new Error('offline')
        if (apiFailure === 'timeout') throw new DOMException('The operation timed out', 'TimeoutError')
        return new Response('upstream unavailable', { status: 503 })
      }
      if (String(url).includes('/data.json')) {
        return new Response(JSON.stringify(fallbackPayload), { status: 200 })
      }
      throw new Error(`unexpected URL ${url}`)
    }
    const response = await scanSymbols(['AAPL'], 500000, 2)
    assert.equal(response.results[0].symbol, 'AAPL')
  }
  console.log('fallback-test: passed for 503, network failure, and timeout')
} finally {
  globalThis.fetch = originalFetch
}
