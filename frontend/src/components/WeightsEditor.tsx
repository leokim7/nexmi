import { useCatalog } from '../lib/catalog'
import type { WorkerDraft } from '../lib/store'
import { displayWeights } from '../lib/worker'
import { Icon } from './Icon'

/** 각 업무를 ‘얼마나 하는지’ 5단계로 고르면 비중(%)은 자동으로 계산된다.
    사용자가 합계를 맞출 필요가 없다. 고른 값과 계산된 %를 함께 보여준다. */
export const LEVELS = [
  { v: 0, label: '안 함' },
  { v: 1, label: '조금' },
  { v: 2, label: '보통' },
  { v: 4, label: '많이' },
  { v: 8, label: '아주 많이' },
]

/** 기존 % 값(평균값 등)을 가장 가까운 단계로 바꿔서 시작점으로 보여준다. */
function levelsFromWeights(w: Record<string, number>): Record<string, number> {
  const vals = Object.values(w).filter((v) => v > 0)
  const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0
  return Object.fromEntries(
    Object.entries(w).map(([k, v]) => {
      if (v <= 0 || !mean) return [k, 0]
      const r = v / mean
      return [k, r < 0.6 ? 1 : r < 1.4 ? 2 : r < 2.8 ? 4 : 8]
    }),
  )
}

export function weightsFromLevels(levels: Record<string, number>): Record<string, number> | undefined {
  const total = Object.values(levels).reduce((a, b) => a + b, 0)
  if (total <= 0) return Object.fromEntries(Object.keys(levels).map((k) => [k, 0]))
  return Object.fromEntries(Object.entries(levels).map(([k, v]) => [k, (v / total) * 100]))
}

export function WeightsEditor({
  draft,
  onChange,
  compact,
}: {
  draft: WorkerDraft
  onChange: (weights: Record<string, number> | undefined, levels: Record<string, number> | undefined) => void
  compact?: boolean
}) {
  const cat = useCatalog()
  const tasks = cat.tasksByOccupation.get(draft.occupation_id!) ?? []
  const isDefault = !draft.weights
  const levels = draft.levels ?? levelsFromWeights(displayWeights(cat, draft))
  const pct = draft.weights ?? displayWeights(cat, draft)
  const allZero = Object.values(levels).every((v) => v === 0)

  const set = (id: string, v: number) => {
    const next = { ...levels, [id]: v }
    onChange(weightsFromLevels(next), next)
  }

  // 상위 업무 몇 개를 막대로 보여줘 내 시간이 어디에 쓰이는지 한눈에.
  const top = [...tasks].map((t) => ({ t, p: pct[t.task_id] ?? 0 })).filter((x) => x.p > 0).sort((a, b) => b.p - a.p)

  return (
    <div className="stack">
      <div className="sum-bar" role="status" aria-live="polite" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
        {allZero ? (
          <span className="small strong" style={{ color: 'var(--danger)' }}>적어도 한 가지 업무는 ‘조금’ 이상으로 골라주세요.</span>
        ) : (
          <>
            <div className="dist-bar" aria-hidden="true">
              {top.map((x, i) => (
                <span key={x.t.task_id} style={{ flexGrow: x.p, opacity: Math.max(0.25, 1 - i * 0.09) }} />
              ))}
            </div>
            <span className="small">
              내 시간의 <strong>{Math.round(top.slice(0, 3).reduce((a, x) => a + x.p, 0))}%</strong>를{' '}
              {top.slice(0, 3).map((x) => x.t.name_ko).join(', ')}에 써요
            </span>
          </>
        )}
      </div>

      <div className="row between">
        {isDefault ? (
          <span className="chip warn">이 직군의 평균값에서 시작했어요. 내 실제에 맞게 골라주세요</span>
        ) : (
          <span className="chip ok"><Icon name="check" />내가 고른 값</span>
        )}
        {!isDefault && (
          <button type="button" className="link small" onClick={() => onChange(undefined, undefined)}>
            평균값으로 되돌리기
          </button>
        )}
      </div>

      <div className={compact ? '' : 'card'} style={compact ? undefined : { padding: '6px 22px' }}>
        {tasks.map((t) => {
          const lv = levels[t.task_id] ?? 0
          return (
            <fieldset className="level-row" key={t.task_id}>
              <legend className="sr-only">{t.name_ko}에 쓰는 시간</legend>
              <div className="row between" style={{ flexWrap: 'nowrap' }}>
                <span className="name" aria-hidden="true">{t.name_ko}</span>
                <span className="small muted num" aria-hidden="true">{Math.round(pct[t.task_id] ?? 0)}%</span>
              </div>
              <div className="level-opts">
                {LEVELS.map((l) => (
                  <button key={l.v} type="button" aria-pressed={lv === l.v} onClick={() => set(t.task_id, l.v)} aria-label={`${t.name_ko}: ${l.label}`}>
                    {l.label}
                  </button>
                ))}
              </div>
            </fieldset>
          )
        })}
      </div>
      <p className="small muted">%는 고른 정도에 따라 자동으로 계산돼요. 합계를 맞출 필요가 없어요.</p>
    </div>
  )
}
