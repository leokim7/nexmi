import { useCallback, useEffect, useState } from 'react'
import { ApiError } from '../lib/api'
import { community, REACTIONS, type Comment, type Reaction } from '../lib/community'
import { ConfirmDialog, Notice, Segmented } from './ui'

const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  if (m < 1440) return `${Math.round(m / 60)}시간 전`
  return `${Math.round(m / 1440)}일 전`
}

/** 같은 직업 사람들의 한마디. 익명·짧게·신고 3회면 숨김. 점수·결과에는 영향 없음. */
export function Comments({ occupationId, occupationName }: { occupationId: string; occupationName: string }) {
  const [sort, setSort] = useState<'new' | 'top'>('new')
  const [data, setData] = useState<{ items: Comment[]; counts: Record<Reaction, number>; total: number } | null>(null)
  const [loadErr, setLoadErr] = useState<string>()
  const [reaction, setReaction] = useState<Reaction>()
  const [body, setBody] = useState('')
  const [nick, setNick] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string>()
  const [del, setDel] = useState<number | null>(null)

  const load = useCallback(() => {
    setLoadErr(undefined)
    community.comments(occupationId, sort).then(setData, (e: ApiError) => setLoadErr(e.message))
  }, [occupationId, sort])
  useEffect(load, [load])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!reaction) err.reaction = '지금 기분을 골라주세요.'
    if (body.trim().length < 2) err.body = '두 글자 이상 적어주세요.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      await community.addComment(occupationId, { reaction: reaction!, body: body.trim(), nickname: nick.trim() || undefined })
      setBody('')
      setReaction(undefined)
      setMsg('한마디를 남겼어요')
      setSort('new')
      load()
    } catch (e: any) {
      setErrors(e.fieldErrors && Object.keys(e.fieldErrors).length ? e.fieldErrors : { _: e.message })
    } finally {
      setBusy(false)
    }
  }
  const patch = (id: number, p: Partial<Comment>) => setData((d) => (d ? { ...d, items: d.items.map((c) => (c.id === id ? { ...c, ...p } : c)) } : d))
  const like = async (c: Comment) => {
    try {
      const r = await community.like(c.id)
      patch(c.id, { likes: r.likes, liked: r.liked })
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  const report = async (c: Comment) => {
    try {
      await community.report(c.id)
      setMsg('신고했어요. 여러 명이 신고하면 자동으로 숨겨져요.')
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  const remove = async () => {
    if (del == null) return
    try {
      await community.deleteComment(del)
      load()
    } catch (e: any) {
      setMsg(e.message)
    }
    setDel(null)
  }
  const total = data?.total ?? 0

  return (
    <section className="card stack" aria-labelledby="cm-h">
      <div className="row between">
        <h2 id="cm-h" className="h3">
          {occupationName}들의 한마디 {total > 0 && <span className="chip gray num">{total}</span>}
        </h2>
        <Segmented label="정렬" value={sort} onChange={setSort} options={[{ id: 'new', label: '최신' }, { id: 'top', label: '공감 많은' }]} />
      </div>

      {total > 0 && data && (
        <div className="stack sm" aria-label="반응 분포">
          <div className="reaction-bar" aria-hidden="true">
            {REACTIONS.map((r) => (data.counts[r.id] ? <span key={r.id} className={`rb-${r.id}`} style={{ flexGrow: data.counts[r.id] }} /> : null))}
          </div>
          <div className="chips">
            {REACTIONS.map((r) => (
              <span key={r.id} className="chip line num">
                {r.emoji} {r.label} {Math.round(((data.counts[r.id] ?? 0) / total) * 100)}%
              </span>
            ))}
          </div>
        </div>
      )}

      <form className="stack sm" onSubmit={submit} noValidate>
        <fieldset>
          <legend className="small strong" style={{ marginBottom: 8 }}>지금 내 기분은?</legend>
          <div className="chips">
            {REACTIONS.map((r) => (
              <button type="button" key={r.id} className="chip gray" aria-pressed={reaction === r.id} onClick={() => setReaction(r.id)}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          {errors.reaction && <p className="small" style={{ color: 'var(--danger)', fontWeight: 700 }}>{errors.reaction}</p>}
        </fieldset>
        <label className="sr-only" htmlFor="cm-body">한마디</label>
        <textarea id="cm-body" style={{ minHeight: 84 }} maxLength={200} placeholder="같은 일을 하는 사람들에게 한마디 (200자)" value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body} />
        {errors.body && <p className="small" role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{errors.body}</p>}
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <label className="sr-only" htmlFor="cm-nick">별명 (선택)</label>
          <input id="cm-nick" type="text" maxLength={12} placeholder="별명 (선택)" value={nick} onChange={(e) => setNick(e.target.value)} style={{ maxWidth: 200 }} />
          <button className="btn primary sm" type="submit" disabled={busy} aria-busy={busy}>
            {busy ? '남기는 중…' : '남기기'}
          </button>
        </div>
        {(errors.nickname || errors._) && <p className="small" role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{errors.nickname || errors._}</p>}
        <p className="small muted">누구나 볼 수 있어요. 이름·연락처·회사명은 적지 말아주세요. 한마디는 결과 점수에 영향을 주지 않아요.</p>
      </form>
      <p role="status" className="small strong">{msg}</p>

      {loadErr ? (
        <Notice kind="error">
          한마디를 불러오지 못했어요. <button className="link" onClick={load}>다시 시도</button>
        </Notice>
      ) : !data ? (
        <p className="muted small">불러오는 중…</p>
      ) : data.items.length === 0 ? (
        <p className="muted">아직 한마디가 없어요. 첫 번째로 남겨보세요.</p>
      ) : (
        <ul className="stack sm" style={{ listStyle: 'none' }}>
          {data.items.map((c) => {
            const r = REACTIONS.find((x) => x.id === c.reaction)
            return (
              <li key={c.id} className="comment">
                <div className="row between">
                  <span className="small strong">
                    {r?.emoji} {c.nickname || '익명'} <span className="muted" style={{ fontWeight: 400 }}>· {timeAgo(c.created_at)}</span>
                  </span>
                  {c.mine ? (
                    <button className="link small" onClick={() => setDel(c.id)}>삭제</button>
                  ) : (
                    <button className="link small" style={{ color: 'var(--muted)' }} onClick={() => report(c)} aria-label={`${c.nickname || '익명'}의 한마디 신고`}>
                      신고
                    </button>
                  )}
                </div>
                <p style={{ whiteSpace: 'pre-wrap' }}>{c.body}</p>
                {!c.mine && (
                  <button className="chip gray" aria-pressed={c.liked} onClick={() => like(c)} style={{ alignSelf: 'flex-start' }}>
                    👍 공감 {c.likes}
                  </button>
                )}
                {c.mine && <span className="small muted">👍 공감 {c.likes}</span>}
              </li>
            )
          })}
        </ul>
      )}
      <ConfirmDialog open={del != null} title="내 한마디를 지울까요?" confirmLabel="삭제" danger onCancel={() => setDel(null)} onConfirm={remove} />
    </section>
  )
}
