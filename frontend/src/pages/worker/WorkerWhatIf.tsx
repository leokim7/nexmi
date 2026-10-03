import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Notice, PageHead } from '../../components/ui'
import { WeightsEditor } from '../../components/WeightsEditor'
import { useCatalog } from '../../lib/catalog'
import { BEHAVIOR_SCALE, fmt, MATURITY, PERSONAL, SCENARIOS, yearText } from '../../lib/labels'
import { compactWorker, useStore, type WorkerDraft } from '../../lib/store'
import type { WorkerDiagnosis, WorkerInput } from '../../lib/types'
import { buildWorkerInput, draftFromInput, missingWorker, runWorker, useRunner } from '../../lib/worker'

export default function WorkerWhatIf() {
  useTitle('대응 시뮬레이션')
  const cat = useCatalog()
  const { data, update } = useStore()
  const cur = data.worker.current
  const wi = data.worker.whatif
  const runner = useRunner(runWorker)

  // 원본 결과의 입력을 복사해 별도 초안으로 편집한다. 원본은 바뀌지 않는다.
  // (새 분석을 하면 WorkerFlow 가 whatif 를 비워서 여기서 다시 복사된다.)
  useEffect(() => {
    if (cur && !wi) update((d) => ({ ...d, worker: { ...d.worker, whatif: { draft: draftFromInput(cur.input_snapshot, cat) } } }))
  }, [cur, wi, cat, update])

  if (!cur)
    return (
      <div className="wrap page narrow">
        <Empty title="먼저 내 업무를 분석해주세요" action={<Link to="/worker/start/1" className="btn primary">분석 시작</Link>}>
          대응 시뮬레이션은 기존 결과를 원본으로 두고 가정만 바꿔 비교해요.
        </Empty>
      </div>
    )
  if (!wi) return null

  const setDraft = (fn: (d: WorkerDraft) => WorkerDraft) => update((d) => ({ ...d, worker: { ...d.worker, whatif: { ...d.worker.whatif!, draft: fn(d.worker.whatif!.draft) } } }))
  const reset = () => update((d) => ({ ...d, worker: { ...d.worker, whatif: { draft: draftFromInput(cur.input_snapshot, cat) } } }))
  const missing = missingWorker(wi.draft)
  const changes = diffInputs(cur.input_snapshot, buildWorkerInput(cat, wi.draft), cat)

  const calc = async () => {
    const input = buildWorkerInput(cat, wi.draft)
    if (!input) return
    const r = await runner.run(input)
    if (r) update((d) => ({ ...d, worker: { ...d.worker, whatif: { ...d.worker.whatif!, result: compactWorker(r) } } }))
  }

  return (
    <div className="wrap page">
      <PageHead eyebrow="WHAT IF" title="업무 구성을 바꾸면?" lead="내 업무나 역할을 바꾼다면 결과가 어떻게 달라질지 미리 계산해봐요. 원래 결과는 그대로 남아요." />
      <div className="grid-side">
        <div className="stack lg">
          <details className="card" open>
            <summary className="h3" style={{ cursor: 'pointer' }}>업무 비중</summary>
            <WeightsEditor draft={wi.draft} onChange={(weights) => setDraft((d) => ({ ...d, weights }))} compact />
          </details>
          <div className="card stack">
            <h2 className="h3">회사의 AI 도입과 나의 역할</h2>
            <div className="field">
              <label htmlFor="wi-m">회사의 AI 도입 단계</label>
              <select id="wi-m" value={wi.draft.ai_maturity} onChange={(e) => setDraft((d) => ({ ...d, ai_maturity: e.target.value }))}>
                {Object.entries(MATURITY).map(([k, m]) => (
                  <option key={k} value={k}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="grid-2">
              {PERSONAL.map((p) => (
                <div className="field" key={p.key}>
                  <label htmlFor={`wi-${p.key}`}>{p.label}</label>
                  <select id={`wi-${p.key}`} value={wi.draft.personal[p.key]} onChange={(e) => setDraft((d) => ({ ...d, personal: { ...d.personal, [p.key]: Number(e.target.value) } }))}>
                    {BEHAVIOR_SCALE.map((b) => (
                      <option key={b.v} value={b.v}>{b.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside className="stack sticky-side">
          <div className="card">
            <h2 className="h3">바꾼 가정 {changes.length > 0 && <span className="chip">{changes.length}개</span>}</h2>
            {changes.length === 0 ? (
              <p className="muted small">아직 바꾼 것이 없어요. 왼쪽에서 업무 비중이나 역할을 바꿔보세요.</p>
            ) : (
              <ul className="stack sm" style={{ paddingLeft: 18 }}>
                {changes.map((c) => (
                  <li key={c} className="small">{c}</li>
                ))}
              </ul>
            )}
            {missing.length > 0 && (
              <Notice kind="error" role="alert">
                {missing.join(', ')}을(를) 확인해주세요.
              </Notice>
            )}
            {runner.error && (
              <Notice kind="error" role="alert">
                {runner.error.message}
              </Notice>
            )}
            <div className="btn-row">
              <button className="btn primary" onClick={calc} disabled={runner.loading || missing.length > 0 || changes.length === 0} aria-busy={runner.loading}>
                {runner.loading ? '계산 중…' : '변경 가정 계산'}
              </button>
              <button className="btn ghost sm" onClick={reset}>
                원본으로 되돌리기
              </button>
            </div>
          </div>
          {wi.result && <Comparison before={cur} after={wi.result} />}
        </aside>
      </div>
    </div>
  )
}

function Comparison({ before, after }: { before: WorkerDiagnosis; after: WorkerDiagnosis }) {
  const m = (d: WorkerDiagnosis, k: string) => d.result.paths.base[0].metrics[k] as number
  const rows: { k: string; a: string; b: string; delta?: number }[] = [
    ...SCENARIOS.map((s) => ({ k: `바뀌는 해 · ${s.label}`, a: yearText(before.result.crossings[s.id].career_transformation), b: yearText(after.result.crossings[s.id].career_transformation) })),
    ...[
      ['automation', 'AI가 대신할 가능성'],
      ['augmentation', 'AI 도움 받을 여지'],
      ['task_migration', '다른 일로 옮겨갈 힘'],
      ['career_disruption_index', '전체 변화 점수'],
    ].map(([k, l]) => ({ k: `${l} (2026)`, a: fmt(m(before, k)), b: fmt(m(after, k)), delta: m(after, k) - m(before, k) })),
  ]
  return (
    <div className="card soft" aria-live="polite">
      <h2 className="h3">변경 전 → 후</h2>
      <div className="table-wrap" style={{ background: '#fff' }}>
        <table className="table">
          <thead>
            <tr>
              <th scope="col">항목</th>
              <th scope="col" className="num">원본</th>
              <th scope="col" className="num">변경</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <th scope="row" className="small">{r.k}</th>
                <td className="num small">{r.a}</td>
                <td className="num small">
                  <strong>{r.b}</strong>
                  {r.delta !== undefined && Math.abs(r.delta) >= 0.05 && (
                    <span className="muted"> ({r.delta > 0 ? '+' : ''}{r.delta.toFixed(1)})</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">‘이렇게 바꾸면 어떨까’를 계산해본 거예요. 실제로 이렇게 된다는 보장은 아니에요. 여러 개를 한꺼번에 바꾸면 어느 것 때문인지 알기 어려워요.</p>
      <Link to="/worker/plan" className="btn sm primary">
        실행 계획으로 <Icon name="arrow" />
      </Link>
    </div>
  )
}

function diffInputs(a: WorkerInput, b: WorkerInput | null, cat: ReturnType<typeof useCatalog>): string[] {
  if (!b) return []
  const out: string[] = []
  if (a.ai_maturity !== b.ai_maturity) out.push(`AI 도입: ${MATURITY[a.ai_maturity].label} → ${MATURITY[b.ai_maturity].label}`)
  PERSONAL.forEach((p) => {
    const x = (a as any)[p.key]
    const y = (b as any)[p.key]
    if (x !== y) out.push(`${p.label}: ${BEHAVIOR_SCALE.find((s) => s.v === x)?.label} → ${BEHAVIOR_SCALE.find((s) => s.v === y)?.label}`)
  })
  Object.keys({ ...a.task_weights, ...b.task_weights }).forEach((k) => {
    const x = (a.task_weights[k] ?? 0) * 100
    const y = (b.task_weights[k] ?? 0) * 100
    if (Math.abs(x - y) >= 0.5) out.push(`${cat.taskById.get(k)?.name_ko}: ${x.toFixed(0)}% → ${y.toFixed(0)}%`)
  })
  return out
}
