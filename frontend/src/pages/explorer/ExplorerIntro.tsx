import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Notice } from '../../components/ui'
import { STAGES, stageLabel } from '../../lib/labels'
import { useStore } from '../../lib/store'
import { answeredInterestCount } from '../../lib/explorer'
import type { Stage } from '../../lib/types'

export default function ExplorerIntro() {
  useTitle('진로·직업 탐색')
  const { data, update } = useStore()
  const nav = useNavigate()
  const d = data.explorer.draft
  const cur = data.explorer.current

  const choose = (s: Stage) => {
    update((x) => ({ ...x, explorer: { ...x.explorer, draft: { ...x.explorer.draft, stage: s } } }))
    const first = answeredInterestCount(d)
    nav(`/explore/interests/${Math.min(8, first + 1)}`)
  }

  return (
    <div className="wrap page">
      <div className="grid-side">
        <div className="stack lg">
          <div className="eyebrow">FOR EXPLORERS</div>
          <h1 className="display" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>
            나에게 맞는 <br />
            진로·직업은?
          </h1>
          <p className="lead" style={{ maxWidth: 560 }}>8가지 활동에 대한 관심으로 탐색할 직군 후보를 찾고, 작은 체험으로 직접 확인해요. 모르는 질문은 ‘아직 모름’으로 넘어가도 괜찮아요.</p>

          <section className="stack" aria-labelledby="stage-h">
            <h2 id="stage-h" className="h3">지금 어떤 단계인가요?</h2>
            <div className="options cols-2" role="group" aria-label="학습 단계">
              {STAGES.map((s) => (
                <button key={s.id} type="button" className="opt" aria-pressed={d.stage === s.id} onClick={() => choose(s.id)}>
                  <span className="t">{s.label}</span>
                  <span className="d">{s.focus}</span>
                  <span className="d">{s.minutes}</span>
                </button>
              ))}
            </div>
            {d.stage && answeredInterestCount(d) > 0 && (
              <p className="small muted">
                {stageLabel(d.stage)} · 관심 질문 {answeredInterestCount(d)}/8 응답함. 단계를 바꿔도 지금까지의 응답은 유지돼요.
              </p>
            )}
          </section>
        </div>
        <aside className="stack">
          {cur && (
            <Link to="/explore/result" className="card soft hover card-link">
              <span className="small strong">최근 탐색 결과</span>
              <span className="h3">{cur.result.status === 'exploration_ready' ? cur.result.recommendations.map((r) => r.name_ko).slice(0, 3).join(' · ') : '조금 더 알아보면 좋겠어요'}</span>
              <span className="link small">결과 다시 보기</span>
            </Link>
          )}
          <div className="card paper">
            <h2 className="h3">이렇게 진행돼요 · 약 3분</h2>
            <ol className="stack sm" style={{ paddingLeft: 20 }}>
              <li>학습 단계 선택</li>
              <li>8가지 활동 관심 (한 번에 한 질문)</li>
              <li>체험 시간·경험·준비 수준 (선택, 건너뛰기 가능)</li>
              <li>탐색 후보 확인 → 직군 비교 → 작은 체험</li>
            </ol>
          </div>
          <div className="card">
            <h2 className="h3">먼저 둘러보고 싶다면</h2>
            <p className="muted small">질문 없이 직군 50개의 실제 업무·체험·학습 경로를 볼 수 있어요.</p>
            <Link to="/occupations" className="btn sm">
              <Icon name="search" /> 직군 둘러보기
            </Link>
          </div>
          <Notice>‘탐색 적합지수’는 관심을 정리하는 지수예요. 적성검사나 합격·성공 확률이 아니에요.</Notice>
        </aside>
      </div>
    </div>
  )
}
