import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Notice, PageHead } from '../../components/ui'
import { fmt } from '../../lib/labels'
import { useStore } from '../../lib/store'

export const WORKER_PLAN = [
  { id: 'record', title: '이번 주 업무 시간 기록하기', desc: '실제 업무 비중이 입력과 같은지 확인해요. 다르면 다시 분석해요.' },
  { id: 'experiment', title: '반복 업무 하나에 AI 적용해보기', desc: 'AI가 대신할 가능성이 높은 업무부터. 걸린 시간과 확인하는 데 쓴 시간을 함께 적어요.' },
  { id: 'review', title: '검토 기준 정하기', desc: 'AI 결과에서 사람이 판단할 부분과 승인 기준을 적어둬요.' },
  { id: 'reallocate', title: '절약한 시간 재배분', desc: '판단·고객 응대·확인처럼 사람이 꼭 필요한 일로 시간을 옮겨요.' },
  { id: 'check', title: '한 달 뒤 점검과 재분석', desc: '역할·회사 도입·업무 비중이 실제로 바뀌었을 때만 다시 계산해요.' },
]

export default function WorkerPlan() {
  useTitle('실행 계획')
  const { data, update } = useStore()
  const done = data.worker.planDone
  const cur = data.worker.current
  const focus = cur ? [...cur.result.paths.base[0].tasks].filter((t) => t.weight > 0).sort((a, b) => b.automation * b.weight - a.automation * a.weight)[0] : undefined
  const toggle = (id: string) => update((d) => ({ ...d, worker: { ...d.worker, planDone: { ...d.worker.planDone, [id]: !d.worker.planDone[id] } } }))
  const n = WORKER_PLAN.filter((p) => done[p.id]).length

  return (
    <div className="wrap page form">
      <PageHead eyebrow="ACTION PLAN" title="업무를 바꾸는 작은 실험" lead="학습 시간만 쌓기보다 실제 업무에 적용하고 결과를 검증한 기록을 남겨요." />
      <div className="stack lg">
        {focus && (
          <div className="card soft">
            <span className="small strong">먼저 실험해볼 업무</span>
            <p className="h3">{focus.name_ko}</p>
            <p className="small muted num">내 비중 {fmt(focus.weight * 100)}% · AI가 대신할 가능성 {fmt(focus.automation)}점</p>
          </div>
        )}
        <div className="row between">
          <h2 className="h3">5단계 계획</h2>
          <span className="chip gray num">{n} / {WORKER_PLAN.length} 완료</span>
        </div>
        <ul className="stack sm" style={{ listStyle: 'none' }}>
          {WORKER_PLAN.map((p, i) => (
            <li key={p.id}>
              <label className={`opt ${done[p.id] ? 'selected' : ''}`} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
                <input type="checkbox" checked={!!done[p.id]} onChange={() => toggle(p.id)} style={{ position: 'static', opacity: 1, pointerEvents: 'auto', width: 22, height: 22, marginTop: 2, accentColor: 'var(--blue)' }} />
                <span className="stack sm" style={{ gap: 2 }}>
                  <span className="t">{i + 1}. {p.title}</span>
                  <span className="d">{p.desc}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>
        <Notice>체크한다고 점수가 바로 바뀌지는 않아요. 실제로 일하는 방식이 바뀌면 다시 분석해서 확인해보세요.</Notice>
        <div className="btn-row stretch">
          <Link to="/practice?mode=worker" className="btn primary">
            <Icon name="pen" /> 업무 적용 기록하기
          </Link>
          <Link to="/worker/result" className="btn">
            결과로 돌아가기
          </Link>
        </div>
      </div>
    </div>
  )
}
