'use client'

function FakeDonut({ colors }: { colors: string[] }) {
  // SVG donut with fake segments
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
    <svg viewBox="0 0 120 120" className="mx-auto h-48 w-48">
      {segments.map((seg, i) => (
        <circle
          key={i}
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={colors[i % colors.length]}
          strokeWidth="20"
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

export function ComingSoonCharts() {
  const blueShades = ['#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE']
  const greenShades = ['#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5']

  return (
    <div className="space-y-6">
      {/* Sector verdeling placeholder */}
      <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Sector verdeling</h3>
        <div className="relative">
          <div className="pointer-events-none select-none" aria-hidden="true">
            <FakeDonut colors={blueShades} />
            <FakeLegend
              items={[
                { color: blueShades[0], label: 'IT & Software' },
                { color: blueShades[1], label: 'Financieel' },
                { color: blueShades[2], label: 'Gezondheidszorg' },
                { color: blueShades[3], label: 'Productie' },
                { color: blueShades[4], label: 'Overig' },
              ]}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/40">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-600">Binnenkort beschikbaar</p>
              <p className="mt-0.5 text-xs text-gray-400">Deze statistieken worden in een toekomstige update toegevoegd.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Functie verdeling placeholder */}
      <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">Functie verdeling</h3>
        <div className="relative">
          <div className="pointer-events-none select-none" aria-hidden="true">
            <FakeDonut colors={greenShades} />
            <FakeLegend
              items={[
                { color: greenShades[0], label: 'CEO / Directeur' },
                { color: greenShades[1], label: 'Manager' },
                { color: greenShades[2], label: 'Sales' },
                { color: greenShades[3], label: 'Marketing' },
                { color: greenShades[4], label: 'Overig' },
              ]}
            />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/40">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-600">Binnenkort beschikbaar</p>
              <p className="mt-0.5 text-xs text-gray-400">Deze statistieken worden in een toekomstige update toegevoegd.</p>
            </div>
          </div>
        </div>
      </div>

      {/* ICP Vorming placeholder */}
      <div className="relative overflow-hidden rounded-lg bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-base font-semibold text-gray-900">ICP Vorming</h3>
        <div className="relative">
          <div className="pointer-events-none select-none" aria-hidden="true">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-300">Sectoren bij positieve leads</h4>
                <FakeDonut colors={blueShades} />
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-gray-300">Functies bij positieve leads</h4>
                <FakeDonut colors={greenShades} />
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-white via-white/80 to-white/40">
            <div className="text-center">
              <svg className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-1.5M12 12.75l3 1.5m-3-1.5V18" />
              </svg>
              <p className="mt-2 text-sm font-medium text-gray-600">Binnenkort beschikbaar</p>
              <p className="mt-0.5 text-xs text-gray-400">Deze statistieken worden in een toekomstige update toegevoegd.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
