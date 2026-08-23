export type StageState = 'done' | 'active' | 'idle'

export interface PipelineStage {
  key: string
  label: string
  detail: string
  state: StageState
}

interface Props {
  stages: PipelineStage[]
}

/**
 * The decision chain, always visible: data becomes analysis, analysis becomes a
 * recommendation, and the chain ends at the engineer — never at the equipment.
 */
export function PipelineStrip({ stages }: Props) {
  return (
    <ol className="grid grid-cols-2 gap-1 sm:grid-cols-3 xl:grid-cols-6">
      {stages.map((stage, index) => {
        const isLast = index === stages.length - 1
        return (
          <li
            key={stage.key}
            className={`relative rounded-xl border bg-white px-3.5 py-3 transition-all duration-200 hover:shadow-md ${
              stage.state === 'idle'
                ? 'opacity-55 border-slate-200/60'
                : stage.state === 'done'
                  ? 'border-emerald-200/80 bg-emerald-50/30'
                  : 'border-sky-200/80 bg-sky-50/30'
            } ${isLast ? 'bg-gradient-to-br from-sky-50/80 to-indigo-50/60 border-sky-200' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className={`h-2.5 w-2.5 shrink-0 rounded-full transition-all ${
                  stage.state === 'done'
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                    : stage.state === 'active'
                      ? 'bg-sky-500 animate-pulse shadow-[0_0_8px_rgba(14,165,233,0.4)]'
                      : 'border-2 border-slate-300 bg-transparent'
                }`}
              />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">{stage.label}</p>
            </div>
            <p className="mt-1.5 truncate text-[11px] font-medium text-slate-500" title={stage.detail}>
              {stage.detail}
            </p>
          </li>
        )
      })}
    </ol>
  )
}
