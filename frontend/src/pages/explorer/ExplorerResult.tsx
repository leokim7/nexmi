import { Link } from 'react-router-dom'
import { CompareToggle } from '../../components/CompareTray'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Notice } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { useExplorerCalc } from '../../lib/explorer'
import { CAPABILITY_LABELS, dateText, familyLabel, fmt, minutesText, stageLabel } from '../../lib/labels'
import { useStore } from '../../lib/store'
import type { Recommendation } from '../../lib/types'

export default function ExplorerResult() {
  useTitle('탐색 결과')
  const { data } = useStore()
  const cat = useCatalog()
  const cur = data.explorer.current
  const recalc = useExplorerCalc()

  if (!cur)
    return (
      <div className="wrap page narrow">
        <Empty title="아직 탐색 결과가 없어요" action={<Link to="/explore" className="btn primary">탐색 시작</Link>}>
          현재 탭에서 계산한 결과만 보여드려요.
        </Empty>
      </div>
    )

  const r = cur.result
  const completed = Object.values(data.explorer.submissions).filter((s) => s.completions.length > 0).length
  const usedCompleted = cur.input_snapshot.activity_results.length
  const stale = completed !== usedCompleted

  return (
    <div className="wrap page">
      <div className="stack lg">
        <div className="row between top">
          <div className="stack sm">
            <div className="eyebrow">EXPLORATION</div>
            <h1 className="h1">{r.status === 'exploration_ready' ? '탐색해볼 직군 후보' : '조금 더 알아보면 좋겠어요'}</h1>
            <div className="chips">
              <span className="chip gray">{stageLabel(cur.input_snapshot.stage)}</span>
              <span className="chip line">모델 {cur.model_version}</span>
              <span className="chip line">{dateText(cur.created_at)} 계산</span>
              {usedCompleted > 0 && <span className="chip ok">체험 {usedCompleted}개 반영</span>}
            </div>
          </div>
          <div className="btn-row no-print">
            <Link to="/explore/interests/1" className="btn sm">
              응답 고치기
            </Link>
            <Link to="/report/explorer" className="btn sm">
              <Icon name="print" /> 리포트
            </Link>
          </div>
        </div>

        {stale && (
          <Notice kind="info">
            이 결과 이후 완료한 체험이 있어요. 다시 계산하면 체험 반응이 반영돼요.{' '}
            <button className="link" onClick={() => recalc.calc()} disabled={recalc.loading}>
              {recalc.loading ? '계산 중…' : '다시 계산'}
            </button>
          </Notice>
        )}
        {recalc.error && <Notice kind="error" role="alert">{recalc.error.message}</Notice>}

        {r.status === 'needs_more_exploration' ? (
          <Insufficient missing={r.next_questions ?? []} />
        ) : (
          <>
            {r.next_action && <Notice kind="info">{r.next_action}</Notice>}
            {r.recommendations.length === 0 ? (
              <Empty title="응답한 관심과 맞는 후보를 찾지 못했어요" action={<Link to="/occupations" className="btn primary">직군 둘러보기</Link>}>
                각 직군의 관련 활동 중 3분의 2 이상에 답해야 계산돼요. ‘아직 모름’으로 답한 질문을 다시 확인해보세요.
              </Empty>
            ) : (
              <div className="stack">
                {r.recommendations.map((rec) => (
                  <RecCard key={rec.occupation_id} rec={rec} />
                ))}
              </div>
            )}
            <p className="small muted">
              정렬: 탐색 적합지수가 높은 순, 같은 영역은 최대 2개. 점수가 같으면 ID 순서이며 우열을 뜻하지 않아요.
            </p>
          </>
        )}

        {cur.input_snapshot.favorite_occupations.length > 0 && (
          <section className="card paper">
            <h2 className="h3">내가 고른 관심 직업</h2>
            <p className="small muted">추천과 별개로 탐색 목록에 있어요.</p>
            <div className="chips">
              {cur.input_snapshot.favorite_occupations.map((id) => (
                <Link key={id} to={`/occupations/${id}`} className="chip">
                  {cat.occupationById.get(id)?.name_ko} <Icon name="arrow" />
                </Link>
              ))}
            </div>
          </section>
        )}

        <section className="card">
          <h2 className="h3">이 결과에서 알 수 없는 것</h2>
          <ul className="stack sm" style={{ paddingLeft: 20 }}>
            {r.uncertainties.map((u) => (
              <li key={u} className="muted">{u}</li>
            ))}
            <li className="muted">‘일에서 중요하게 생각하는 것’과 경험 기록은 현재 계산에 반영하지 않아요.</li>
            <li className="muted">적성 확률·합격 가능성·소득은 계산하지 않아요.</li>
          </ul>
        </section>
      </div>
    </div>
  )
}

