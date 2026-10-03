import { Link } from 'react-router-dom'
import { useTitle } from '../../components/Layout'
import { Empty, Notice, PageHead } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { minutesText, stageLabel } from '../../lib/labels'
import { useStore } from '../../lib/store'
import type { Stage } from '../../lib/types'

const STAGE_FOCUS: Record<Stage, string[]> = {
  middle: ['서로 다른 영역의 체험을 골고루 해보기', '재미있었던 순간을 짧게 기록하기', '관심 직업을 가족·선생님과 이야기해보기', '다시 관심 질문에 답해 변화 보기'],
  high: ['관심 직군의 실제 업무와 과목 연결하기', '같은 직군의 두 번째 업무 체험하기', '관련 전공의 공식 요건 직접 확인하기', '체험 반응으로 다시 계산하기'],
  university: ['직무 결과물 하나를 포트폴리오 초안으로', '결과 검증 기준과 한계를 함께 적기', '관련 직무 담당자에게 확인할 질문 정리', '체험 반응으로 다시 계산하기'],
  jobseeker: ['관심 직무의 실제 업무 14개 확인하기', '직무 결과물과 검증 과정 남기기', '다음 연습 계획 세우기', '체험 반응으로 다시 계산하기'],
}

export default function ExplorerPlan() {
  useTitle('준비 계획')
  const cat = useCatalog()
  const { data, update } = useStore()
  const stage = data.explorer.draft.stage
  const weekly = data.explorer.draft.weekly_minutes ?? 60
  const recs = data.explorer.current?.result.recommendations ?? []
  const done = data.explorer.planDone
  const toggle = (k: string) => update((d) => ({ ...d, explorer: { ...d.explorer, planDone: { ...d.explorer.planDone, [k]: !d.explorer.planDone[k] } } }))

  if (!stage)
    return (
      <div className="wrap page narrow">
        <Empty title="학습 단계를 먼저 골라주세요" action={<Link to="/explore" className="btn primary">탐색 시작</Link>}>
          단계에 맞는 계획과 체험 시간을 보여드려요.
        </Empty>
      </div>
    )

  const acts = recs.slice(0, 3).map((r) => r.next_activity)
  const cb = (k: string, label: React.ReactNode, sub?: React.ReactNode) => (
    <label key={k} className={`opt ${done[k] ? 'selected' : ''}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
      <input type="checkbox" checked={!!done[k]} onChange={() => toggle(k)} style={{ position: 'static', opacity: 1, pointerEvents: 'auto', width: 22, height: 22, marginTop: 2, accentColor: 'var(--blue)' }} />
      <span className="stack sm" style={{ gap: 2 }}>
        <span className="t">{label}</span>
        {sub && <span className="d">{sub}</span>}
      </span>
    </label>
  )

  return (
    <div className="wrap page form">
      <PageHead eyebrow="PLAN" title="나의 준비 계획" lead={`${stageLabel(stage)} · 주당 ${minutesText(weekly)} 기준이에요. 긴 체험은 여러 번으로 나눠요.`} />
      <div className="stack lg">
        <section className="stack">
          <h2 className="h3">{stageLabel(stage)}에게 맞는 4단계</h2>
          {STAGE_FOCUS[stage].map((t, i) => cb(`focus-${i}`, `${i + 1}. ${t}`))}
        </section>
        <section className="stack">
          <h2 className="h3">이번에 해볼 체험</h2>
          {acts.length === 0 ? (
            <p className="muted">탐색 결과가 생기면 후보별 다음 체험이 여기에 나와요.</p>
          ) : (
            acts.map((a) => {
              const sub = data.explorer.submissions[a.activity_id]
              const sessions = Math.ceil(a.stage_variants[stage].minutes / weekly)
              return cb(
                `act-${a.activity_id}`,
                <Link className="link" to={`/activities/${a.activity_id}`}>{a.title}</Link>,
                <>
                  {minutesText(a.stage_variants[stage].minutes)}
                  {sessions > 1 && ` · ${sessions}회로 나눠서`}
                  {sub?.completions.length ? ' · 완료함' : sub ? ' · 진행 중' : ''}
                </>,
              )
            })
          )}
        </section>
        <Notice>계획을 체크해도 점수가 오르지 않아요. 체험을 완료하고 즐거움·다시 해보고 싶음을 기록한 뒤 다시 계산할 때만 결과가 달라져요.</Notice>
        <div className="btn-row stretch">
          <Link to="/explore/result" className="btn primary">탐색 결과로</Link>
        </div>
        <p className="small muted">{cat.explorer_model_version} · 계획 항목은 검토된 고정 목록에서 골랐어요.</p>
      </div>
    </div>
  )
}
