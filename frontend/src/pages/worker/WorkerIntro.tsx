import { Link, useNavigate } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Notice } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { yearText } from '../../lib/labels'
import { useStore } from '../../lib/store'
import { draftFromInput, WORKER_EXAMPLE } from '../../lib/worker'

export default function WorkerIntro() {
  useTitle('내 직업 미래')
  const { data, update } = useStore()
  const cat = useCatalog()
  const nav = useNavigate()
  const cur = data.worker.current
  const started = !!data.worker.draft.occupation_id

  const loadExample = () => {
    const weights = cat.profiles.find((p) => p.occupation_id === 'O15' && p.career_level === 'mid')!.weights
    update((d) => ({ ...d, worker: { ...d.worker, draft: draftFromInput({ ...WORKER_EXAMPLE, task_weights: weights }, cat) } }))
    nav('/worker/start/4?example=1')
  }

  return (
    <div className="wrap page">
      <div className="grid-side">
        <div className="stack lg">
          <div className="eyebrow">FOR WORKERS</div>
          <h1 className="display" style={{ fontSize: 'clamp(36px,5vw,64px)' }}>
            내 직업 <br />
            예상 종료일은?
          </h1>
          <p className="lead" style={{ maxWidth: 560 }}>
            직군과 하는 일을 알려주면, AI 때문에 지금처럼 일하기 어려워지는 해를 계산해드려요. 어떤 업무부터 바꾸면 좋을지도 함께 알려드려요.
          </p>
          <div className="btn-row stretch">
            <Link to="/worker/start/1" className="btn primary lg">
              {started ? '입력 이어하기' : '내 업무 분석 시작'} <Icon name="arrow" />
            </Link>
            <button className="btn lg" onClick={loadExample}>
              예시 입력으로 둘러보기
            </button>
          </div>
          {cur && (
            <Link to="/worker/result" className="card soft hover card-link">
              <span className="small strong">최근 분석 결과</span>
              <span className="h3">
                {cat.occupationById.get(cur.input_snapshot.occupation_id)?.name_ko} · 기준 가정 {yearText(cur.result.crossings.base.career_transformation)}
              </span>
              <span className="link small">결과 다시 보기</span>
            </Link>
          )}
        </div>
        <aside className="stack">
          <div className="card paper">
            <h2 className="h3">‘종료일’은 해고일이 아니에요</h2>
            <p className="muted">
              지금처럼 일한다면, AI 때문에 <strong>일하는 방식이 크게 바뀌는 해</strong>예요. 그날 직업이 사라진다는 뜻이 아니라, 그 전에 준비하면 좋다는 신호예요.
            </p>
            <p className="muted small">2040년까지만 계산해요. 그 안에 큰 변화가 없으면 그렇게 알려드리고, AI가 내 업무 일부를 맡기 시작하는 해를 대신 보여드려요.</p>
          </div>
          <div className="card">
            <h2 className="h3">4단계 · 약 5분</h2>
            <ol className="stack sm" style={{ paddingLeft: 20 }}>
              <li>직군과 역할 수준</li>
              <li>업무 14개에 시간을 얼마나 쓰는지</li>
              <li>회사가 AI를 얼마나 쓰는지, 내가 하는 역할 6가지</li>
              <li>확인하고 결과 보기</li>
            </ol>
          </div>
          <Notice>입력한 내용은 계산에만 쓰고 저장하지 않아요. 새로고침하면 사라지니, 남기려면 ‘내 기록’에서 ‘이 기기에 저장’을 켜주세요.</Notice>
        </aside>
      </div>
    </div>
  )
}
