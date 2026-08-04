import type { ChartPoint } from '../api/client'

type Props = {
  points: ChartPoint[]
  dropDate?: string | null
  bounceTarget?: number | null
  currency?: string
}

export function PriceChart({ points, dropDate, bounceTarget }: Props) {
  if (!points.length) {
    return <p className="chart-empty">Ingen kursgraf tillgänglig.</p>
  }

  const w = 320
  const h = 120
  const pad = 8
  const values = points.map((p) => p.close)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1

  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(points.length - 1, 1)) * (w - pad * 2)
    const y = pad + (1 - (p.close - min) / span) * (h - pad * 2)
    return { x, y, ...p }
  })

  const line = coords.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(' ')
  const area = `${line} L${coords[coords.length - 1].x.toFixed(1)} ${h - pad} L${coords[0].x.toFixed(1)} ${h - pad} Z`

  const first = values[0]
  const last = values[values.length - 1]
  const up = last >= first

  let dropMark: { x: number; y: number } | null = null
  if (dropDate) {
    const t = new Date(dropDate).getTime()
    let best = 0
    let bestDiff = Infinity
    coords.forEach((c, i) => {
      const d = Math.abs(new Date(c.date).getTime() - t)
      if (d < bestDiff) {
        bestDiff = d
        best = i
      }
    })
    if (bestDiff < 3 * 86400000) dropMark = coords[best]
  }

  let bounceY: number | null = null
  if (bounceTarget != null) {
    bounceY = pad + (1 - (bounceTarget - min) / span) * (h - pad * 2)
  }

  const startLabel = new Date(points[0].date).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })
  const endLabel = new Date(points[points.length - 1].date).toLocaleDateString('sv-SE', {
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height="120" role="img" aria-label="Kursgraf">
        {bounceY != null && (
          <line
            x1={pad}
            x2={w - pad}
            y1={bounceY}
            y2={bounceY}
            stroke="#8a6d1d"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
        )}
        <path d={area} fill={up ? 'rgba(26,107,74,0.08)' : 'rgba(139,58,48,0.08)'} />
        <path d={line} fill="none" stroke={up ? '#1a6b4a' : '#8b3a30'} strokeWidth="1.75" />
        {dropMark && (
          <circle cx={dropMark.x} cy={dropMark.y} r="3.5" fill="#8b3a30" stroke="#fff" strokeWidth="1" />
        )}
      </svg>
      <div className="chart-meta">
        <span>{startLabel}</span>
        <span>
          {min.toLocaleString('sv-SE', { maximumFractionDigits: 2 })} –{' '}
          {max.toLocaleString('sv-SE', { maximumFractionDigits: 2 })}
        </span>
        <span>{endLabel}</span>
      </div>
    </div>
  )
}
