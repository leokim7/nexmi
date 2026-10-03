import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Field, Notice, Progress } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { knownInterestCount, useExplorerCalc, WEEKLY_OPTIONS } from '../../lib/explorer'
import { CAPABILITY_LABELS, INTEREST_SCALE, minutesText, stageLabel } from '../../lib/labels'
import { useStore, type ExplorerDraft } from '../../lib/store'

/** 관심 질문: 한 화면에 한 질문. 버튼을 누르면 저장하고 다음 질문으로 넘어간다. */
export function InterestQuestion() {
  const { n } = useParams()
  const idx = Number(n) - 1
  const cat = useCatalog()
  const nav = useNavigate()
  const { data, update } = useStore()
  const d = data.explorer.draft
  const axes = Object.entries(cat.axes)
  useTitle(`관심 질문 ${idx + 1}/8`)
  if (!d.stage) return <Navigate to="/explore" replace />
  if (!(idx >= 0 && idx < axes.length)) return <Navigate to="/explore/interests/1" replace />
  const [key, text] = axes[idx]
  const value = key in d.interests ? d.interests[key] : undefined

  const pick = (v: number | null) => {
    update((x) => ({ ...x, explorer: { ...x.explorer, draft: { ...x.explorer.draft, interests: { ...x.explorer.draft.interests, [key]: v } } } }))
    nav(idx + 1 < axes.length ? `/explore/interests/${idx + 2}` : '/explore/more')
  }
  const skip = () => {
    update((x) => {
      const { [key]: _, ...rest } = x.explorer.draft.interests
      return { ...x, explorer: { ...x.explorer, draft: { ...x.explorer.draft, interests: rest } } }
    })
    nav(idx + 1 < axes.length ? `/explore/interests/${idx + 2}` : '/explore/more')
  }

  return (
    <div className="wrap page form">
      <div className="stack lg">
        <div className="stack sm">
          <div className="row between">
            <span className="small strong num">
              관심 질문 {idx + 1} / {axes.length}
            </span>
            <span className="chip gray">{stageLabel(d.stage)}</span>
          </div>
          <Progress value={idx} max={axes.length} label="관심 질문 진행률" />
        </div>
        <div className="stack sm">
          <div className="eyebrow">INTEREST {idx + 1}</div>
          <h1 className="h1" id="q-title">
            ‘{text}’ <br />
            활동을 해보고 싶나요?
          </h1>
          <p className="muted">잘하는지가 아니라 해보고 싶은지를 골라주세요. 추천에만 쓰고 능력 점수로 해석하지 않아요.</p>
        </div>
        <div className="options" role="group" aria-labelledby="q-title">
          {INTEREST_SCALE.map((o) => (
            <button key={o.v} type="button" className="opt" aria-pressed={value === o.v} onClick={() => pick(o.v)}>
              <span className="t">{o.label}</span>
            </button>
          ))}
          <button type="button" className="opt unknown" aria-pressed={value === null} onClick={() => pick(null)}>
            <span className="t">아직 모름</span>
            <span className="d">해본 적이 없어 판단하기 어려워요 — 0점으로 계산하지 않아요</span>
          </button>
        </div>
        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          <Link to={idx > 0 ? `/explore/interests/${idx}` : '/explore'} className="btn">
            <Icon name="back" /> 이전
          </Link>
          <button className="btn ghost" onClick={skip}>
            건너뛰기
          </button>
        </div>
      </div>
    </div>
  )
}

const VALUE_OPTIONS = ['안정성', '성장', '사람 돕기', '창의성', '보수', '자율성', '사회적 영향', '함께 일하기']

