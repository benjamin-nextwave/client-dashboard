'use client'

/* ── Fake SVG chart primitives (purely decorative, no real data) ── */

function FakeBarChart({ bars, color }: { bars: number[]; color: string }) {
  const max = Math.max(...bars)
  const barWidth = 28
  const gap = 12
  const totalWidth = bars.length * (barWidth + gap) - gap
  const height = 140

  return (
    <svg viewBox={`0 0 ${totalWidth} ${height}`} className="mx-auto w-full max-w-xs" preserveAspectRatio="xMidYMid meet">
      {bars.map((v, i) => {
        const barHeight = (v / max) * (height - 20)
        return (
          <rect
            key={i}
            x={i * (barWidth + gap)}
            y={height - barHeight}
            width={barWidth}
            height={barHeight}
            rx={4}
            fill={color}
            opacity={0.5 + (v / max) * 0.5}
          />
        )
      })}
    </svg>
  )
}

function FakeLineChart({ points, color }: { points: number[]; color: string }) {
  const max = Math.max(...points)
  const width = 300
  const height = 120
  const stepX = width / (points.length - 1)

  const pathData = points
    .map((v, i) => {
      const x = i * stepX
      const y = height - (v / max) * (height - 20) - 10
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  const areaPath = `${pathData} L${width},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mx-auto w-full max-w-sm" preserveAspectRatio="xMidYMid meet">
      <path d={areaPath} fill={color} opacity={0.15} />
      <path d={pathData} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function FakeDonut({ colors }: { colors: string[] }) {
  const segments = [
    { percent: 35, offset: 0 },
    { percent: 25, offset: 35 },
    { percent: 20, offset: 60 },
    { percent: 12, offset: 80 },
    { percent: 8, offset: 92 },
  ]
  const radius = 40
  const circumference = 2 * Math.PI * radius

  return (
    <svg viewBox="0 0 120 120" className="mx-auto h-36 w-36">
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors[i % colors.length]}
          strokeWidth="18"
          strokeDasharray={`${(seg.percent / 100) * circumference} ${circumference}`}
          strokeDashoffset={`${-(seg.offset / 100) * circumference}`}
          transform="rotate(-90 60 60)"
        />
      ))}
    </svg>
  )
}

function FakeLegend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span className="text-xs text-gray-400">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

/* ── Blur overlay ── */

function ComingSoonOverlay() {
  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center backdrop-blur-[6px]">
      <div className="rounded-xl bg-white/80 px-6 py-4 text-center shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Coming soon</p>
        <p className="mt-1 max-w-xs text-xs text-gray-500">
          Momenteel is het Nextwave team hard aan het werk om deze statistieken te verwerken. Binnenkort beschikbaar!
        </p>
      </div>
    </div>
  )
}

/* ── Individual card wrapper ── */

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-base font-semibold text-gray-900">{title}</h3>
      <div className="relative">
        <div className="pointer-events-none select-none" aria-hidden="true">
          {children}
        </div>
        <ComingSoonOverlay />
      </div>
    </div>
  )
}

/* ── Main export ── */

export function ComingSoonCharts() {
  const blue = '#3B82F6'
  const blueShades = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']
  const red = '#EF4444'
  const redShades = ['#EF4444', '#F87171', '#FCA5A5', '#FECACA', '#FEE2E2']

  return (
    <div className="space-y-8">
      {/* ── ICP sectie ── */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Ideal Customer Profile (ICP)
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ChartCard title="Functietitel ICP">
            <FakeBarChart bars={[65, 48, 35, 22, 15, 10]} color={blue} />
            <FakeLegend
              items={[
                { color: blueShades[0], label: 'CEO' },
                { color: blueShades[1], label: 'CTO' },
                { color: blueShades[2], label: 'VP Sales' },
                { color: blueShades[3], label: 'Manager' },
                { color: blueShades[4], label: 'Overig' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Locatie ICP">
            <FakeDonut colors={blueShades} />
            <FakeLegend
              items={[
                { color: blueShades[0], label: 'Randstad' },
                { color: blueShades[1], label: 'Noord-Brabant' },
                { color: blueShades[2], label: 'Gelderland' },
                { color: blueShades[3], label: 'Overijssel' },
                { color: blueShades[4], label: 'Overig' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Bedrijfsgrootte ICP">
            <FakeLineChart points={[10, 35, 60, 80, 55, 30, 15]} color={blue} />
            <FakeLegend
              items={[
                { color: blueShades[0], label: '1-10' },
                { color: blueShades[1], label: '11-50' },
                { color: blueShades[2], label: '51-200' },
                { color: blueShades[3], label: '201-500' },
                { color: blueShades[4], label: '500+' },
              ]}
            />
          </ChartCard>
        </div>
      </div>

      {/* ── WCP sectie ── */}
      <div>
        <h2 className="mb-4 text-lg font-bold text-gray-900">
          Worst Customer Profile (WCP)
        </h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <ChartCard title="Functietitel WCP">
            <FakeBarChart bars={[50, 40, 30, 20, 12, 8]} color={red} />
            <FakeLegend
              items={[
                { color: redShades[0], label: 'Stagiair' },
                { color: redShades[1], label: 'Receptie' },
                { color: redShades[2], label: 'Support' },
                { color: redShades[3], label: 'Admin' },
                { color: redShades[4], label: 'Overig' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Locatie WCP">
            <FakeDonut colors={redShades} />
            <FakeLegend
              items={[
                { color: redShades[0], label: 'Limburg' },
                { color: redShades[1], label: 'Friesland' },
                { color: redShades[2], label: 'Zeeland' },
                { color: redShades[3], label: 'Drenthe' },
                { color: redShades[4], label: 'Overig' },
              ]}
            />
          </ChartCard>

          <ChartCard title="Bedrijfsgrootte WCP">
            <FakeLineChart points={[5, 20, 45, 70, 85, 60, 40]} color={red} />
            <FakeLegend
              items={[
                { color: redShades[0], label: '1-10' },
                { color: redShades[1], label: '11-50' },
                { color: redShades[2], label: '51-200' },
                { color: redShades[3], label: '201-500' },
                { color: redShades[4], label: '500+' },
              ]}
            />
          </ChartCard>
        </div>
      </div>
    </div>
  )
}
