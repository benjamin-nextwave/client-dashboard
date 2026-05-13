'use client'

import { useState } from 'react'
import type { CampaignFlow } from '@/lib/data/campaign-flow'
import type { LinkedInFlowState } from '@/lib/data/linkedin-flow'
import { FlowStepBlock } from './flow-step-block'
import { LinkedInFlowChart } from './linkedin-flowchart'

interface Props {
  flows: CampaignFlow[]
  linkedInFlow: LinkedInFlowState | null
}

export function CampaignFlowsViewer({ flows, linkedInFlow }: Props) {
  const [activeId, setActiveId] = useState(flows[0]?.id ?? null)
  const activeFlow = flows.find((f) => f.id === activeId) ?? flows[0]

  if (!activeFlow) return null

  return (
    <div className="relative">
      {flows.length > 1 && (
        <div className="mb-6 flex justify-center">
          <div className="inline-flex flex-wrap items-center gap-1 rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
            {flows.map((f) => {
              const active = f.id === activeFlow.id
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveId(f.id)}
                  className={`group relative inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      active ? 'bg-white' : 'bg-indigo-400'
                    }`}
                  />
                  {f.name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="mx-auto max-w-2xl">
        {activeFlow.steps.map((step, idx) => {
          // When the LinkedIn flow is published as an extension of the email
          // sequence, the last mail step should keep its "geen reactie"
          // continue arrow (instead of the "Einde campagne" pill) so the
          // path flows naturally into the LinkedIn chart below.
          const linkedInExtends =
            !!linkedInFlow && linkedInFlow.enabled && !!linkedInFlow.publishedAt
          const isLast =
            idx === activeFlow.steps.length - 1 && !linkedInExtends
          return (
            <FlowStepBlock
              key={`${activeFlow.id}-${step.id}`}
              step={step}
              stepLabel={`Mail ${step.stepNumber}`}
              isLast={isLast}
            />
          )
        })}
      </div>

      {linkedInFlow && <LinkedInFlowChart state={linkedInFlow} />}
    </div>
  )
}
