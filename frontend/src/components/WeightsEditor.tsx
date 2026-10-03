import { useCatalog } from '../lib/catalog'
import type { WorkerDraft } from '../lib/store'
import { defaultWeights, displayWeights, sumOf, toPercentInts } from '../lib/worker'
import { Icon } from './Icon'

/** 업무 14개 비중 편집. 자동 정규화는 하지 않고, 사용자가 누를 때만 합계를 맞춘다. */
export function WeightsEditor({ draft, onChange, compact }: { draft: WorkerDraft; onChange: (w: Record<string, number> | undefined) => void; compact?: boolean }) {
  const cat = useCatalog()
  const tasks = cat.tasksByOccupation.get(draft.occupation_id!) ?? []
  const shown = displayWeights(cat, draft)
  const total = sumOf(shown)
  const ok = Math.abs(total - 100) < 1e-6
  const isDefault = !draft.weights

  const base = () => draft.weights ?? toPercentInts(defaultWeights(cat, draft.occupation_id, draft.career_level) ?? {})
  const set = (id: string, raw: number) => {
    const v = Number.isFinite(raw) ? Math.max(0, Math.min(100, Math.round(raw))) : 0
    onChange({ ...base(), [id]: v })
  }
  const fit = () => {
    const w = base()
    const s = sumOf(w)
    if (s <= 0) return
    onChange(toPercentInts(Object.fromEntries(Object.entries(w).map(([k, v]) => [k, v / s]))))
  }

  return (
    <div className="stack">
      <div className={`sum-bar ${ok ? 'ok' : 'bad'}`} role="status" aria-live="polite">
        <div>
          <div className="small muted">합계</div>
          <div className="total">{total.toFixed(isDefault ? 1 : 0)}%</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, total)}%`, background: ok ? 'var(--green)' : total > 100 ? 'var(--danger)' : 'var(--blue)' }} />
          </div>
          <div className="small" style={{ marginTop: 6, color: ok ? 'var(--green)' : 'var(--danger)', fontWeight: 700 }}>
            {ok ? '좋아요. 합계가 100%예요.' : total > 100 ? `${(total - 100).toFixed(0)}% 넘었어요` : `${(100 - total).toFixed(0)}% 남았어요`}
          </div>
        </div>
        {!ok && (
          <button type="button" className="btn sm" onClick={fit}>
            합계 100%로 맞추기
          </button>
        )}
      </div>
      <div className="row between">
        {isDefault ? (
          <span className="chip warn">이 직군의 평균값이에요. 내 실제에 맞게 바꿔주세요</span>
        ) : (
          <span className="chip ok"><Icon name="check" />내가 직접 고친 값</span>
        )}
        {!isDefault && (
          <button type="button" className="link small" onClick={() => onChange(undefined)}>
            평균값으로 되돌리기
          </button>
        )}
      </div>
      <div className={compact ? '' : 'card'} style={compact ? undefined : { padding: '8px 22px' }}>
        {tasks.map((t) => {
          const v = shown[t.task_id] ?? 0
          return (
            <div className="weight-row" key={t.task_id}>
              <label className="name" htmlFor={`w-${t.task_id}`}>{t.name_ko}</label>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(v)}
                aria-label={`${t.name_ko} 비중`}
                aria-valuetext={`${Math.round(v)}%`}
                onChange={(e) => set(t.task_id, Number(e.target.value))}
              />
              <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}>
                <input
                  id={`w-${t.task_id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={100}
                  step={1}
                  value={isDefault ? Number(v.toFixed(1)) : v}
                  onChange={(e) => set(t.task_id, e.target.value === '' ? 0 : Number(e.target.value))}
                />
                <span className="muted small">%</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
