'use client'

interface PipelineStage {
  label: string
  count: number
}

interface PipelineChartProps {
  stages: PipelineStage[]
  brandColor: string
}

export function PipelineChart({ stages, brandColor }: PipelineChartProps) {
  const maxCount = Math.max(...stages.map((s) => s.count), 1)
  const total = stages[0]?.count || 1

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-900">Lead Pipeline</h3>
      <div className="mt-4 flex items-end gap-1">
        {stages.map((stage, i) => {
          const widthPct = Math.max((stage.count / maxCount) * 100, 8)
          const opacity = 1 - i * 0.15
          const conversionPct =
            i === 0 ? 100 : ((stage.count / total) * 100).toFixed(1)

          return (
            <div key={stage.label} className="flex-1 min-w-0">
              <div className="text-center">
                <span className="text-xs font-medium text-gray-500">
                  {stage.label}
                </span>
              </div>
              <div
                className="mt-1 flex items-center justify-center rounded-md py-3 transition-all"
                style={{
                  backgroundColor: brandColor,
                  opacity,
                  width: `${widthPct}%`,
                  minWidth: '100%',
                  height: `${Math.max(widthPct * 0.6, 32)}px`,
                }}
              >
                <span className="text-sm font-bold text-white">
                  {stage.count}
                </span>
              </div>
              <div className="mt-1 text-center">
                <span className="text-[10px] text-gray-400">
                  {i === 0 ? '' : `${conversionPct}%`}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
