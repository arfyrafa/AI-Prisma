import type { ReactNode } from 'react'

interface Props {
  title?: string
  eyebrow?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
}

export function Panel({ title, eyebrow, action, children, className = '', bodyClassName = 'p-5' }: Props) {
  return (
    <section className={`rounded-2xl border border-slate-200/80 bg-white shadow-panel transition-all duration-200 hover:border-slate-300 ${className}`}>
      {(title || action || eyebrow) && (
        <header className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            {eyebrow && <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">{eyebrow}</p>}
            {title && <h2 className="text-sm font-bold text-slate-800 tracking-tight">{title}</h2>}
          </div>
          {action}
        </header>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  )
}