/** 선택 정보: 시간·경험·관심 직군·준비 수준. 전부 건너뛸 수 있다. */
export function ExplorerMore() {
  useTitle('조금 더 알려주기')
  const cat = useCatalog()
  const nav = useNavigate()
  const { data, update } = useStore()
  const d = data.explorer.draft
  const calc = useExplorerCalc()
  const [expText, setExpText] = useState('')
  const [favQ, setFavQ] = useState('')
  const [customMin, setCustomMin] = useState('')
  const [minErr, setMinErr] = useState<string>()
  const setD = (fn: (d: ExplorerDraft) => ExplorerDraft) => update((x) => ({ ...x, explorer: { ...x.explorer, draft: fn(x.explorer.draft) } }))
  const expInput = useRef<HTMLInputElement>(null)
  const favMatches = useMemo(() => (favQ.trim() ? cat.occupations.filter((o) => o.name_ko.includes(favQ.trim()) && !d.favorites.includes(o.occupation_id)).slice(0, 6) : []), [favQ, cat, d.favorites])

  if (!d.stage) return <Navigate to="/explore" replace />
  const known = knownInterestCount(d)
  const fieldErrors = calc.error?.fieldErrors ?? {}

  const addExp = () => {
    const t = expText.trim()
    if (!t || d.experiences.length >= 20) return
    setD((x) => ({ ...x, experiences: [...x.experiences, t.slice(0, 300)] }))
    setExpText('')
    expInput.current?.focus()
  }
  const applyCustom = () => {
    const h = Number(customMin)
    const m = Math.round(h * 60)
    if (!customMin || !Number.isFinite(h) || m < 1 || m > 10080) return setMinErr('1분–168시간 사이로 입력해주세요.')
    setMinErr(undefined)
    setD((x) => ({ ...x, weekly_minutes: m }))
  }
  const submit = async () => {
    const r = await calc.calc()
    if (r) nav('/explore/result')
  }

  return (
    <div className="wrap page form">
      <div className="stack lg">
        <div className="stack sm">
          <div className="eyebrow">OPTIONAL</div>
          <h1 className="h1">조금 더 알려주면 계획이 정확해져요</h1>
          <p className="lead">모두 선택이에요. 바로 결과를 봐도 괜찮아요.</p>
        </div>

        {known < 4 && (
          <Notice kind="info">
            관심 질문에 4개 이상 답해야 후보를 계산할 수 있어요. 지금 {known}개 답했어요.{' '}
            <Link className="link" to={`/explore/interests/${Object.keys(cat.axes).findIndex((k) => d.interests[k] == null) + 1 || 1}`}>
              질문 더 답하기
            </Link>
          </Notice>
        )}

        <section className="card stack" aria-labelledby="time-h">
          <h2 id="time-h" className="h3">체험에 쓸 수 있는 주당 시간</h2>
          <p className="small muted" style={{ marginTop: -8 }}>체험 계획을 몇 번에 나눌지 정하는 데만 써요. 기본 1시간.</p>
          <div className="chips" role="group" aria-label="주당 시간">
            {WEEKLY_OPTIONS.map((m) => (
              <button key={m} type="button" className="chip gray" aria-pressed={d.weekly_minutes === m} onClick={() => setD((x) => ({ ...x, weekly_minutes: m }))}>
                {minutesText(m)}
              </button>
            ))}
          </div>
          <div className="row" style={{ alignItems: 'flex-end', flexWrap: 'nowrap' }}>
            <Field label="직접 입력 (시간)" htmlFor="custom-min" error={minErr ?? fieldErrors.weekly_minutes}>
              <input id="custom-min" type="number" inputMode="decimal" min={0.1} max={168} step={0.5} value={customMin} onChange={(e) => setCustomMin(e.target.value)} aria-invalid={!!minErr} />
            </Field>
            <button type="button" className="btn sm" onClick={applyCustom} style={{ marginBottom: minErr ? 30 : 2 }}>
              적용
            </button>
          </div>
          {d.weekly_minutes && !WEEKLY_OPTIONS.includes(d.weekly_minutes) && <p className="small strong">주당 {minutesText(d.weekly_minutes)}</p>}
        </section>

        <section className="card stack" aria-labelledby="exp-h">
          <h2 id="exp-h" className="h3">해본 과목·활동</h2>
          <p className="small muted" style={{ marginTop: -8 }}>설명용이에요. 경험이 적다고 후보에서 빼지 않아요.</p>
          <div className="row" style={{ flexWrap: 'nowrap' }}>
            <input ref={expInput} type="text" aria-label="경험 추가" placeholder="예: 동아리 영상 편집, 정보 수업 프로젝트" value={expText} maxLength={300} onChange={(e) => setExpText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addExp())} />
            <button type="button" className="btn sm" onClick={addExp} disabled={!expText.trim()}>
              추가
            </button>
          </div>
          {d.experiences.length > 0 && (
            <ul className="chips" style={{ listStyle: 'none' }}>
              {d.experiences.map((e, i) => (
                <li key={i}>
                  <button type="button" className="chip line" onClick={() => setD((x) => ({ ...x, experiences: x.experiences.filter((_, j) => j !== i) }))} aria-label={`${e} 삭제`}>
                    {e} <Icon name="x" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {fieldErrors.experiences && <p className="err" style={{ color: 'var(--danger)' }}>{fieldErrors.experiences}</p>}
        </section>

        <section className="card stack" aria-labelledby="fav-h">
          <h2 id="fav-h" className="h3">이미 관심 있는 직업</h2>
          <p className="small muted" style={{ marginTop: -8 }}>추천과 별도로 탐색 목록에 넣어요. 점수를 올리지 않아요.</p>
          <div className="search">
            <Icon name="search" />
            <input type="search" aria-label="관심 직업 검색" placeholder="직업 이름 검색" value={favQ} onChange={(e) => setFavQ(e.target.value)} />
          </div>
          {favMatches.length > 0 && (
            <div className="chips">
              {favMatches.map((o) => (
                <button key={o.occupation_id} type="button" className="chip gray" onClick={() => (setD((x) => ({ ...x, favorites: [...x.favorites, o.occupation_id] })), setFavQ(''))}>
                  <Icon name="plus" /> {o.name_ko}
                </button>
              ))}
            </div>
          )}
          {d.favorites.length > 0 && (
            <div className="chips">
              {d.favorites.map((id) => (
                <button key={id} type="button" className="chip" onClick={() => setD((x) => ({ ...x, favorites: x.favorites.filter((f) => f !== id) }))} aria-label={`${cat.occupationById.get(id)?.name_ko} 삭제`}>
                  {cat.occupationById.get(id)?.name_ko} <Icon name="x" />
                </button>
              ))}
            </div>
          )}
        </section>

        <details className="card">
          <summary className="h3" style={{ cursor: 'pointer' }}>
            현재 준비 수준 (선택) <span className="chip gray" style={{ marginLeft: 6 }}>{Object.keys(d.skills).length}/10</span>
          </summary>
          <p className="small muted">
            스스로 할 수 있는 정도를 골라주세요. 후보 순위에는 반영하지 않고, 후보별 ‘준비 상태’ 설명에만 써요. 적성 점수가 아니에요.
          </p>
          <div className="grid-2">
            {cat.capabilities.map((c) => (
              <div className="field" key={c}>
                <label htmlFor={`sk-${c}`}>{CAPABILITY_LABELS[c] ?? c}</label>
                <select
                  id={`sk-${c}`}
                  value={c in d.skills ? String(d.skills[c]) : ''}
                  onChange={(e) =>
                    setD((x) => {
                      const { [c]: _, ...rest } = x.skills
                      return { ...x, skills: e.target.value === '' ? rest : { ...rest, [c]: e.target.value === 'null' ? null : Number(e.target.value) } }
                    })
                  }
                >
                  <option value="">답하지 않음</option>
                  <option value="null">아직 모름</option>
                  {[
                    [0, '해본 적 없음'],
                    [25, '도움받아 할 수 있음'],
                    [50, '혼자 일부 할 수 있음'],
                    [75, '자주 혼자 함'],
                    [100, '어려운 상황도 해냄'],
                  ].map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </details>

        <details className="card">
          <summary className="h3" style={{ cursor: 'pointer' }}>일에서 중요하게 생각하는 것 (선택)</summary>
          <p className="small muted">현재 계산에는 반영하지 않아요. 앞으로 검증된 방법이 생기면 쓸 수 있도록 기록만 해요.</p>
          <div className="chips">
            {VALUE_OPTIONS.map((v) => (
              <button key={v} type="button" className="chip gray" aria-pressed={d.values.includes(v)} onClick={() => setD((x) => ({ ...x, values: x.values.includes(v) ? x.values.filter((y) => y !== v) : [...x.values, v] }))}>
                {v}
              </button>
            ))}
          </div>
        </details>

        {calc.error && (
          <Notice kind="error" role="alert">
            {calc.error.message}
          </Notice>
        )}
        {calc.loading && (
          <Notice kind="info" role="status">
            관심과 체험 기록으로 탐색 후보를 계산하고 있어요…{calc.slow && ' 평소보다 오래 걸리고 있어요. 입력은 그대로 있어요.'}
          </Notice>
        )}

        <div className="flow-foot">
          <div className="btn-row" style={{ justifyContent: 'space-between' }}>
            <Link to="/explore/interests/8" className="btn">
              <Icon name="back" /> 이전
            </Link>
            <button className="btn primary lg" onClick={submit} disabled={calc.loading} aria-busy={calc.loading}>
              {calc.loading ? '계산 중…' : calc.error ? '다시 시도' : '탐색 결과 보기'} {!calc.loading && <Icon name="arrow" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
