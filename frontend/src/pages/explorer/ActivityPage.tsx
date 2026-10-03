import { useEffect, useState } from 'react'
import { Link, useBlocker, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { ConfirmDialog, Empty, Notice, ScaleRadio, Steps } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { useExplorerCalc } from '../../lib/explorer'
import { familyLabel, minutesText, REACTION_SCALE, STAGES } from '../../lib/labels'
import { useStore, type Submission } from '../../lib/store'
import type { Stage } from '../../lib/types'

const LABELS = ['소개', '작업 1', '작업 2', '작업 3', '성찰', '완료']
const MAX_TEXT = 3000

export default function ActivityPage() {
  const { id } = useParams()
  const cat = useCatalog()
  const nav = useNavigate()
  const { data, update, device } = useStore()
  const act = id ? cat.activityById.get(id) : undefined
  const sub = id ? data.explorer.submissions[id] : undefined
  const stage = data.explorer.draft.stage
  const [touched, setTouched] = useState(false)
  const calc = useExplorerCalc()
  useTitle(act ? `체험 · ${act.title.split(': ')[1] ?? act.title}` : '체험을 찾을 수 없어요')

  const step = sub?.step ?? 0
  const hasDraftText = !!sub && sub.status === 'draft' && (sub.drafts.some((t) => t.trim()) || !!sub.reflection.trim())

  // 작성 중인 초안이 있으면 다른 화면으로 이동할 때 확인한다.
  const blocker = useBlocker(({ currentLocation, nextLocation }) => hasDraftText && currentLocation.pathname !== nextLocation.pathname)
  useEffect(() => {
    if (!hasDraftText || device.status === 'on') return
    const h = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', h)
    return () => window.removeEventListener('beforeunload', h)
  }, [hasDraftText, device.status])

  if (!act)
    return (
      <div className="wrap page narrow">
        <Empty title="체험을 찾을 수 없어요" action={<Link to="/occupations" className="btn primary">직군 둘러보기</Link>} />
      </div>
    )

  const occ = cat.occupationById.get(act.occupation_id)!
  const variant = stage ? act.stage_variants[stage] : undefined
  const weekly = data.explorer.draft.weekly_minutes ?? 60
  const sessions = variant ? Math.ceil(variant.minutes / weekly) : 1

  const save = (patch: Partial<Submission>) =>
    update((d) => {
      const prev: Submission = d.explorer.submissions[act.activity_id] ?? { activity_id: act.activity_id, step: 0, drafts: ['', '', ''], reflection: '', status: 'draft', updated_at: '', completions: [] }
      return { ...d, explorer: { ...d.explorer, submissions: { ...d.explorer.submissions, [act.activity_id]: { ...prev, ...patch, updated_at: new Date().toISOString() } } } }
    })
  const go = (s: number) => {
    setTouched(false)
    save({ step: s, status: s === 5 ? 'completed' : 'draft' })
    window.scrollTo({ top: 0 })
  }
  const setStage = (s: Stage) => update((d) => ({ ...d, explorer: { ...d.explorer, draft: { ...d.explorer.draft, stage: s } } }))
  const complete = () => {
    setTouched(true)
    if (sub?.enjoyment === undefined || sub?.repeat_interest === undefined) return
    update((d) => {
      const s = d.explorer.submissions[act.activity_id]!
      const done: Submission = { ...s, step: 5, status: 'completed', updated_at: new Date().toISOString(), completions: [...s.completions, { at: new Date().toISOString(), enjoyment: s.enjoyment!, repeat_interest: s.repeat_interest! }] }
      return { ...d, explorer: { ...d.explorer, submissions: { ...d.explorer.submissions, [act.activity_id]: done } } }
    })
    setTouched(false)
    window.scrollTo({ top: 0 })
  }
  const recalc = async () => {
    const r = await calc.calc()
    if (r) nav('/explore/result')
  }
  const other = (cat.activitiesByOccupation.get(act.occupation_id) ?? []).find((a) => a.activity_id !== act.activity_id)
  const canRecalc = !!stage

  return (
    <div className="wrap page form">
      <div className="stack lg">
        <div className="stack sm">
          <Link to={`/occupations/${occ.occupation_id}`} className="link small">
            {occ.name_ko} · {familyLabel(occ.family)}
          </Link>
          <h1 className="h1">{act.title.split(': ')[1] ?? act.title}</h1>
        </div>
        <Steps labels={LABELS} current={step} />

        {step === 0 && (
          <section className="stack lg" aria-label="체험 소개">
            {!stage ? (
              <div className="card soft stack">
                <h2 className="h3">학습 단계를 골라주세요</h2>
                <p className="small muted">단계마다 체험 범위와 시간이 달라요.</p>
                <div className="options cols-2">
                  {STAGES.map((s) => (
                    <button key={s.id} type="button" className="opt" onClick={() => setStage(s.id)}>
                      <span className="t">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid-2">
                <div className="metric">
                  <span className="k">{STAGES.find((s) => s.id === stage)?.label} 기준 시간</span>
                  <span className="v">{minutesText(variant!.minutes)}</span>
                  <span className="d">주당 {minutesText(weekly)} 기준 {sessions > 1 ? `${sessions}회로 나눠서 해요` : '한 번에 할 수 있어요'}</span>
                </div>
                <div className="metric">
                  <span className="k">이번 체험 범위</span>
                  <span className="d" style={{ fontSize: 14.5, color: 'var(--ink)' }}>{variant!.scope}</span>
                </div>
              </div>
            )}
            <div className="card">
              <h2 className="h3">결과물</h2>
              <p>{act.deliverable}</p>
              <h2 className="h3">스스로 확인할 기준</h2>
              <ul className="stack sm" style={{ paddingLeft: 20 }}>
                {act.rubric.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <Notice icon="shield">
              <strong>가상 사례로만 해요.</strong> {act.restrictions}. AI가 결과물을 채점하지 않아요.
            </Notice>
            {sub?.completions.length ? <Notice kind="ok">이미 {sub.completions.length}번 완료했어요. 다시 하면 가장 최근 반응만 계산에 쓰고, 이전 기록은 남겨둬요.</Notice> : null}
            <div className="btn-row stretch">
              <button className="btn primary lg" disabled={!stage} onClick={() => go(sub && sub.status === 'draft' && sub.step > 0 ? sub.step : 1)}>
                {sub && sub.status === 'draft' && sub.step > 0 ? '이어하기' : sub?.completions.length ? '다시 해보기' : '체험 시작'} <Icon name="arrow" />
              </button>
            </div>
          </section>
        )}

        {step >= 1 && step <= 3 && (
          <section className="stack lg" aria-label={`작업 ${step}`}>
            <div className="card soft">
              <span className="small strong">작업 {step} / 3</span>
              <p className="h3">{act.steps[step - 1]}</p>
              {variant && <p className="small muted">범위: {variant.scope}</p>}
            </div>
            <div className="field">
              <label htmlFor="draft">나의 초안</label>
              <textarea
                id="draft"
                value={sub?.drafts[step - 1] ?? ''}
                maxLength={MAX_TEXT}
                placeholder="떠오르는 대로 적어보세요. 정답은 없어요."
                onChange={(e) => {
                  const drafts = [...(sub?.drafts ?? ['', '', ''])]
                  drafts[step - 1] = e.target.value
                  save({ drafts })
                }}
              />
              <span className="hint">
                {(sub?.drafts[step - 1] ?? '').length} / {MAX_TEXT}자 · {device.status === 'on' ? '이 기기에 자동 저장돼요' : '현재 탭에만 보관돼요 (새로고침하면 사라져요)'}
              </span>
            </div>
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <button className="btn" onClick={() => go(step - 1)}>
                <Icon name="back" /> 이전
              </button>
              <button className="btn primary" onClick={() => go(step + 1)}>
                {step < 3 ? '다음 작업' : '성찰하기'} <Icon name="arrow" />
              </button>
            </div>
          </section>
        )}

        {step === 4 && (
          <section className="stack lg" aria-label="성찰">
            <div className="stack sm">
              <h2 className="h2">해보니 어땠나요?</h2>
              <p className="muted">두 질문의 답만 탐색 적합지수에 반영돼요. 결과물의 완성도는 점수에 넣지 않아요.</p>
            </div>
            <ScaleRadio legend={<span className="strong" style={{ color: 'var(--ink)', fontSize: 16 }}>과정이 즐거웠나요?</span>} options={REACTION_SCALE} value={sub?.enjoyment} onChange={(v) => save({ enjoyment: v ?? undefined })} error={touched && sub?.enjoyment === undefined ? '골라주세요.' : undefined} />
            <ScaleRadio legend={<span className="strong" style={{ color: 'var(--ink)', fontSize: 16 }}>이 활동을 다시 해보고 싶나요?</span>} options={REACTION_SCALE} value={sub?.repeat_interest} onChange={(v) => save({ repeat_interest: v ?? undefined })} error={touched && sub?.repeat_interest === undefined ? '골라주세요.' : undefined} />
            <div className="field">
              <label htmlFor="refl">어려웠던 점, 다시 해보고 싶은 부분 (선택)</label>
              <textarea id="refl" value={sub?.reflection ?? ''} maxLength={MAX_TEXT} onChange={(e) => save({ reflection: e.target.value })} />
              <span className="hint">기록으로만 남고, 리포트 공유 시 기본으로 빠져요.</span>
            </div>
            <div className="btn-row" style={{ justifyContent: 'space-between' }}>
              <button className="btn" onClick={() => go(3)}>
                <Icon name="back" /> 이전
              </button>
              <button className="btn primary lg" onClick={complete}>
                체험 완료 <Icon name="check" />
              </button>
            </div>
          </section>
        )}

        {step === 5 && (
          <section className="stack lg" aria-label="체험 완료">
            <Notice kind="ok" role="status">
              체험을 완료했어요. 반응(즐거움 {sub?.completions.at(-1)?.enjoyment}, 다시 해보고 싶음 {sub?.completions.at(-1)?.repeat_interest})이 기록됐어요.
            </Notice>
            <div className="grid-2">
              <div className="card soft">
                <h2 className="h3">다시 계산하기</h2>
                <p className="small muted">완료한 체험 반응을 반영해 후보를 다시 계산해요. 과제를 많이 했다고 점수가 오르지는 않아요.</p>
                {calc.error && <Notice kind="error" role="alert">{calc.error.message}</Notice>}
                <button className="btn primary sm" onClick={recalc} disabled={!canRecalc || calc.loading} aria-busy={calc.loading} style={{ alignSelf: 'flex-start' }}>
                  {calc.loading ? '계산 중…' : '체험 반영해 다시 계산'}
                </button>
              </div>
              <div className="card">
                <h2 className="h3">다음 체험</h2>
                {other && (
                  <Link to={`/activities/${other.activity_id}`} className="link">
                    같은 직군 두 번째 업무: {other.title.split(': ')[1]}
                  </Link>
                )}
                <Link to="/occupations" className="link">다른 영역 직군 체험하기</Link>
                <Link to="/explore/plan" className="link">준비 계획 보기</Link>
              </div>
            </div>
            <button className="btn ghost sm" style={{ alignSelf: 'flex-start' }} onClick={() => go(1)}>
              <Icon name="refresh" /> 이 체험 다시 하기
            </button>
          </section>
        )}
      </div>

      <ConfirmDialog
        open={blocker.state === 'blocked'}
        title="작성 중인 체험이 있어요"
        confirmLabel="나가기"
        onCancel={() => blocker.reset?.()}
        onConfirm={() => blocker.proceed?.()}
      >
        초안은 {device.status === 'on' ? '이 기기에 저장돼 있어 나중에 이어할 수 있어요.' : '현재 탭에 남아 있어 돌아오면 이어할 수 있어요. 새로고침하거나 탭을 닫으면 사라져요.'}
      </ConfirmDialog>
    </div>
  )
}
