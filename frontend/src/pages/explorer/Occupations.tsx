import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { CompareToggle } from '../../components/CompareTray'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, PageHead } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { FAMILY_LABELS, familyLabel, fmt } from '../../lib/labels'
import { useStore } from '../../lib/store'

export default function Occupations() {
  useTitle('직군 둘러보기')
  const cat = useCatalog()
  const { data } = useStore()
  // 검색어·필터는 URL 에 둬서 뒤로 가기·공유 시 유지되게 한다.
  const [sp, setSp] = useSearchParams()
  const q = sp.get('q') ?? ''
  const fam = sp.get('family') ?? ''
  const axis = sp.get('axis') ?? ''
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    v ? n.set(k, v) : n.delete(k)
    setSp(n, { replace: true })
  }
  const recs = new Map((data.explorer.current?.result.recommendations ?? []).map((r) => [r.occupation_id, r]))
  const list = useMemo(
    () =>
      cat.occupations.filter(
        (o) => (!q.trim() || o.name_ko.toLowerCase().includes(q.trim().toLowerCase())) && (!fam || o.family === fam) && (!axis || o.interest_tags.includes(axis)),
      ),
    [cat, q, fam, axis],
  )

  return (
    <div className="wrap page">
      <PageHead eyebrow="OCCUPATIONS" title="직군 50개 둘러보기" lead="추천 밖의 직군도 실제 업무 14개와 체험, 관련 학습 경로를 볼 수 있어요." />
      <div className="stack lg">
        <div className="stack">
          <div className="search">
            <Icon name="search" />
            <input type="search" placeholder="직군 이름 검색" aria-label="직군 검색" value={q} onChange={(e) => set('q', e.target.value)} />
          </div>
          <div className="chips" role="group" aria-label="영역 필터">
            <button type="button" className="chip gray" aria-pressed={!fam} onClick={() => set('family', '')}>
              전체 영역
            </button>
            {Object.entries(FAMILY_LABELS).map(([k, l]) => (
              <button key={k} type="button" className="chip gray" aria-pressed={fam === k} onClick={() => set('family', fam === k ? '' : k)}>
                {l}
              </button>
            ))}
          </div>
          <div className="row">
            <label htmlFor="axis" className="small strong muted">관심 활동으로 좁히기</label>
            <select id="axis" value={axis} onChange={(e) => set('axis', e.target.value)} style={{ maxWidth: 320, minHeight: 44, padding: '8px 12px' }}>
              <option value="">전체 활동</option>
              {Object.entries(cat.axes).map(([k, l]) => (
                <option key={k} value={k}>{l}</option>
              ))}
            </select>
            {(q || fam || axis) && (
              <button className="link small" onClick={() => setSp(new URLSearchParams(), { replace: true })}>
                필터 초기화
              </button>
            )}
          </div>
          <p className="small muted" role="status">{list.length}개 직군</p>
        </div>

        {list.length === 0 ? (
          <Empty title="조건에 맞는 직군이 없어요" action={<button className="btn" onClick={() => setSp(new URLSearchParams(), { replace: true })}>필터 초기화</button>}>
            검색어를 줄이거나 영역 필터를 풀어보세요.
          </Empty>
        ) : (
          <div className="grid-3">
            {list.map((o) => {
              const r = recs.get(o.occupation_id)
              return (
                <article key={o.occupation_id} className="card tight occ-card">
                  <div className="meta">
                    <span className="chip gray">{familyLabel(o.family)}</span>
                    {r && <span className="chip">추천 후보 · {fmt(r.exploration_index)}</span>}
                    {data.explorer.draft.favorites.includes(o.occupation_id) && <span className="chip line">관심 직업</span>}
                  </div>
                  <h2 className="h3">
                    <Link to={`/occupations/${o.occupation_id}`}>{o.name_ko}</Link>
                  </h2>
                  <p className="small muted">{o.interest_tags.map((t) => cat.axes[t]).join(' · ')}</p>
                  <div className="row between" style={{ marginTop: 'auto' }}>
                    <Link to={`/occupations/${o.occupation_id}`} className="link small">
                      업무·체험 보기
                    </Link>
                    <CompareToggle id={o.occupation_id} />
                  </div>
                </article>
              )
            })}
          </div>
        )}
        <p className="small muted">직군 분류는 서비스 자체 설계이며 공식 직업분류 코드와 아직 연결하지 않았어요.</p>
      </div>
    </div>
  )
}
