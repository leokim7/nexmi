import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

export function PageHead({ eyebrow, title, lead, children }: { eyebrow: string; title: ReactNode; lead?: ReactNode; children?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="h1">{title}</h1>
      </div>
      {(lead || children) && (
        <div className="stack sm" style={{ maxWidth: 520 }}>
          {lead && <p className="lead">{lead}</p>}
          {children}
        </div>
      )}
    </header>
  )
}

export function Notice({ kind = 'plain', icon, children, role }: { kind?: 'plain' | 'info' | 'error' | 'ok'; icon?: string; children: ReactNode; role?: 'alert' | 'status' }) {
  return (
    <div className={`notice ${kind === 'plain' ? '' : kind}`} role={role}>
      <Icon name={icon ?? (kind === 'error' ? 'alert' : kind === 'ok' ? 'check' : 'info')} />
      <div>{children}</div>
    </div>
  )
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <p className="h3">{title}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  )
}

export function Steps({ labels, current }: { labels: string[]; current: number }) {
  return (
    <ol className="steps" aria-label={`전체 ${labels.length}단계 중 ${current + 1}단계`}>
      {labels.map((l, i) => (
        <li key={l} aria-current={i === current ? 'step' : undefined} className={i < current ? 'done' : undefined}>
          <span className="dot">{i < current ? <Icon name="check" size={14} /> : i + 1}</span>
          <span className="lbl">{l}</span>
        </li>
      ))}
    </ol>
  )
}

export function Progress({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={max} aria-valuenow={value} aria-label={label}>
      <span style={{ width: `${(value / max) * 100}%` }} />
    </div>
  )
}

export function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const onKey = (e: React.KeyboardEvent, i: number) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!d) return
    const n = (i + d + tabs.length) % tabs.length
    onChange(tabs[n].id)
    refs.current[n]?.focus()
  }
  return (
    <div className="tabs no-print" role="tablist" aria-label={label}>
      {tabs.map((t, i) => (
        <button
          key={t.id}
          ref={(el) => (refs.current[i] = el)}
          role="tab"
          id={`tab-${t.id}`}
          aria-selected={value === t.id}
          aria-controls={`panel-${t.id}`}
          tabIndex={value === t.id ? 0 : -1}
          onClick={() => onChange(t.id)}
          onKeyDown={(e) => onKey(e, i)}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** 라디오 그룹. value: number | null(모름) | undefined(미응답) */
export function ScaleRadio({
  legend,
  options,
  value,
  onChange,
  allowUnknown,
  cols,
  error,
  hideLegend,
  autoFocus,
}: {
  legend: ReactNode
  options: { v: number; label: string }[]
  value: number | null | undefined
  onChange: (v: number | null) => void
  allowUnknown?: boolean
  cols?: number
  error?: string
  hideLegend?: boolean
  autoFocus?: boolean
}) {
  const name = useId()
  const all = [...options.map((o) => ({ key: String(o.v), v: o.v as number | null, label: o.label })), ...(allowUnknown ? [{ key: 'null', v: null, label: '아직 모름' }] : [])]
  const n = cols ?? all.length
  return (
    <fieldset className="stack sm" aria-invalid={error ? true : undefined}>
      <legend className={hideLegend ? 'sr-only' : undefined} style={hideLegend ? undefined : { marginBottom: 8 }}>
        {legend}
      </legend>
      <div className={`options cols-${n}`}>
        {all.map((o, i) => {
          const checked = value === o.v && value !== undefined
          return (
            <label key={o.key} className={`opt center ${o.v === null ? 'unknown' : ''} ${checked ? 'selected' : ''}`}>
              <input type="radio" name={name} checked={checked} onChange={() => onChange(o.v)} autoFocus={autoFocus && i === 0} />
              <span className="t" style={{ fontSize: 14.5 }}>{o.label}</span>
            </label>
          )
        })}
      </div>
      {error && <p className="err small" style={{ color: 'var(--danger)', fontWeight: 700 }}>{error}</p>}
    </fieldset>
  )
}

export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  open: boolean
  title: string
  children?: ReactNode
  confirmLabel: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const returnFocus = useRef<Element | null>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      returnFocus.current = document.activeElement
      d.showModal()
    } else if (!open && d.open) {
      d.close()
      ;(returnFocus.current as HTMLElement | null)?.focus?.()
    }
  }, [open])
  return (
    <dialog ref={ref} className="modal" aria-labelledby="dlg-title" onCancel={(e) => (e.preventDefault(), onCancel())}>
      <div className="stack">
        <h2 id="dlg-title" className="h3">{title}</h2>
        {children && <div className="muted">{children}</div>}
        <div className="btn-row" style={{ justifyContent: 'flex-end', marginTop: 6 }}>
          <button className="btn sm" onClick={onCancel} autoFocus>
            취소
          </button>
          <button className={`btn sm ${danger ? 'dark' : 'primary'}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  )
}

export function useToast() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(null), 2600)
    return () => clearTimeout(t)
  }, [msg])
  const node = msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
  return [node, setMsg] as const
}

/** 스크롤 진입 시 한 번만 페이드업 (wanjoo 모션 규칙). */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.on)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((e) => e.classList.add('on'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('on')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.14 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  })
}

export function Field({ label, hint, error, children, htmlFor }: { label: string; hint?: ReactNode; error?: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && <span className="hint">{hint}</span>}
      {error && (
        <span className="err" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}

export function Metric({ label, value, unit, desc, bar }: { label: string; value: number | null | undefined; unit?: string; desc?: string; bar?: boolean }) {
  return (
    <div className="metric">
      <span className="k">{label}</span>
      {value == null ? <span className="v none">자료 없음</span> : <span className="v">{Number(value).toFixed(1).replace(/\.0$/, '')}{unit}</span>}
      {bar && value != null && (
        <div className="bar" aria-hidden="true">
          <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
        </div>
      )}
      {desc && <span className="d">{desc}</span>}
    </div>
  )
}
