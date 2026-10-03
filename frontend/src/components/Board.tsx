/* AI vs 인간 게시판 공용 컴포넌트. 편을 골라 한마디를 남기고, 편별 비율을 보여준다.
   글은 결과 점수에 영향을 주지 않는다. */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useCatalog } from '../lib/catalog'
import { community, SIDES, type Board, type Post, type Side } from '../lib/community'
import { useStore } from '../lib/store'
import { Icon } from './Icon'
import { ConfirmDialog, Notice } from './ui'

const timeAgo = (iso: string) => {
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  if (m < 1440) return `${Math.round(m / 60)}시간 전`
  if (m < 1440 * 7) return `${Math.round(m / 1440)}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
}

/** 편별 비율 막대. 글이 없으면 50:50 회색으로. */
export function SideBar({ counts, onPick, active }: { counts: Record<Side, number>; onPick?: (s: Side) => void; active?: Side | '' }) {
  const total = counts.ai + counts.human
  const pct = (s: Side) => (total ? Math.round((counts[s] / total) * 100) : 50)
  return (
    <div className="stack sm">
      <div className="side-pick">
        {SIDES.map((s) => {
          const inner = (
            <>
              <span>{s.emoji} {s.label}</span>
              <b className="num">{total ? `${pct(s.id)}%` : '—'}</b>
            </>
          )
          return onPick ? (
            <button key={s.id} type="button" className={`side-btn ${s.id}`} aria-pressed={active === s.id} onClick={() => onPick(s.id)}>
              {inner}
            </button>
          ) : (
            <div key={s.id} className={`side-btn ${s.id}`}>{inner}</div>
          )
        })}
      </div>
      <div className="side-bar" role="img" aria-label={total ? `AI편 ${pct('ai')}%, 인간편 ${pct('human')}%, 글 ${total}개` : '아직 글이 없어요'}>
        <span className="ai" style={{ flexGrow: total ? counts.ai : 1 }} />
        <span className="human" style={{ flexGrow: total ? counts.human : 1 }} />
      </div>
    </div>
  )
}

/** 글쓰기. 내 직업 태그는 선택이며, 결과가 있으면 그 직업으로 미리 골라둔다. */
export function PostComposer({ defaultSide, defaultOccupation, onPosted, onCancel }: { defaultSide?: Side; defaultOccupation?: string; onPosted: (p: Post) => void; onCancel?: () => void }) {
  const cat = useCatalog()
  const { data } = useStore()
  const guess = defaultOccupation ?? data.worker.current?.input_snapshot.occupation_id
  const [side, setSide] = useState<Side | undefined>(defaultSide)
  const [body, setBody] = useState('')
  const [nick, setNick] = useState('')
  const [tagJob, setTagJob] = useState(!!guess)
  const [occ, setOcc] = useState(guess ?? '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const err: Record<string, string> = {}
    if (!side) err.side = 'AI편인지 인간편인지 골라주세요.'
    if (body.trim().length < 2) err.body = '두 글자 이상 적어주세요.'
    if (tagJob && !occ) err.occupation_id = '직업을 골라주세요.'
    setErrors(err)
    if (Object.keys(err).length) return
    setBusy(true)
    try {
      const p = await community.addPost({ side: side!, body: body.trim(), nickname: nick.trim() || undefined, occupation_id: tagJob ? occ : undefined })
      setBody('')
      onPosted(p)
    } catch (e: any) {
      setErrors(e.fieldErrors && Object.keys(e.fieldErrors).length ? e.fieldErrors : { _: e.message })
    } finally {
      setBusy(false)
    }
  }
  const errText = (k: string) => errors[k] && <p className="small" role="alert" style={{ color: 'var(--danger)', fontWeight: 700 }}>{errors[k]}</p>

  return (
    <form className="card stack" onSubmit={submit} noValidate aria-label="한마디 남기기">
      <fieldset>
        <legend className="h3" style={{ marginBottom: 10 }}>당신은 어느 편?</legend>
        <div className="side-pick">
          {SIDES.map((s) => (
            <button key={s.id} type="button" className={`side-btn ${s.id}`} aria-pressed={side === s.id} onClick={() => setSide(s.id)}>
              <span>{s.emoji} {s.label}</span>
            </button>
          ))}
        </div>
        {errText('side')}
      </fieldset>
      <label className="sr-only" htmlFor="pc-body">한마디</label>
      <textarea id="pc-body" style={{ minHeight: 96 }} maxLength={200} placeholder={side ? SIDES.find((s) => s.id === side)!.quip : '편을 고르고 한마디 남겨주세요 (200자)'} value={body} onChange={(e) => setBody(e.target.value)} aria-invalid={!!errors.body} />
      <div className="row between small muted" style={{ marginTop: -8 }}>
        <span>이름·연락처·회사명은 적지 말아주세요</span>
        <span className="num">{body.length}/200</span>
      </div>
      {errText('body')}
      <div className="grid-2" style={{ gap: 10 }}>
        <div className="field">
          <label htmlFor="pc-nick">별명 (선택)</label>
          <input id="pc-nick" type="text" maxLength={12} placeholder="익명" value={nick} onChange={(e) => setNick(e.target.value)} />
          {errText('nickname')}
        </div>
        <div className="field">
          <label className="row" style={{ gap: 8, flexWrap: 'nowrap' }}>
            <input type="checkbox" checked={tagJob} onChange={(e) => setTagJob(e.target.checked)} style={{ width: 18, height: 18, accentColor: 'var(--blue)' }} />
            내 직업 붙이기
          </label>
          <select aria-label="내 직업" value={occ} onChange={(e) => setOcc(e.target.value)} disabled={!tagJob}>
            <option value="">직업 선택</option>
            {cat.occupations.map((o) => (
              <option key={o.occupation_id} value={o.occupation_id}>{o.name_ko}</option>
            ))}
          </select>
          {errText('occupation_id')}
        </div>
      </div>
      {errText('_')}
      <div className="btn-row">
        <button className="btn primary" type="submit" disabled={busy} aria-busy={busy}>
          {busy ? '올리는 중…' : '한마디 남기기'}
        </button>
        {onCancel && <button className="btn ghost" type="button" onClick={onCancel}>닫기</button>}
      </div>
      <p className="small muted">누구나 볼 수 있어요. 여러 명이 신고하면 자동으로 숨겨져요. 글은 결과 점수에 영향을 주지 않아요.</p>
    </form>
  )
}

export function PostItem({ post, onChange, onDeleted, highlight }: { post: Post; onChange: (p: Post) => void; onDeleted: (id: number) => void; highlight?: boolean }) {
  const [msg, setMsg] = useState<string>()
  const [del, setDel] = useState(false)
  const s = SIDES.find((x) => x.id === post.side)!
  const name = post.nickname || '익명'
  const like = async () => {
    try {
      const r = await community.like(post.id)
      onChange({ ...post, likes: r.likes, liked: r.liked })
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  const share = async () => {
    const url = `${location.origin}/community?post=${post.id}`
    try {
      if (typeof navigator.share === 'function') await navigator.share({ title: 'AI vs 인간 · NEXMI', text: post.body, url })
      else {
        await navigator.clipboard.writeText(url)
        setMsg('링크를 복사했어요')
      }
    } catch {
      /* 취소 */
    }
  }
  const report = async () => {
    try {
      await community.report(post.id)
      setMsg('신고했어요. 여러 명이 신고하면 자동으로 숨겨져요.')
    } catch (e: any) {
      setMsg(e.message)
    }
  }
  const remove = async () => {
    try {
      await community.deletePost(post.id)
      onDeleted(post.id)
    } catch (e: any) {
      setMsg(e.message)
    }
    setDel(false)
  }
  return (
    <li className={`post ${post.side} ${highlight ? 'hl' : ''}`}>
      <div className="row between" style={{ flexWrap: 'nowrap' }}>
        <div className="row" style={{ flexWrap: 'nowrap', gap: 10 }}>
          <span className="avatar" aria-hidden="true">{name.slice(0, 1)}</span>
          <span className="stack" style={{ gap: 0 }}>
            <span className="small strong">{name}</span>
            <span className="small muted">{timeAgo(post.created_at)}</span>
          </span>
        </div>
        <span className={`chip side-chip ${post.side}`}>{s.emoji} {s.label}</span>
      </div>
      <p style={{ whiteSpace: 'pre-wrap', fontSize: 16 }}>{post.body}</p>
      {post.occupation_id && (
        <Link to={`/community?job=${post.occupation_id}`} className="small muted" style={{ alignSelf: 'flex-start' }}>
          직업 · {post.occupation_name}
        </Link>
      )}
      <div className="row" style={{ gap: 6 }}>
        {post.mine ? (
          <span className="chip gray">👍 공감 {post.likes}</span>
        ) : (
          <button className="chip gray" aria-pressed={post.liked} onClick={like}>👍 공감 {post.likes}</button>
        )}
        <button className="chip gray" onClick={share}><Icon name="arrow" /> 공유</button>
        <span style={{ marginLeft: 'auto' }} />
        {post.mine ? (
          <button className="link small" onClick={() => setDel(true)}>삭제</button>
        ) : (
          <button className="link small" style={{ color: 'var(--muted)' }} onClick={report} aria-label={`${name}의 글 신고`}>신고</button>
        )}
      </div>
      {msg && <p role="status" className="small strong">{msg}</p>}
      <ConfirmDialog open={del} title="내 글을 지울까요?" confirmLabel="삭제" danger onCancel={() => setDel(false)} onConfirm={remove} />
    </li>
  )
}

/** 결과 화면·직군 상세에 붙는 작은 투표 상자: 이 직업 사람들은 어느 편? */
export function SidePoll({ occupationId, occupationName }: { occupationId: string; occupationName: string }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [err, setErr] = useState<string>()
  const [writing, setWriting] = useState<Side | null>(null)
  const load = () => community.posts({ occupation_id: occupationId, limit: 3 }).then(setBoard, (e) => setErr(e.message))
  useEffect(() => {
    load()
  }, [occupationId]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <section className="card stack" aria-labelledby="poll-h">
      <div className="row between">
        <div className="stack sm" style={{ gap: 2 }}>
          <span className="eyebrow">AI VS 인간</span>
          <h2 id="poll-h" className="h3">{occupationName}들은 어느 편일까요?</h2>
        </div>
        <Link to={`/community?job=${occupationId}`} className="link small">전체 보기 {board ? `(${board.total})` : ''}</Link>
      </div>
      {err ? (
        <Notice kind="error">게시판을 불러오지 못했어요. <button className="link" onClick={load}>다시 시도</button></Notice>
      ) : (
        <>
          <SideBar counts={board?.side_counts ?? { ai: 0, human: 0 }} onPick={(s) => setWriting(s)} active={writing ?? ''} />
          {!writing && <p className="small muted">편을 누르면 한마디를 남길 수 있어요.</p>}
          {writing && (
            <PostComposer
              key={writing}
              defaultSide={writing}
              defaultOccupation={occupationId}
              onCancel={() => setWriting(null)}
              onPosted={() => {
                setWriting(null)
                load()
              }}
            />
          )}
          {board && board.items.length > 0 ? (
            <ul className="stack sm" style={{ listStyle: 'none' }}>
              {board.items.map((p) => (
                <PostItem key={p.id} post={p} onChange={(np) => setBoard((b) => b && { ...b, items: b.items.map((x) => (x.id === np.id ? np : x)) })} onDeleted={() => load()} />
              ))}
            </ul>
          ) : (
            board && <p className="muted">아직 {occupationName}의 글이 없어요. 첫 번째로 편을 골라보세요.</p>
          )}
        </>
      )}
    </section>
  )
}
