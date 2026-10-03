/* 실천: 이번 주 과제 · 기록하기 · 목표 · 분야 업데이트 (R-01~R-06 통합). 모두 점수에 자동 반영되지 않는다. */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { ConfirmDialog, Empty, Field, Notice, PageHead, Segmented, Tabs, useToast } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { dateText, minutesText } from '../../lib/labels'
import { pickMissions, type Mission } from '../../lib/missions'
import { uid, useStore, type Goal, type JournalEntry } from '../../lib/store'
import type { Mode } from '../../lib/types'

type Tab = 'missions' | 'journal' | 'goals' | 'updates'

export default function Practice() {
  useTitle('실천')
  const [sp, setSp] = useSearchParams()
  const { data } = useStore()
  const defaultMode: Mode = (sp.get('mode') as Mode) || (data.worker.current && !data.explorer.current ? 'worker' : data.explorer.current ? 'explorer' : 'worker')
  const [mode, setMode] = useState<Mode>(defaultMode === 'explorer' ? 'explorer' : 'worker')
  const tab = (sp.get('tab') as Tab) || 'missions'
  const setTab = (t: Tab) => {
    const n = new URLSearchParams(sp)
    n.set('tab', t)
    setSp(n, { replace: true })
  }
  const [toast, showToast] = useToast()
  const [prefill, setPrefill] = useState<Mission | null>(null)

  return (
    <div className="wrap page">
      <PageHead eyebrow="PRACTICE" title="이번 주의 작은 실천" lead="분석 다음에는 작은 행동과 기록이 남아요. 기록은 근거일 뿐, 점수에 자동으로 더하지 않아요.">
        <Segmented
          label="모드"
          value={mode}
          onChange={setMode}
          options={[
            { id: 'worker', label: '재직자' },
            { id: 'explorer', label: '진로 탐색' },
          ]}
        />
      </PageHead>
      <Tabs
        label="실천 메뉴"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'missions', label: '이번 주 과제' },
          { id: 'journal', label: '기록하기' },
          { id: 'goals', label: '목표' },
          { id: 'updates', label: '분야 업데이트' },
        ]}
      />
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'missions' && (
          <Missions
            mode={mode}
            onRecord={(m) => {
              setPrefill(m)
              setTab('journal')
            }}
          />
        )}
        {tab === 'journal' && <Journal mode={mode} prefill={prefill} clearPrefill={() => setPrefill(null)} onSaved={() => showToast('기록을 남겼어요')} />}
        {tab === 'goals' && <Goals mode={mode} />}
        {tab === 'updates' && <Updates mode={mode} />}
      </div>
      {toast}
    </div>
  )
}

function Missions({ mode, onRecord }: { mode: Mode; onRecord: (m: Mission) => void }) {
  const { data, update } = useStore()
  const stage = data.explorer.draft.stage
  const weekly = mode === 'explorer' ? data.explorer.draft.weekly_minutes : undefined
  const list = pickMissions(mode, { stage, weeklyMinutes: weekly, done: data.practice.missionsDone }, 4)
  const hasResult = mode === 'worker' ? !!data.worker.current : !!data.explorer.current
  const toggle = (id: string) =>
    update((d) => ({ ...d, practice: { ...d.practice, missionsDone: d.practice.missionsDone.includes(id) ? d.practice.missionsDone.filter((x) => x !== id) : [...d.practice.missionsDone, id] } }))
  return (
    <div className="stack lg">
      {!hasResult && (
        <Notice kind="info">
          {mode === 'worker' ? '내 업무를 먼저 분석하면 어떤 업무부터 실험할지 정하기 쉬워요.' : '탐색 결과가 있으면 후보 직군의 체험을 함께 고를 수 있어요.'}{' '}
          <Link className="link" to={mode === 'worker' ? '/worker' : '/explore'}>분석하러 가기</Link>
        </Notice>
      )}
      <div className="grid-2">
        {list.map((m) => {
          const done = data.practice.missionsDone.includes(m.id)
          return (
            <article key={m.id} className={`card ${done ? 'paper' : ''}`}>
              <div className="chips">
                <span className="chip gray"><Icon name="clock" /> {minutesText(m.minutes)}</span>
                {done && <span className="chip ok">완료</span>}
                {weekly && m.minutes > weekly && <span className="chip warn">주당 시간보다 길어요 · 나눠서</span>}
              </div>
              <h2 className="h3">{m.title}</h2>
              <p className="small muted">{m.why}</p>
              <div className="btn-row">
                <button className="btn sm primary" onClick={() => onRecord(m)}>
                  <Icon name="pen" /> 결과 기록
                </button>
                <button className="btn sm ghost" aria-pressed={done} onClick={() => toggle(m.id)}>
                  {done ? '완료 취소' : '완료 표시'}
                </button>
              </div>
            </article>
          )
        })}
      </div>
      {mode === 'explorer' && data.explorer.current?.result.recommendations[0] && (
        <div className="card soft">
          <span className="small strong">후보 직군 체험</span>
          <div className="chips">
            {data.explorer.current.result.recommendations.slice(0, 3).map((r) => (
              <Link key={r.occupation_id} to={`/activities/${r.next_activity.activity_id}`} className="chip">
                {r.name_ko} · {minutesText(r.next_activity.selected_variant.minutes)} <Icon name="arrow" />
              </Link>
            ))}
          </div>
        </div>
      )}
      <p className="small muted">과제는 검토된 고정 목록에서 ‘아직 안 한 것 → 시간에 맞는 것 → 짧은 것’ 순서로 골라요.</p>
    </div>
  )
}

