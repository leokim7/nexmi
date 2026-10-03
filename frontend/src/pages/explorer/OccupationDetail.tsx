import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Comments } from '../../components/Comments'
import { CompareToggle } from '../../components/CompareTray'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Notice, Tabs } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { CAPABILITY_LABELS, EVIDENCE_LABEL, familyLabel, fmt, minutesText, STAGES } from '../../lib/labels'
import { useStore } from '../../lib/store'

type Tab = 'tasks' | 'activities' | 'path' | 'ai' | 'talk'

export default function OccupationDetail() {
  const { id } = useParams()
  const nav = useNavigate()
  const cat = useCatalog()
  const { data, update } = useStore()
  const occ = id ? cat.occupationById.get(id) : undefined
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<Tab>(sp.get('tab') === 'talk' ? 'talk' : 'tasks')
  useTitle(occ?.name_ko ?? '직군을 찾을 수 없어요')

  if (!occ)
    return (
      <div className="wrap page narrow">
        <Empty title="직군을 찾을 수 없어요" action={<Link to="/occupations" className="btn primary">직군 목록으로</Link>}>
          주소가 바뀌었거나 없는 직군이에요.
        </Empty>
      </div>
    )

  const rec = data.explorer.current?.result.recommendations.find((r) => r.occupation_id === occ.occupation_id)
  const tasks = [...(cat.tasksByOccupation.get(occ.occupation_id) ?? [])].sort((a, b) => b.task_weight - a.task_weight)
  const acts = cat.activitiesByOccupation.get(occ.occupation_id) ?? []
  const stage = data.explorer.draft.stage
  const fav = data.explorer.draft.favorites.includes(occ.occupation_id)
  const toggleFav = () =>
    update((d) => ({
      ...d,
      explorer: { ...d.explorer, draft: { ...d.explorer.draft, favorites: fav ? d.explorer.draft.favorites.filter((f) => f !== occ.occupation_id) : [...d.explorer.draft.favorites, occ.occupation_id] } },
    }))

  return (
    <div className="wrap page">
      <div className="stack lg">
        <button className="link small no-print" style={{ alignSelf: 'flex-start' }} onClick={() => (window.history.state?.idx > 0 ? nav(-1) : nav('/occupations'))}>
          ← 뒤로
        </button>
        <div className="row between top">
          <div className="stack sm">
            <div className="chips">
              <span className="chip gray">{familyLabel(occ.family)}</span>
              <span className="chip line">{EVIDENCE_LABEL[occ.evidence_status] ?? occ.evidence_status}</span>
            </div>
            <h1 className="h1">{occ.name_ko}</h1>
          </div>
          <div className="btn-row no-print">
            <button className={`btn sm ${fav ? 'dark' : ''}`} aria-pressed={fav} onClick={toggleFav}>
              <Icon name="heart" /> {fav ? '관심 직업' : '관심 직업에 추가'}
            </button>
            <CompareToggle id={occ.occupation_id} />
          </div>
        </div>

        <div className={`card ${rec ? 'soft' : 'paper'}`}>
          {rec ? (
            <div className="grid-3" style={{ gap: 16 }}>
              <div>
                <span className="small strong">추천 이유</span>
                <p className="small">{rec.why.join(' · ')}</p>
              </div>
              <div>
                <span className="small strong">관심 맞춤 점수</span>
                <p className="small">
                  <strong className="num">{fmt(rec.exploration_index)}</strong> <span className="muted">· 체험 근거 {rec.evidence_count}개 · 확률 아님</span>
                </p>
              </div>
              <div>
                <span className="small strong">준비 상태</span>
                <p className="small">{rec.readiness_index == null ? '아직 확인하지 않은 역량이 있어요' : `준비 점수 ${fmt(rec.readiness_index)} (내가 답한 기준)`}</p>
              </div>
            </div>
          ) : (
            <p className="small muted">직접 찾아본 직군이에요. 추천 결과와 관계없이 업무와 체험을 살펴볼 수 있어요.</p>
          )}
        </div>

        <div>
          <Tabs
            label="직군 상세"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'tasks', label: '실제 업무 14개' },
              { id: 'activities', label: '체험 2개' },
              { id: 'path', label: '학습 경로' },
              { id: 'ai', label: 'AI와 업무 변화' },
              { id: 'talk', label: '한마디' },
            ]}
          />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'talk' && <Comments occupationId={occ.occupation_id} occupationName={occ.name_ko} />}
            {tab === 'tasks' && (
              <div className="stack">
                <ol className="grid-2" style={{ listStyle: 'none', gap: 10 }}>
                  {tasks.map((t, i) => (
                    <li key={t.task_id} className="card tight" style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <span className="icon-box num" style={{ width: 40, height: 40, borderRadius: 13, fontWeight: 800 }}>{i + 1}</span>
                      <div className="stack sm" style={{ gap: 2 }}>
                        <strong>{t.name_ko}</strong>
                        <span className="small muted">일반적 비중 약 {fmt(t.task_weight * 100, 0)}% · {EVIDENCE_LABEL[t.review_status] ?? t.review_status}</span>
                      </div>
                    </li>
                  ))}
                </ol>
                <Notice>업무 목록과 비중은 평균적인 예시예요. 회사와 역할에 따라 달라요.</Notice>
              </div>
            )}
            {tab === 'activities' && (
              <div className="grid-2">
                {acts.map((a) => {
                  const sub = data.explorer.submissions[a.activity_id]
                  const v = stage ? a.stage_variants[stage] : undefined
                  return (
                    <article key={a.activity_id} className="card">
                      <div className="chips">
                        {sub?.completions.length ? <span className="chip ok">완료</span> : sub ? <span className="chip warn">진행 중</span> : <span className="chip line">아직 안 함</span>}
                        <span className="chip gray">가상 사례만 사용</span>
                      </div>
                      <h2 className="h3">{a.title.split(': ')[1] ?? a.title}</h2>
                      <p className="small muted">결과물: {a.deliverable}</p>
                      {v ? (
                        <p className="small">
                          <strong>{STAGES.find((s) => s.id === stage)?.label}</strong> · {minutesText(v.minutes)} · {v.scope}
                        </p>
                      ) : (
                        <p className="small muted">학습 단계를 고르면 단계에 맞는 범위와 시간을 보여드려요.</p>
                      )}
                      <Link to={`/activities/${a.activity_id}`} className="btn sm primary" style={{ alignSelf: 'flex-start' }}>
                        {sub?.completions.length ? '다시 해보기' : sub ? '이어하기' : '체험 시작'} <Icon name="arrow" />
                      </Link>
                    </article>
                  )
                })}
              </div>
            )}
            {tab === 'path' && (
              <div className="stack">
                <div className="grid-2">
                  <div className="card">
                    <h2 className="h3">관련 과목 예시</h2>
                    <div className="chips">
                      {occ.illustrative_subjects.map((s) => (
                        <span key={s} className="chip gray">{s}</span>
                      ))}
                    </div>
                  </div>
                  <div className="card">
                    <h2 className="h3">탐색해볼 학습 경로</h2>
                    <div className="chips">
                      {occ.exploratory_paths.map((s) => (
                        <span key={s} className="chip gray">{s}</span>
                      ))}
                    </div>
                  </div>
                </div>
                <Notice kind="info" icon="shield">
                  <strong>공식 진입요건 미확인</strong> · {occ.path_note}. 필요한 전공·자격은 공식 기관에서 직접 확인해주세요.
                </Notice>
                {rec && rec.skill_gaps.length > 0 && (
                  <div className="card">
                    <h2 className="h3">연습해볼 역량</h2>
                    <ul className="stack sm" style={{ listStyle: 'none' }}>
                      {rec.skill_gaps.map((g) => (
                        <li key={g.capability} className="row between">
                          <span>{CAPABILITY_LABELS[g.capability]}</span>
                          <span className="chip gray">{g.status === 'unknown' ? '아직 확인 안 함' : g.status === 'practice_candidate' ? '연습 후보' : '자기보고상 충족'}</span>
                        </li>
                      ))}
                    </ul>
                    <p className="small muted">{rec.readiness_note}</p>
                  </div>
                )}
              </div>
            )}
            {tab === 'ai' && (
              <div className="stack">
                <div className="card paper">
                  <p>
                    업무별로 AI가 보조할 수 있는 부분과, 사람이 검토·책임·관계·현장에서 맡는 부분을 함께 생각해보세요. AI 변화는 추천 순위에 더하거나 빼지 않아요.
                  </p>
                </div>
                <div className="grid-2">
                  {[
                    ['AI 보조', '자료 정리·초안·반복 계산처럼 AI가 돕기 쉬운 부분은?'],
                    ['검증', 'AI 결과가 맞는지 누가, 무엇으로 확인하나요?'],
                    ['관계', '사람 사이의 신뢰·설득이 필요한 부분은?'],
                    ['책임·현장', '최종 결정, 법적 책임, 몸으로 하는 일은 누가 하나요?'],
                  ].map(([t, d]) => (
                    <div key={t} className="card tight">
                      <strong>{t}</strong>
                      <p className="small muted">{d}</p>
                    </div>
                  ))}
                </div>
                <Notice>자동화 확률이나 직업 종료일은 진로 탐색에서 계산하지 않아요. 재직자의 업무 변화는 ‘직업 미래’에서 따로 분석해요.</Notice>
                <div>
                  <span className="small strong">함께 생각해볼 업무</span>
                  <div className="chips" style={{ marginTop: 8 }}>
                    {tasks.slice(0, 3).map((t) => (
                      <span key={t.task_id} className="chip line">{t.name_ko}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
