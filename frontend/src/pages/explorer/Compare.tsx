import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Notice, PageHead } from '../../components/ui'
import { COMPARE_MAX } from '../../components/CompareTray'
import { useCatalog } from '../../lib/catalog'
import { familyLabel, fmt, minutesText } from '../../lib/labels'
import { useStore } from '../../lib/store'

export default function Compare() {
  useTitle('직군 비교')
  const cat = useCatalog()
  const { data, update } = useStore()
  const ids = data.explorer.compare
  const recs = new Map((data.explorer.current?.result.recommendations ?? []).map((r) => [r.occupation_id, r]))
  const stage = data.explorer.draft.stage
  const remove = (id: string) => update((d) => ({ ...d, explorer: { ...d.explorer, compare: d.explorer.compare.filter((x) => x !== id) } }))

  if (ids.length === 0)
    return (
      <div className="wrap page narrow">
        <PageHead eyebrow="COMPARE" title="직군 비교" />
        <Empty title="비교할 직군을 담아주세요" action={<Link to="/occupations" className="btn primary">직군 둘러보기</Link>}>
          탐색 결과나 직군 목록에서 ‘비교 담기’를 눌러 최대 {COMPARE_MAX}개까지 담을 수 있어요.
        </Empty>
      </div>
    )

  const occs = ids.map((id) => cat.occupationById.get(id)!).filter(Boolean)
  const rows: { k: string; render: (id: string) => React.ReactNode }[] = [
    { k: '영역', render: (id) => familyLabel(cat.occupationById.get(id)!.family) },
    { k: '관련 관심 활동', render: (id) => cat.occupationById.get(id)!.interest_tags.map((t) => cat.axes[t]).join(', ') },
    {
      k: '관심 맞춤 점수',
      render: (id) => {
        const r = recs.get(id)
        return r ? <><strong className="num">{fmt(r.exploration_index)}</strong> <span className="muted small">· 체험 {r.evidence_count}개</span></> : <span className="muted">추천 결과에 없음</span>
      },
    },
    {
      k: '준비 상태',
      render: (id) => {
        const r = recs.get(id)
        return !r ? <span className="muted">—</span> : r.readiness_index == null ? <span className="muted">확인 안 한 역량 있음</span> : `준비 점수 ${fmt(r.readiness_index)}`
      },
    },
    {
      k: '대표 업무',
      render: (id) => (
        <ul style={{ paddingLeft: 16 }}>
          {[...(cat.tasksByOccupation.get(id) ?? [])].sort((a, b) => b.task_weight - a.task_weight).slice(0, 5).map((t) => (
            <li key={t.task_id}>{t.name_ko}</li>
          ))}
        </ul>
      ),
    },
    {
      k: '체험',
      render: (id) => (
        <ul style={{ paddingLeft: 16 }}>
          {(cat.activitiesByOccupation.get(id) ?? []).map((a) => (
            <li key={a.activity_id}>
              <Link className="link" to={`/activities/${a.activity_id}`}>{a.title.split(': ')[1] ?? a.title}</Link>
              {stage && <span className="muted small"> · {minutesText(a.stage_variants[stage].minutes)}</span>}
            </li>
          ))}
        </ul>
      ),
    },
    { k: '관련 과목', render: (id) => cat.occupationById.get(id)!.illustrative_subjects.join(', ') },
    { k: '학습 경로', render: (id) => cat.occupationById.get(id)!.exploratory_paths.join(', ') },
    { k: '진입요건', render: () => <span className="chip warn">공식 요건 미확인</span> },
  ]

  return (
    <div className="wrap page">
      <PageHead eyebrow="COMPARE" title="직군 비교" lead={`최대 ${COMPARE_MAX}개 직군의 업무·체험·학습 경로를 나란히 봐요.`} />
      <div className="stack">
        {ids.length === 1 && (
          <Notice kind="info">
            하나만 담았어요. 비교하려면 직군을 더 담아주세요.{' '}
            <Link className="link" to="/occupations">직군 둘러보기</Link>
          </Notice>
        )}
        <p className="scroll-hint">← 표를 옆으로 밀어 다른 직군을 볼 수 있어요 →</p>
        <div className="table-wrap">
          <table className="table compare">
            <caption className="sr-only">직군 비교표</caption>
            <thead>
              <tr>
                <th scope="col" style={{ position: 'sticky', left: 0, zIndex: 2 }}>
                  항목
                </th>
                {occs.map((o) => (
                  <th key={o.occupation_id} scope="col" style={{ minWidth: 200 }}>
                    <div className="stack sm" style={{ gap: 6 }}>
                      <Link to={`/occupations/${o.occupation_id}`} className="h3" style={{ color: 'var(--ink)' }}>{o.name_ko}</Link>
                      <button className="link small" style={{ alignSelf: 'flex-start' }} onClick={() => remove(o.occupation_id)} aria-label={`${o.name_ko} 비교에서 빼기`}>
                        빼기
                      </button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.k}>
                  <th scope="row">{r.k}</th>
                  {occs.map((o) => (
                    <td key={o.occupation_id}>{r.render(o.occupation_id)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">점수가 같거나 비슷해도 어느 직군이 더 맞는지 판정하지 않아요. 직접 체험해보고 느낌을 기록하는 것이 가장 좋은 비교예요.</p>
        <div className="btn-row">
          <Link to="/occupations" className="btn">
            <Icon name="plus" /> 직군 더 담기
          </Link>
          <button className="btn ghost" onClick={() => update((d) => ({ ...d, explorer: { ...d.explorer, compare: [] } }))}>
            비교 비우기
          </button>
        </div>
      </div>
    </div>
  )
}
