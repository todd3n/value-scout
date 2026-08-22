import assert from 'node:assert/strict'
import { scanSymbols } from '../src/api/client.ts'
import { normalizeScannerDropLabel } from '../src/lib/scannerDate.ts'

const fallbackPayload = {
  results: [{ symbol: 'AAPL' }],
  fetchedAt: '2026-08-17T00:00:00.000Z',
}

const originalFetch = globalThis.fetch
try {
  const cachedWeekendResult = normalizeScannerDropLabel({
    symbol: 'WMT',
    maxDayDropDate: '2026-08-20T13:30:00.000Z',
    dropWhenLabel: '-9,2 % 20 aug. (i går)',
  }, new Date('2026-08-22T12:00:00.000Z'))
  assert.equal(cachedWeekendResult.dropWhenLabel, '-9,2 % 20 aug. (för 1 handelsdag sedan)')
  for (const apiFailure of ['status', 'network', 'timeout']) {
    let scanRequest
    globalThis.fetch = async (url, options) => {
      if (String(url).includes('/api/value-scout/scan')) {
        scanRequest = options
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
    assert.equal(response.delivery, 'fallback')
    assert.match(response.source, /Fallbacksnapshot/)
    assert.equal(scanRequest?.headers, undefined, 'scananrop ska inte trigga CORS-preflight med specialheaders')
  }
  console.log('fallback-test: passed for 503, network failure, timeout, and cached weekend labels')
} finally {
  globalThis.fetch = originalFetch
}
