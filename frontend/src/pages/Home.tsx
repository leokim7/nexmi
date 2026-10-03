import { Link } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { useTitle } from '../components/Layout'
import { useReveal } from '../components/ui'
import { useCatalog } from '../lib/catalog'
import { stageLabel, yearText } from '../lib/labels'
import { useStore } from '../lib/store'

export default function Home() {
  useTitle('')
  useReveal()
  const { data } = useStore()
  const cat = useCatalog()
  const w = data.worker.current
  const e = data.explorer.current
  const inProgress = Object.values(data.explorer.submissions).filter((s) => s.status === 'draft')

  return (
    <div className="wrap page" style={{ paddingTop: 22 }}>
      <section className="hero-shell">
        <div className="stack lg">
          <div className="eyebrow">MY WORK · MY NEXT</div>
          <h1 className="display">
            지금 하는 일의 미래, <br />
            <strong>나에게 맞는 다음 일.</strong>
          </h1>
          <p className="lead" style={{ maxWidth: 520 }}>
            어떤 질문에서 시작할지 고르세요. 결과는 정답이 아니라 다음 행동을 고르는 출발점이에요.
          </p>
          <div className="btn-row stretch">
            <Link to="/worker" className="btn primary lg">
              내 직업 미래 분석 <Icon name="arrow" />
            </Link>
            <Link to="/explore" className="btn lg">
              진로·직업 탐색 <Icon name="arrow" />
            </Link>
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <span className="chip line" style={{ alignSelf: 'flex-start' }}>예시 화면</span>
          <div className="float-card">
            <div className="small muted">내 일이 크게 바뀌는 해</div>
            <div className="h2 num">2031년</div>
            <div className="small muted">AI가 퍼지는 속도별로 보여줘요</div>
          </div>
          <div className="float-card" style={{ marginLeft: 48 }}>
            <div className="small muted">탐색 후보</div>
            <div className="row" style={{ marginTop: 6 }}>
              <span className="chip">데이터분석가</span>
              <span className="chip">UX/UI디자이너</span>
            </div>
          </div>
          <div className="float-card dark">
            <div className="row">
              <Icon name="check" size={18} />
              <strong>이번 주 작은 과제</strong>
            </div>
            <div className="small muted" style={{ marginTop: 4 }}>
              AI 출력에서 오류 3개 찾아 기록하기 · 30분
            </div>
          </div>
        </div>
      </section>

      {(w || e || inProgress.length > 0) && (
        <section className="section" style={{ paddingBottom: 0 }} aria-labelledby="continue-h">
          <div className="section-head">
            <div>
              <div className="eyebrow">CONTINUE</div>
              <h2 id="continue-h" className="h2">이어서 하기</h2>
            </div>
          </div>
          <div className="grid-3">
            {w && (
              <Link to="/worker/result" className="card hover card-link">
                <span className="chip gray">직업 미래</span>
                <span className="h3">{cat.occupationById.get(w.input_snapshot.occupation_id)?.name_ko}</span>
                <span className="muted">지금 속도 기준 · {yearText(w.result.crossings.base.career_transformation)}</span>
              </Link>
            )}
            {e && (
              <Link to="/explore/result" className="card hover card-link">
                <span className="chip gray">진로 탐색 · {stageLabel(e.input_snapshot.stage)}</span>
                <span className="h3">
                  {e.result.status === 'exploration_ready' ? `후보 ${e.result.recommendations.length}개` : '조금 더 알아보면 좋겠어요'}
                </span>
                <span className="muted">{e.result.recommendations.slice(0, 2).map((r) => r.name_ko).join(' · ') || '추가 응답으로 후보를 찾아요'}</span>
              </Link>
            )}
            {inProgress.slice(0, 1).map((s) => (
              <Link key={s.activity_id} to={`/activities/${s.activity_id}`} className="card hover card-link">
                <span className="chip gray">진행 중인 체험</span>
                <span className="h3">{cat.activityById.get(s.activity_id)?.title}</span>
                <span className="muted">{s.step}단계에서 이어하기</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="section" aria-labelledby="modes-h">
        <div className="section-head">
          <div>
            <div className="eyebrow">TWO QUESTIONS</div>
            <h2 id="modes-h" className="h1">
              두 가지 질문, <br />
              하나의 기록
            </h2>
          </div>
          <p>재직자와 진로 고민자는 서로 다른 계산을 사용해요. 두 결과를 합친 점수는 만들지 않아요.</p>
        </div>
        <div className="grid-hero">
          <article className="card primary mode-card reveal">
            <div className="icon-box">
              <Icon name="briefcase" />
            </div>
            <span className="eyebrow" style={{ color: '#fff', opacity: 0.8 }}>FOR WORKERS</span>
            <h3 className="h2">내 직업 예상 종료일은?</h3>
            <p className="muted">
              지금처럼 일한다면 AI 때문에 언제 일하는 방식이 크게 바뀌는지 알려드려요. 해고일이 아니라, 준비를 시작할 때를 알려주는 신호예요.
            </p>
            <ul className="stack sm" style={{ listStyle: 'none' }}>
              {['직군·역할 선택 → 업무 비중 → AI 도입·개인 역할', 'AI가 먼저 맡게 될 내 업무', '업무를 바꾸면 어떻게 달라지는지 미리 계산'].map((t) => (
                <li key={t} className="row" style={{ flexWrap: 'nowrap' }}>
                  <Icon name="check" size={18} />
                  {t}
                </li>
              ))}
            </ul>
            <div>
              <Link to="/worker" className="btn" style={{ marginTop: 6 }}>
                시작하기 · 약 5분 <Icon name="arrow" />
              </Link>
            </div>
          </article>
          <article className="card paper mode-card reveal delay-1">
            <div className="icon-box">
              <Icon name="compass" />
            </div>
            <span className="eyebrow">FOR EXPLORERS</span>
            <h3 className="h2">나에게 맞는 진로·직업은?</h3>
            <p className="muted">중·고등학생, 대학생, 취업 준비생이 흥미를 실제 업무와 연결하고, 작은 체험으로 확인해요.</p>
            <div className="chips">
              {['중학생', '고등학생', '대학생', '취업 준비생'].map((s) => (
                <span key={s} className="chip line">{s}</span>
              ))}
            </div>
            <div className="btn-row">
              <Link to="/explore" className="btn primary">
                시작하기 · 약 3분 <Icon name="arrow" />
              </Link>
              <Link to="/occupations" className="btn ghost">
                직군 50개 둘러보기
              </Link>
            </div>
          </article>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }} aria-labelledby="loop-h">
        <div className="section-head">
          <div>
            <div className="eyebrow">AFTER THE RESULT</div>
            <h2 id="loop-h" className="h1">결과 다음이 더 중요해요</h2>
          </div>
          <p>분석 → 이번 주 작은 행동 → 기록 → 다시 계산. 날짜를 흔드는 알림이나 가짜 소식은 보내지 않아요.</p>
        </div>
        <div className="grid-4">
          {[
            { i: 'chart', t: '분석', d: '엔진 계산 결과를 근거와 함께 확인' },
            { i: 'flag', t: '이번 주 과제', d: '검토된 목록에서 시간에 맞는 작은 행동' },
            { i: 'pen', t: '기록', d: '업무 적용·체험 결과를 내 기록으로' },
            { i: 'refresh', t: '다시 계산', d: '실제로 바뀐 입력으로 변화 비교' },
          ].map((s, i) => (
            <div key={s.t} className={`card tight reveal delay-${i % 4}`}>
              <div className="icon-box">
                <Icon name={s.i} />
              </div>
              <h3 className="h3">{s.t}</h3>
              <p className="muted small">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card dark reveal" aria-labelledby="trust-h">
        <div className="eyebrow" style={{ color: '#8fb3ff' }}>HONEST BY DESIGN</div>
        <h2 id="trust-h" className="h2">이 서비스가 하지 않는 것</h2>
        <div className="grid-3" style={{ marginTop: 6 }}>
          <p className="muted">
            <strong style={{ color: '#fff' }}>미래를 맞히는 예언이 아니에요.</strong> 아직 전문가 검토 전의 초기 계산 방식이라, 준비를 돕는 참고 자료로 써주세요.
          </p>
          <p className="muted">
            <strong style={{ color: '#fff' }}>적성검사가 아니에요.</strong> 내 관심과 직업이 얼마나 겹치는지 보여줄 뿐, 합격·성공 확률을 말하지 않아요.
          </p>
          <p className="muted">
            <strong style={{ color: '#fff' }}>입력한 내용을 저장하지 않아요.</strong> 계산만 하고 바로 잊어요. 남기고 싶을 때만 내 기기에 저장해요.
          </p>
        </div>
      </section>
    </div>
  )
}
