/* AI vs 인간 게시판: 편을 골라 한마디 남기기. 필터·정렬·검색은 URL 에 둬서 공유·뒤로 가기에 유지. */
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PostComposer, PostItem, SideBar } from '../../components/Board'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Notice, Segmented } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { community, SIDES, type Board, type Post, type Side } from '../../lib/community'

export default function Community() {
  useTitle('AI vs 인간')
  const cat = useCatalog()
  const [sp, setSp] = useSearchParams()
  const side = (sp.get('side') as Side) || ''
  const job = sp.get('job') ?? ''
  const tag = (sp.get('tag') as 'job' | 'none') || ''
  const sort = sp.get('sort') === 'top' ? 'top' : 'new'
  const focusId = Number(sp.get('post')) || 0
  const [q, setQ] = useState(sp.get('q') ?? '')
  const [board, setBoard] = useState<Board | null>(null)
  const [err, setErr] = useState<string>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [composing, setComposing] = useState(false)
  const [focus, setFocus] = useState<Post | null>(null)
  const set = (k: string, v: string) => {
    const n = new URLSearchParams(sp)
    v ? n.set(k, v) : n.delete(k)
    n.delete('post')
    setSp(n, { replace: true })
  }

  const query = { side, occupation_id: job, tag: job ? '' : tag, sort, q: sp.get('q') ?? '' } as const
  const load = useCallback(() => {
    setErr(undefined)
    setBoard(null)
    community.posts({ ...query, limit: 20 }).then(setBoard, (e) => setErr(e.message))
  }, [side, job, tag, sort, sp.get('q')]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load])
  useEffect(() => {
    if (!focusId) return setFocus(null)
    community.post(focusId).then(setFocus, () => setFocus(null))
  }, [focusId])

  const more = async () => {
    if (!board?.next_before) return
    setLoadingMore(true)
    try {
      const next = await community.posts({ ...query, limit: 20, before: board.next_before })
      setBoard({ ...next, items: [...board.items, ...next.items] })
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoadingMore(false)
    }
  }
  const patch = (p: Post) => setBoard((b) => b && { ...b, items: b.items.map((x) => (x.id === p.id ? p : x)) })
  const drop = (id: number) => setBoard((b) => b && { ...b, items: b.items.filter((x) => x.id !== id), total: b.total - 1 })
  const jobName = job ? cat.occupationById.get(job)?.name_ko : undefined

  return (
    <div className="wrap page narrow">
      <div className="stack lg">
        <section className="vs-hero">
          <div className="eyebrow">AI VS 인간</div>
          <h1 className="display" style={{ fontSize: 'clamp(34px,5vw,56px)' }}>
            {jobName ? <>{jobName}, <br />당신은 어느 편?</> : <>당신은 <br />어느 편?</>}
          </h1>
          <div className="vs-quips" aria-hidden="true">
            {SIDES.map((s) => (
              <p key={s.id} className={`quip ${s.id}`}>{s.emoji} {s.quip}</p>
            ))}
          </div>
          {board ? <SideBar counts={board.side_counts} onPick={(s) => set('side', side === s ? '' : s)} active={side} /> : <div style={{ height: 96 }} />}
          {!composing ? (
            <button className="btn primary lg" onClick={() => setComposing(true)} style={{ width: '100%' }}>
              <Icon name="pen" /> 한마디 남기기
            </button>
          ) : (
            <PostComposer
              defaultOccupation={job || undefined}
              onCancel={() => setComposing(false)}
              onPosted={() => {
                setComposing(false)
                if (sort !== 'new' || side) setSp(job ? { job } : {}, { replace: true })
                else load()
              }}
            />
          )}
        </section>

        {focus && (
          <ul className="stack sm" style={{ listStyle: 'none' }} aria-label="공유된 글">
            <PostItem post={focus} highlight onChange={setFocus} onDeleted={() => setFocus(null)} />
          </ul>
        )}

        <div className="stack sm">
          <div className="row between">
            <div className="chips" role="group" aria-label="글 종류">
              <button className="chip gray" aria-pressed={!job && !tag} onClick={() => setSp(sort === 'top' ? { sort } : {}, { replace: true })}>전체</button>
              <button className="chip gray" aria-pressed={tag === 'job' && !job} onClick={() => setSp(sort === 'top' ? { tag: 'job', sort } : { tag: 'job' }, { replace: true })}>직업 붙은 글</button>
              {job && (
                <button className="chip" aria-pressed onClick={() => set('job', '')}>
                  {jobName} <Icon name="x" />
                </button>
              )}
            </div>
            <Segmented label="정렬" value={sort} onChange={(v) => set('sort', v === 'top' ? 'top' : '')} options={[{ id: 'new', label: '최신순' }, { id: 'top', label: '공감순' }]} />
          </div>
          <form
            className="search"
            onSubmit={(e) => {
              e.preventDefault()
              set('q', q.trim())
            }}
            role="search"
          >
            <Icon name="search" />
            <input type="search" aria-label="글·직업 검색" placeholder="글이나 직업으로 검색" value={q} onChange={(e) => setQ(e.target.value)} />
          </form>
          {board && <p className="small muted" role="status">글 {board.total}개{side ? ` 중 ${SIDES.find((s) => s.id === side)!.label}` : ''}</p>}
        </div>

        {err && (
          <Notice kind="error" role="alert">
            {err} <button className="link" onClick={load}>다시 시도</button>
          </Notice>
        )}
        {!board && !err && <p className="muted" role="status">불러오는 중…</p>}
        {board && board.items.length === 0 && (
          <div className="empty">
            <p className="h3">아직 글이 없어요</p>
            <p>첫 번째로 편을 골라 한마디 남겨보세요.</p>
          </div>
        )}
        {board && board.items.length > 0 && (
          <ul className="stack sm" style={{ listStyle: 'none' }}>
            {board.items.map((p) => (
              <PostItem key={p.id} post={p} onChange={patch} onDeleted={drop} />
            ))}
          </ul>
        )}
        {board?.next_before && (
          <button className="btn" onClick={more} disabled={loadingMore} style={{ alignSelf: 'center' }}>
            {loadingMore ? '불러오는 중…' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  )
}