function Journal({ mode, prefill, clearPrefill, onSaved }: { mode: Mode; prefill: Mission | null; clearPrefill: () => void; onSaved: () => void }) {
  const cat = useCatalog()
  const { data, update } = useStore()
  const occDefault = mode === 'worker' ? data.worker.current?.input_snapshot.occupation_id : data.explorer.current?.result.recommendations[0]?.occupation_id
  const blank = { title: prefill?.title ?? '', occupation_id: occDefault ?? '', task_id: '', minutes: '', verification_minutes: '', result_notes: '', reflection: '', next_action: '' }
  const [f, setF] = useState(blank)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [del, setDel] = useState<string | null>(null)
  const set = (k: keyof typeof f, v: string) => setF((x) => ({ ...x, [k]: v }))
  const entries = data.practice.journal.filter((j) => j.mode === mode)
  const tasks = f.occupation_id ? cat.tasksByOccupation.get(f.occupation_id) ?? [] : []

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!f.title.trim()) err.title = '무엇을 했는지 적어주세요.'
    for (const k of ['minutes', 'verification_minutes'] as const) {
      if (f[k] !== '' && (!Number.isFinite(Number(f[k])) || Number(f[k]) < 0 || Number(f[k]) > 10080)) err[k] = '0 이상 숫자(분)로 적어주세요.'
    }
    setErrors(err)
    if (Object.keys(err).length) return
    const entry: JournalEntry = {
      id: uid(),
      mode,
      created_at: new Date().toISOString(),
      title: f.title.trim().slice(0, 200),
      occupation_id: f.occupation_id || undefined,
      task_id: f.task_id || undefined,
      minutes: f.minutes === '' ? undefined : Number(f.minutes),
      verification_minutes: f.verification_minutes === '' ? undefined : Number(f.verification_minutes),
      result_notes: f.result_notes.slice(0, 3000),
      reflection: f.reflection.slice(0, 3000),
      next_action: f.next_action.slice(0, 300),
      mission_id: prefill?.id,
    }
    update((d) => ({
      ...d,
      practice: { ...d.practice, journal: [entry, ...d.practice.journal], missionsDone: prefill && !d.practice.missionsDone.includes(prefill.id) ? [...d.practice.missionsDone, prefill.id] : d.practice.missionsDone },
    }))
    setF({ ...blank, title: '' })
    clearPrefill()
    onSaved()
  }

  return (
    <div className="grid-side">
      <form className="card stack" onSubmit={submit} noValidate aria-labelledby="j-h">
        <h2 id="j-h" className="h3">{mode === 'worker' ? '업무 적용 기록' : '체험·탐색 기록'}</h2>
        <Field label="무엇을 했나요? *" htmlFor="j-title" error={errors.title}>
          <input id="j-title" type="text" value={f.title} maxLength={200} onChange={(e) => set('title', e.target.value)} aria-invalid={!!errors.title} />
        </Field>
        <div className="grid-2">
          <Field label="관련 직군" htmlFor="j-occ">
            <select id="j-occ" value={f.occupation_id} onChange={(e) => (set('occupation_id', e.target.value), set('task_id', ''))}>
              <option value="">선택 안 함</option>
              {cat.occupations.map((o) => (
                <option key={o.occupation_id} value={o.occupation_id}>{o.name_ko}</option>
              ))}
            </select>
          </Field>
          <Field label="관련 업무" htmlFor="j-task">
            <select id="j-task" value={f.task_id} onChange={(e) => set('task_id', e.target.value)} disabled={!tasks.length}>
              <option value="">선택 안 함</option>
              {tasks.map((t) => (
                <option key={t.task_id} value={t.task_id}>{t.name_ko}</option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid-2">
          <Field label="걸린 시간 (분)" htmlFor="j-min" error={errors.minutes}>
            <input id="j-min" type="number" inputMode="numeric" min={0} value={f.minutes} onChange={(e) => set('minutes', e.target.value)} aria-invalid={!!errors.minutes} />
          </Field>
          {mode === 'worker' && (
            <Field label="검토·수정에 쓴 시간 (분)" htmlFor="j-ver" error={errors.verification_minutes} hint="절약 시간은 검토 시간까지 빼야 정확해요">
              <input id="j-ver" type="number" inputMode="numeric" min={0} value={f.verification_minutes} onChange={(e) => set('verification_minutes', e.target.value)} aria-invalid={!!errors.verification_minutes} />
            </Field>
          )}
        </div>
        <Field label="결과" htmlFor="j-res">
          <textarea id="j-res" style={{ minHeight: 90 }} value={f.result_notes} maxLength={3000} onChange={(e) => set('result_notes', e.target.value)} />
        </Field>
        <Field label="느낀 점" htmlFor="j-ref">
          <textarea id="j-ref" style={{ minHeight: 90 }} value={f.reflection} maxLength={3000} onChange={(e) => set('reflection', e.target.value)} />
        </Field>
        <Field label="다음에 할 일" htmlFor="j-next">
          <input id="j-next" type="text" value={f.next_action} maxLength={300} onChange={(e) => set('next_action', e.target.value)} />
        </Field>
        <button className="btn primary" type="submit" style={{ alignSelf: 'flex-start' }}>
          기록 남기기
        </button>
        <p className="small muted">기록은 실제 관측 근거로 남고, 점수나 전환점에 자동으로 더하지 않아요.</p>
      </form>
      <section className="stack" aria-labelledby="jl-h">
        <h2 id="jl-h" className="h3">쌓인 기록 <span className="chip gray num">{entries.length}</span></h2>
        {entries.length === 0 ? (
          <Empty title="아직 기록이 없어요">이번 주 과제를 하나 해보고 결과를 남겨보세요.</Empty>
        ) : (
          <ul className="stack sm" style={{ listStyle: 'none' }}>
            {entries.map((j) => (
              <li key={j.id} className="card tight">
                <div className="row between top">
                  <strong>{j.title}</strong>
                  <button className="btn ghost sm" onClick={() => setDel(j.id)} aria-label={`${j.title} 기록 삭제`}>
                    <Icon name="trash" />
                  </button>
                </div>
                <span className="small muted">
                  {dateText(j.created_at)}
                  {j.occupation_id && ` · ${cat.occupationById.get(j.occupation_id)?.name_ko}`}
                  {j.task_id && ` · ${cat.taskById.get(j.task_id)?.name_ko}`}
                  {j.minutes != null && ` · ${j.minutes}분`}
                  {j.verification_minutes != null && ` (검토 ${j.verification_minutes}분)`}
                </span>
                {j.result_notes && <p className="small">{j.result_notes}</p>}
                {j.next_action && <p className="small"><strong>다음:</strong> {j.next_action}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <ConfirmDialog
        open={!!del}
        title="이 기록을 삭제할까요?"
        confirmLabel="삭제"
        danger
        onCancel={() => setDel(null)}
        onConfirm={() => {
          update((d) => ({ ...d, practice: { ...d.practice, journal: d.practice.journal.filter((j) => j.id !== del) } }))
          setDel(null)
        }}
      >
        삭제하면 되돌릴 수 없어요.
      </ConfirmDialog>
    </div>
  )
}

function Goals({ mode }: { mode: Mode }) {
  const { data, update } = useStore()
  const [title, setTitle] = useState('')
  const [checkAt, setCheckAt] = useState('')
  const [next, setNext] = useState('')
  const [err, setErr] = useState<string>()
  const goals = data.practice.goals.filter((g) => g.mode === mode)
  const setGoals = (fn: (g: Goal[]) => Goal[]) => update((d) => ({ ...d, practice: { ...d.practice, goals: fn(d.practice.goals) } }))
  const add = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return setErr('목표를 적어주세요.')
    setErr(undefined)
    setGoals((g) => [{ id: uid(), mode, title: title.trim().slice(0, 200), check_at: checkAt || undefined, next_action: next.trim().slice(0, 300), completed: false, created_at: new Date().toISOString() }, ...g])
    setTitle('')
    setCheckAt('')
    setNext('')
  }
  return (
    <div className="grid-side">
      <section className="stack" aria-labelledby="g-h">
        <h2 id="g-h" className="h3">나의 목표</h2>
        {goals.length === 0 ? (
          <Empty title="목표가 아직 없어요">큰 목표보다 한 달 안에 확인할 수 있는 작은 목표가 좋아요.</Empty>
        ) : (
          <ul className="stack sm" style={{ listStyle: 'none' }}>
            {goals.map((g) => (
              <li key={g.id} className={`card tight ${g.completed ? 'paper' : ''}`}>
                <label className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start', cursor: 'pointer' }}>
                  <input type="checkbox" checked={g.completed} onChange={() => setGoals((gs) => gs.map((x) => (x.id === g.id ? { ...x, completed: !x.completed } : x)))} style={{ width: 22, height: 22, marginTop: 2, accentColor: 'var(--blue)' }} />
                  <span className="stack sm" style={{ gap: 2 }}>
                    <strong style={g.completed ? { textDecoration: 'line-through', color: 'var(--muted)' } : undefined}>{g.title}</strong>
                    <span className="small muted">
                      {g.check_at ? `점검일 ${g.check_at}` : '점검일 없음'}
                      {g.next_action && ` · 다음 행동: ${g.next_action}`}
                    </span>
                  </span>
                </label>
                <button className="link small" style={{ alignSelf: 'flex-end' }} onClick={() => setGoals((gs) => gs.filter((x) => x.id !== g.id))}>
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <form className="card stack" onSubmit={add} noValidate aria-labelledby="ga-h">
        <h2 id="ga-h" className="h3">목표 추가</h2>
        <Field label="목표 *" htmlFor="g-title" error={err}>
          <input id="g-title" type="text" value={title} maxLength={200} placeholder={mode === 'worker' ? '예: 보고서 초안 작업에 AI 적용하고 검토 기준 만들기' : '예: 서로 다른 영역 체험 3개 해보기'} onChange={(e) => setTitle(e.target.value)} aria-invalid={!!err} />
        </Field>
        <Field label="점검할 날" htmlFor="g-date">
          <input id="g-date" type="date" value={checkAt} onChange={(e) => setCheckAt(e.target.value)} style={{ width: '100%', padding: '13px 15px', border: '1px solid var(--line)', borderRadius: 14, minHeight: 48 }} />
        </Field>
        <Field label="이번 주 첫 행동" htmlFor="g-next">
          <input id="g-next" type="text" value={next} maxLength={300} onChange={(e) => setNext(e.target.value)} />
        </Field>
        <button className="btn primary" type="submit" style={{ alignSelf: 'flex-start' }}>
          <Icon name="plus" /> 목표 추가
        </button>
      </form>
    </div>
  )
}

function Updates({ mode }: { mode: Mode }) {
  return (
    <div className="stack lg">
      <Empty title="아직 검토를 마친 업데이트가 없어요">
        {mode === 'worker' ? 'AI 도구·업무 방식·규제 변화' : '새 체험·직업 이해·검증된 교육 경로'} 소식은 출처·발표일·검토일과 내 업무와의 관련성을 확인한 뒤에만 보여드려요.
      </Empty>
      <Notice>소식이 나와도 내 결과 날짜나 점수를 자동으로 바꾸지 않아요. 모델 변경은 검토·발행 후 새 버전으로만 반영돼요.</Notice>
      <div className="card paper">
        <h2 className="h3"><Icon name="bell" size={20} /> 알림</h2>
        <p className="small muted">과제 확인·검증 정보 변경·리포트 준비 알림은 계정 기능과 함께 제공될 예정이에요. 기본은 꺼짐이고, 원하는 채널·빈도만 직접 고를 수 있어요.</p>
      </div>
    </div>
  )
}
