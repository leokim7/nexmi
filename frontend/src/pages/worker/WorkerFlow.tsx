import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { ConfirmDialog, Notice, ScaleRadio, Steps } from '../../components/ui'
import { WeightsEditor } from '../../components/WeightsEditor'
import { useCatalog } from '../../lib/catalog'
import { BEHAVIOR_SCALE, CAREER_LEVELS, familyLabel, MATURITY, PERSONAL } from '../../lib/labels'
import { compactWorker, HISTORY_LIMIT, useStore, type WorkerDraft } from '../../lib/store'
import { buildWorkerInput, missingWorker, runWorker, sumOf, useRunner } from '../../lib/worker'

const STEP_LABELS = ['직군·역할', '업무 비중', 'AI·나의 역할', '확인']

export default function WorkerFlow() {
  const { step: stepParam } = useParams()
  const step = Number(stepParam)
  const [sp] = useSearchParams()
  const nav = useNavigate()
  const cat = useCatalog()
  const { data, update } = useStore()
  const draft = data.worker.draft
  const setDraft = (fn: (d: WorkerDraft) => WorkerDraft) => update((d) => ({ ...d, worker: { ...d.worker, draft: fn(d.worker.draft) } }))
  const [touched, setTouched] = useState(false)
  const runner = useRunner(runWorker)
  useTitle(`내 직업 미래 · ${STEP_LABELS[step - 1] ?? ''}`)

  if (!(step >= 1 && step <= 4)) return <Navigate to="/worker/start/1" replace />
  // 앞 단계를 건너뛰고 들어오면 필요한 단계로 돌려보낸다.
  if (step > 1 && (!draft.occupation_id || !draft.career_level)) return <Navigate to="/worker/start/1" replace />

  const stepOk = (s: number) => {
    if (s === 1) return !!draft.occupation_id && !!draft.career_level
    if (s === 2) return !draft.weights || Math.abs(sumOf(draft.weights) - 100) < 1e-9
    if (s === 3) return !!draft.ai_maturity && PERSONAL.every((p) => draft.personal[p.key] !== undefined)
    return missingWorker(draft).length === 0
  }
  const next = () => {
    setTouched(true)
    if (!stepOk(step)) return
    setTouched(false)
    nav(`/worker/start/${step + 1}`)
  }

  const submit = async () => {
    const input = buildWorkerInput(cat, draft)
    if (!input) return setTouched(true)
    const r = await runner.run(input)
    if (!r) return
    const c = compactWorker(r)
    update((d) => ({ ...d, worker: { ...d.worker, current: c, whatif: undefined, history: [c, ...d.worker.history].slice(0, HISTORY_LIMIT) } }))
    nav('/worker/result')
  }

  return (
    <div className="wrap page form">
      <div className="stack lg">
        <div className="row between">
          <Steps labels={STEP_LABELS} current={step - 1} />
          <Link to="/worker" className="link small no-print">
            처음으로
          </Link>
        </div>
        {step === 1 && <StepOccupation draft={draft} setDraft={setDraft} error={touched && !stepOk(1)} />}
        {step === 2 && <StepWeights draft={draft} setDraft={setDraft} error={touched && !stepOk(2)} />}
        {step === 3 && <StepPersonal draft={draft} setDraft={setDraft} touched={touched} />}
        {step === 4 && <StepReview draft={draft} example={sp.get('example') === '1'} />}

        {step === 4 && runner.error && (
          <Notice kind="error" role="alert">
            {runner.error.message}
            {Object.values(runner.error.fieldErrors).length > 0 && <> ({Object.values(runner.error.fieldErrors).join(' / ')})</>}
          </Notice>
        )}
        {step === 4 && runner.loading && (
          <Notice kind="info" role="status">
            AI가 천천히·지금 속도로·빠르게 퍼질 때를 2040년까지 계산하고 있어요…
            {runner.slow && <> 평소보다 오래 걸리고 있어요. 입력은 그대로 있으니 잠시 기다리거나 다시 시도해주세요.</>}
          </Notice>
        )}

        <div className="flow-foot no-print">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            {step > 1 ? (
              <Link to={`/worker/start/${step - 1}`} className="btn">
                <Icon name="back" /> 이전
              </Link>
            ) : (
              <span />
            )}
            {step < 4 ? (
              <button className="btn primary" onClick={next}>
                다음 <Icon name="arrow" />
              </button>
            ) : (
              <button className="btn primary lg" onClick={submit} disabled={runner.loading || missingWorker(draft).length > 0} aria-busy={runner.loading}>
                {runner.loading ? '계산 중…' : runner.error ? '다시 시도' : '분석하기'} {!runner.loading && <Icon name={runner.error ? 'refresh' : 'arrow'} />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
function StepOccupation({ draft, setDraft, error }: { draft: WorkerDraft; setDraft: (fn: (d: WorkerDraft) => WorkerDraft) => void; error: boolean }) {
  const cat = useCatalog()
  const [q, setQ] = useState('')
  const [pending, setPending] = useState<Partial<WorkerDraft> | null>(null)
  const groups = useMemo(() => {
    const list = cat.occupations.filter((o) => !q.trim() || o.name_ko.toLowerCase().includes(q.trim().toLowerCase()))
    const m = new Map<string, typeof list>()
    list.forEach((o) => m.set(o.family, [...(m.get(o.family) ?? []), o]))
    return [...m.entries()]
  }, [cat, q])

  // 직군·역할이 바뀌면 업무 목록·기본 분포가 바뀐다. 직접 고친 비중이 있으면 확인 후 초기화.
  const change = (patch: Partial<WorkerDraft>) => {
    if (draft.weights && (patch.occupation_id ?? draft.occupation_id) !== draft.occupation_id) return setPending(patch)
    if (draft.weights && patch.career_level && patch.career_level !== draft.career_level) return setPending(patch)
    setDraft((d) => ({ ...d, ...patch }))
  }
  const selected = draft.occupation_id ? cat.occupationById.get(draft.occupation_id) : undefined

  return (
    <section className="stack lg" aria-labelledby="s1">
      <div className="stack sm">
        <div className="eyebrow">STEP 1 · PROFILE</div>
        <h1 id="s1" className="h1">지금 어떤 일을 하나요?</h1>
        <p className="lead">직업 이름보다 실제 업무 구성이 중요해요. 가장 가까운 직군을 골라주세요.</p>
      </div>

      <fieldset className="stack">
        <legend className="h3" style={{ marginBottom: 12 }}>대표 직군 {selected && <span className="chip" style={{ marginLeft: 8 }}>{selected.name_ko}</span>}</legend>
        <div className="search">
          <Icon name="search" />
          <input type="search" placeholder="직군 이름 검색 (예: 마케터, 개발자)" value={q} onChange={(e) => setQ(e.target.value)} aria-label="직군 검색" />
        </div>
        {groups.length === 0 && <p className="muted">‘{q}’와 맞는 직군이 없어요. 가장 비슷한 업무를 하는 직군을 골라주세요.</p>}
        <div className="stack" style={{ maxHeight: 460, overflowY: 'auto', paddingRight: 4 }}>
          {groups.map(([fam, list]) => (
            <div key={fam} className="stack sm">
              <span className="small strong muted">{familyLabel(fam)}</span>
              <div className="options cols-3">
                {list.map((o) => (
                  <label key={o.occupation_id} className={`opt ${draft.occupation_id === o.occupation_id ? 'selected' : ''}`}>
                    <input type="radio" name="occupation" checked={draft.occupation_id === o.occupation_id} onChange={() => change({ occupation_id: o.occupation_id, weights: undefined })} />
                    <span className="t">{o.name_ko}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {error && !draft.occupation_id && <p className="err" role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>직군을 선택해주세요.</p>}
      </fieldset>

      <fieldset className="stack">
        <legend className="h3" style={{ marginBottom: 12 }}>역할 수준</legend>
        <div className="options cols-3">
          {CAREER_LEVELS.map((l) => (
            <label key={l.id} className={`opt ${draft.career_level === l.id ? 'selected' : ''}`}>
              <input type="radio" name="level" checked={draft.career_level === l.id} onChange={() => change({ career_level: l.id, weights: undefined })} />
              <span className="t">{l.label}</span>
              <span className="d">{l.desc}</span>
            </label>
          ))}
        </div>
        <p className="small muted">역할 수준은 업무 비중의 임시 분포를 고르는 데만 써요. 연차 자체를 점수에 더하지 않아요.</p>
        {error && !draft.career_level && <p className="err" role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>역할 수준을 선택해주세요.</p>}
      </fieldset>

      <ConfirmDialog
        open={!!pending}
        title="직접 입력한 업무 비중을 초기화할까요?"
        confirmLabel="바꾸고 초기화"
        onCancel={() => setPending(null)}
        onConfirm={() => {
          setDraft((d) => ({ ...d, ...pending, weights: undefined }))
          setPending(null)
        }}
      >
        직군이나 역할을 바꾸면 업무 목록과 임시 분포가 달라져요.
      </ConfirmDialog>
    </section>
  )
}

function StepWeights({ draft, setDraft, error }: { draft: WorkerDraft; setDraft: (fn: (d: WorkerDraft) => WorkerDraft) => void; error: boolean }) {
  const cat = useCatalog()
  return (
    <section className="stack lg" aria-labelledby="s2">
      <div className="stack sm">
        <div className="eyebrow">STEP 2 · TASKS</div>
        <h1 id="s2" className="h1">어떤 업무에 시간을 쓰나요?</h1>
        <p className="lead">{cat.occupationById.get(draft.occupation_id!)?.name_ko}의 업무 14개예요. 최근 한 달을 떠올려 시간 비중을 맞춰주세요. 하지 않는 업무는 0%로 두세요.</p>
      </div>
      <WeightsEditor draft={draft} onChange={(weights) => setDraft((d) => ({ ...d, weights }))} />
      {error && (
        <Notice kind="error" role="alert">
          업무 비중의 합계가 100%여야 다음으로 갈 수 있어요. 값을 고치거나 ‘합계 100%로 맞추기’를 눌러주세요.
        </Notice>
      )}
    </section>
  )
}

function StepPersonal({ draft, setDraft, touched }: { draft: WorkerDraft; setDraft: (fn: (d: WorkerDraft) => WorkerDraft) => void; touched: boolean }) {
  const answered = PERSONAL.filter((p) => draft.personal[p.key] !== undefined).length
  return (
    <section className="stack lg" aria-labelledby="s3">
      <div className="stack sm">
        <div className="eyebrow">STEP 3 · ORGANIZATION & ROLE</div>
        <h1 id="s3" className="h1">회사와 나는 AI를 어떻게 쓰고 있나요?</h1>
        <p className="lead">회사가 AI를 얼마나 쓰는지, 내가 요즘 어떻게 일하는지 물어볼게요.</p>
      </div>

      <fieldset className="stack">
        <legend className="h3" style={{ marginBottom: 12 }}>회사의 AI 도입 단계</legend>
        <div className="options cols-2">
          {Object.entries(MATURITY).map(([k, m]) => (
            <label key={k} className={`opt ${draft.ai_maturity === k ? 'selected' : ''}`}>
              <input type="radio" name="maturity" checked={draft.ai_maturity === k} onChange={() => setDraft((d) => ({ ...d, ai_maturity: k }))} />
              <span className="t">{m.label}</span>
              <span className="d">{m.desc}</span>
            </label>
          ))}
        </div>
        {touched && !draft.ai_maturity && <p role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>도입 단계를 선택해주세요.</p>}
      </fieldset>

      <div className="card paper stack lg">
        <div className="row between">
          <h2 className="h3">나의 역할 6가지</h2>
          <span className="chip gray num">{answered} / 6 응답</span>
        </div>
        <p className="muted small" style={{ marginTop: -14 }}>
          시험이 아니에요. 요즘 실제로 하고 있는 만큼 솔직하게 골라주세요.
        </p>
        {PERSONAL.map((p) => (
          <ScaleRadio
            key={p.key}
            legend={
              <>
                <span className="strong" style={{ color: 'var(--ink)', fontSize: 15.5 }}>{p.question}</span>
                <span className="muted"> · {p.label}</span>
              </>
            }
            options={BEHAVIOR_SCALE}
            value={draft.personal[p.key]}
            onChange={(v) => setDraft((d) => ({ ...d, personal: { ...d.personal, [p.key]: v ?? undefined } }))}
            error={touched && draft.personal[p.key] === undefined ? '응답해주세요.' : undefined}
          />
        ))}
      </div>

      <div className="field">
        <label htmlFor="size">회사 규모 (선택 · 계산에 쓰지 않아요)</label>
        <select id="size" value={draft.company_size ?? ''} onChange={(e) => setDraft((d) => ({ ...d, company_size: e.target.value || undefined }))}>
          <option value="">선택 안 함</option>
          {['1–9명', '10–49명', '50–249명', '250명 이상'].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <span className="hint">현재 엔진은 회사 규모를 수집만 해요. 기업 도입률을 개인 자동화율로 바꾸지 않아요.</span>
      </div>
    </section>
  )
}

function StepReview({ draft, example }: { draft: WorkerDraft; example: boolean }) {
  const cat = useCatalog()
  const occ = cat.occupationById.get(draft.occupation_id!)
  const missing = missingWorker(draft)
  const rows: { k: string; v: React.ReactNode; to: string }[] = [
    { k: '직군', v: occ?.name_ko, to: '/worker/start/1' },
    { k: '역할 수준', v: CAREER_LEVELS.find((l) => l.id === draft.career_level)?.label, to: '/worker/start/1' },
    { k: '업무 비중', v: draft.weights ? `직접 입력 · 합계 ${sumOf(draft.weights).toFixed(0)}%` : <span>평균값 그대로 <span className="chip warn">확인 필요</span></span>, to: '/worker/start/2' },
    { k: 'AI 도입 단계', v: draft.ai_maturity ? MATURITY[draft.ai_maturity].label : <span className="muted">미응답</span>, to: '/worker/start/3' },
    ...PERSONAL.map((p) => ({ k: p.label, v: draft.personal[p.key] !== undefined ? BEHAVIOR_SCALE.find((b) => b.v === draft.personal[p.key])?.label : <span className="muted">미응답</span>, to: '/worker/start/3' })),
    { k: '일자리 수요', v: <span className="muted">자료가 없어 계산에서 뺐어요</span>, to: '' },
  ]
  return (
    <section className="stack lg" aria-labelledby="s4">
      <div className="stack sm">
        <div className="eyebrow">STEP 4 · REVIEW</div>
        <h1 id="s4" className="h1">입력 내용을 확인해주세요</h1>
        <p className="lead">지금 입력으로 결과를 만들어요. 나중에 입력을 바꿔도 이번 결과는 그대로 남아요.</p>
      </div>
      {example && <Notice kind="info">예시 입력(SW개발자 · 미들)이에요. 그대로 계산해보거나, 내 상황에 맞게 고쳐보세요.</Notice>}
      <div className="table-wrap">
        <table className="table">
          <tbody>
            {rows.map((r) => (
              <tr key={r.k}>
                <th scope="row" style={{ width: '38%' }}>{r.k}</th>
                <td>{r.v}</td>
                <td style={{ textAlign: 'right', width: 70 }}>
                  {r.to && (
                    <Link to={r.to} className="link small" aria-label={`${r.k} 수정`}>
                      수정
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {missing.length > 0 && (
        <Notice kind="error" role="alert">
          아직 입력하지 않은 항목이 있어요: {missing.join(', ')}
        </Notice>
      )}
      {!draft.weights && <Notice>업무 시간을 직접 고치지 않으면 이 직군의 평균적인 값으로 계산해요. 내 실제와 다를수록 결과도 달라져요.</Notice>}
      <Notice>
        결과는 전문가 검토 전의 초기 계산 방식(버전 {cat.worker_model_version})으로 만들어요. 미래를 맞히는 예언이 아니라, 준비를 돕는 참고 자료예요.
      </Notice>
    </section>
  )
}