function Insufficient({ missing }: { missing: string[] }) {
  const cat = useCatalog()
  const firstIdx = Object.keys(cat.axes).indexOf(missing[0]) + 1
  return (
    <section className="card soft stack">
      <p className="lead" style={{ color: 'var(--ink)' }}>
        관심 질문에 4개 이상 답하면 후보를 계산할 수 있어요. 실패가 아니라, 아직 정보가 부족한 상태예요. 입력한 답은 그대로 있어요.
      </p>
      <div className="stack sm">
        <span className="small strong">아직 답하지 않았거나 ‘모름’인 활동</span>
        <div className="chips">
          {missing.map((k) => (
            <Link key={k} to={`/explore/interests/${Object.keys(cat.axes).indexOf(k) + 1}`} className="chip line">
              {cat.axes[k]}
            </Link>
          ))}
        </div>
      </div>
      <div className="btn-row stretch">
        <Link to={`/explore/interests/${firstIdx || 1}`} className="btn primary">
          질문 더 답하기
        </Link>
        <Link to="/occupations" className="btn">
          직군 먼저 둘러보기
        </Link>
      </div>
    </section>
  )
}

function RecCard({ rec }: { rec: Recommendation }) {
  const a = rec.next_activity
  const gaps = rec.skill_gaps
  return (
    <article className="card" aria-labelledby={`rec-${rec.occupation_id}`}>
      <div className="row between top">
        <div className="stack sm">
          <div className="chips">
            <span className="chip gray">{familyLabel(rec.family)}</span>
            {rec.evidence_count > 0 ? <span className="chip ok">체험 근거 {rec.evidence_count}개</span> : <span className="chip line">체험 근거 없음</span>}
          </div>
          <h2 id={`rec-${rec.occupation_id}`} className="h2">
            <Link to={`/occupations/${rec.occupation_id}`}>{rec.name_ko}</Link>
          </h2>
        </div>
        <div className="stack sm" style={{ alignItems: 'flex-end', gap: 0 }}>
          <div className="score-line">
            <b>{fmt(rec.exploration_index)}</b>
          </div>
          <span className="small muted">탐색 적합지수 · 확률 아님</span>
        </div>
      </div>
      <div className="grid-3" style={{ gap: 14 }}>
        <div className="stack sm">
          <span className="small strong">추천 이유</span>
          <ul className="stack sm" style={{ listStyle: 'none' }}>
            {rec.why.map((w) => (
              <li key={w} className="small">· {w}</li>
            ))}
            {rec.observed_interest != null && <li className="small">· 체험 반응 평균 {fmt(rec.observed_interest)}</li>}
          </ul>
        </div>
        <div className="stack sm">
          <span className="small strong">현재 준비 상태</span>
          {rec.readiness_index == null ? (
            <p className="small muted">아직 확인하지 않은 역량이 있어요{gaps.some((g) => g.status === 'unknown') && ` (${gaps.filter((g) => g.status === 'unknown').map((g) => CAPABILITY_LABELS[g.capability]).slice(0, 2).join(', ')})`}.</p>
          ) : (
            <p className="small">
              준비 지수 <strong className="num">{fmt(rec.readiness_index)}</strong> <span className="muted">· 자기보고 기준, 순위에 반영 안 함</span>
            </p>
          )}
        </div>
        <div className="stack sm">
          <span className="small strong">다음 체험</span>
          <p className="small">
            {a.title.split(': ')[1] ?? a.title}
            <span className="muted"> · {minutesText(a.selected_variant.minutes)}{a.sessions > 1 ? `, ${a.sessions}회로 나눠서` : ''}</span>
          </p>
        </div>
      </div>
      <div className="btn-row no-print">
        <Link to={`/activities/${a.activity_id}`} className="btn sm primary">
          체험 시작 <Icon name="arrow" />
        </Link>
        <Link to={`/occupations/${rec.occupation_id}`} className="btn sm">
          업무·학습 경로
        </Link>
        <CompareToggle id={rec.occupation_id} />
      </div>
    </article>
  )
}
