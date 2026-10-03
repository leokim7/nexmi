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
            지금과 같은 방식으로 일하기 어려워지는 시점을 세 가지 가정으로 계산하고, 어떤 업무부터 바꿀 수 있는지 함께 살펴봐요.
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
            <h2 className="h3">‘예상 종료일’은 이런 뜻이에요</h2>
            <p className="muted">
              지금 업무 구성 그대로일 때, 초기 모델의 <strong>종합 재편 지수</strong>가 기준(60)에 처음 닿는 연도예요. 지금 하는 방식의 일이 크게 바뀌는 시점이지,
              <strong> 해고일이나 직업이 사라지는 날이 아니에요.</strong>
            </p>
            <p className="muted small">2040년까지 기준에 닿지 않으면 ‘2040년까지 기준 미도달’로 보여드려요. 영원히 안전하다는 뜻은 아니에요.</p>
          </div>
          <div className="card">
            <h2 className="h3">4단계 · 약 5분</h2>
            <ol className="stack sm" style={{ paddingLeft: 20 }}>
              <li>직군과 역할 수준</li>
              <li>업무 14개에 쓰는 시간 비중</li>
              <li>회사의 AI 도입 단계와 나의 역할 6가지</li>
              <li>입력 확인 후 계산</li>
            </ol>
          </div>
          <Notice>입력은 계산에만 쓰이고 서버에 저장되지 않아요. 새로고침하면 사라지니, 남기고 싶다면 ‘내 기록’에서 기기 저장을 켜주세요.</Notice>
        </aside>
      </div>
    </div>
  )
}
