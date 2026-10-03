import { useState } from 'react'
import { community, workerHeadline, type CreatedShare, type ExplorerCard, type Share, type WorkerCard } from '../lib/community'
import { stageLabel } from '../lib/labels'
import { useStore } from '../lib/store'
import type { ExplorerInput, Mode, WorkerInput } from '../lib/types'
import { Icon } from './Icon'
import { ConfirmDialog, Notice } from './ui'

/** 화면에 보이는 공유 카드. 이미지 저장 시에도 같은 문구를 쓴다. */
export function ShareCardView({ share }: { share: Share }) {
  const t = cardText(share)
  return (
    <div className="share-card" role="img" aria-label={`${t.top} ${t.big} ${t.line}`}>
      <div className="row between">
        <span className="brand" style={{ color: '#fff', fontSize: 18 }}>
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>NEXMI
        </span>
        <span className="small" style={{ color: '#8fb3ff', fontWeight: 800 }}>{t.tag}</span>
      </div>
      <p className="small strong" style={{ color: 'rgba(255,255,255,.75)' }}>{t.top}</p>
      <p className="share-big">{t.big}</p>
      <p className="h3" style={{ color: '#fff' }}>{t.line}</p>
      <p className="small" style={{ color: 'rgba(255,255,255,.6)' }}>{t.foot}</p>
    </div>
  )
}

function cardText(share: Share) {
  if (share.mode === 'worker') {
    const p = share.payload as WorkerCard
    const h = workerHeadline(p.crossings.base)
    return { tag: '내 직업, 언제 바뀔까?', top: p.occupation_name, big: h.big, line: h.line, foot: `AI가 지금 속도로 퍼진다면${p.quick ? ' · 평균값으로 계산' : ''} · 예언이 아닌 참고용 계산` }
  }
  const p = share.payload as ExplorerCard
  return {
    tag: '나와 맞는 직업은?',
    top: `${stageLabel(p.stage)}의 관심 맞춤 직업`,
    big: p.top[0]?.name_ko ?? '탐색 중',
    line: p.top.slice(1).map((x) => x.name_ko).join(' · ') || '조금 더 알아보는 중이에요',
    foot: '내 관심과 겹치는 정도 · 적성검사가 아니에요',
  }
}

async function drawPng(share: Share): Promise<Blob | null> {
  const t = cardText(share)
  const W = 1080
  const H = 1350
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const g = c.getContext('2d')
  if (!g) return null
  await document.fonts?.ready
  const font = (w: number, s: number) => `${w} ${s}px "Pretendard Variable", Pretendard, -apple-system, sans-serif`
  g.fillStyle = '#071d49'
  g.fillRect(0, 0, W, H)
  const grad = g.createRadialGradient(W, 0, 50, W, 0, 900)
  grad.addColorStop(0, 'rgba(20,100,255,.55)')
  grad.addColorStop(1, 'rgba(20,100,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  g.fillStyle = '#fff'
  g.font = font(900, 44)
  g.fillText('NEXMI', 96, 140)
  g.fillStyle = '#8fb3ff'
  g.font = font(800, 40)
  g.fillText(t.tag, 96, 420)
  g.fillStyle = 'rgba(255,255,255,.8)'
  g.font = font(800, 52)
  g.fillText(t.top, 96, 520)
  g.fillStyle = '#fff'
  let size = 170
  g.font = font(900, size)
  while (g.measureText(t.big).width > W - 192 && size > 80) g.font = font(900, (size -= 8))
  g.fillText(t.big, 96, 740)
  g.font = font(800, 64)
  wrap(g, t.line, 96, 860, W - 192, 84)
  g.fillStyle = 'rgba(255,255,255,.6)'
  g.font = font(700, 32)
  wrap(g, t.foot, 96, 1180, W - 192, 46)
  g.fillText(location.host, 96, 1270)
  return new Promise((r) => c.toBlob((b) => r(b), 'image/png'))
}

function wrap(g: CanvasRenderingContext2D, text: string, x: number, y: number, max: number, lh: number) {
  let line = ''
  for (const ch of text.split(/(\s+)/)) {
    if (g.measureText(line + ch).width > max && line.trim()) {
      g.fillText(line.trim(), x, y)
      y += lh
      line = ch.trimStart()
    } else line += ch
  }
  if (line.trim()) g.fillText(line.trim(), x, y)
}

/** 결과 화면의 공유 버튼 + 공유 시트. 링크는 사용자가 누를 때만 서버에 만들어진다. */
export function ShareButton({ mode, input, quick, title }: { mode: Mode; input: WorkerInput | ExplorerInput; quick?: boolean; title: string }) {
  const { update } = useStore()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string>()
  const [made, setMade] = useState<CreatedShare | null>(null)
  const [msg, setMsg] = useState<string>()
  const [confirmDel, setConfirmDel] = useState(false)
  const url = made ? `${location.origin}${made.path}` : ''

  const create = async () => {
    setBusy(true)
    setErr(undefined)
    try {
      const s = await community.createShare(mode, input, quick)
      setMade(s)
      update((d) => ({ ...d, shares: [{ id: s.id, path: s.path, delete_key: s.delete_key, mode, title, created_at: new Date().toISOString(), expires_at: s.expires_at }, ...d.shares].slice(0, 30) }))
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setMsg('링크를 복사했어요')
    } catch {
      setMsg('복사하지 못했어요. 링크를 길게 눌러 복사해주세요.')
    }
  }
  const nativeShare = async () => {
    try {
      await navigator.share({ title: 'NEXMI', text: title, url })
    } catch {
      /* 사용자가 취소 */
    }
  }
  const savePng = async () => {
    if (!made) return
    const b = await drawPng(made)
    if (!b) return setMsg('이미지를 만들지 못했어요.')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(b)
    a.download = `nexmi-${made.id}.png`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const remove = async () => {
    if (!made) return
    try {
      await community.deleteShare(made.id, made.delete_key)
      update((d) => ({ ...d, shares: d.shares.filter((s) => s.id !== made.id) }))
      setMade(null)
      setMsg('공유를 삭제했어요. 이제 링크가 열리지 않아요.')
    } catch (e: any) {
      setMsg(e.message)
    }
    setConfirmDel(false)
  }

  return (
    <>
      <button className="btn primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Icon name="spark" /> 결과 공유하기
      </button>
      {open && (
        <div className="card soft stack" style={{ flexBasis: '100%' }} role="region" aria-label="결과 공유">
          {!made ? (
            <>
              <p className="strong">친구에게 내 결과를 보여주세요</p>
              <p className="small muted">
                공개되는 건 <strong>{mode === 'worker' ? '직업 이름과 결과 숫자' : '관심 맞춤 직업 3개'}</strong>뿐이에요. 내가 입력한 답은 공개되지 않아요. 링크는 90일 뒤 사라지고, 언제든 지울 수 있어요.
              </p>
              {err && <Notice kind="error" role="alert">{err}</Notice>}
              <div className="btn-row">
                <button className="btn primary sm" onClick={create} disabled={busy} aria-busy={busy}>
                  {busy ? '만드는 중…' : '공유 링크 만들기'}
                </button>
                <button className="btn ghost sm" onClick={() => setOpen(false)}>닫기</button>
              </div>
            </>
          ) : (
            <>
              <ShareCardView share={made} />
              <div className="field">
                <label htmlFor="share-url">공유 링크</label>
                <input id="share-url" type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
              </div>
              <div className="btn-row">
                <button className="btn primary sm" onClick={copy}>링크 복사</button>
                {'share' in navigator && <button className="btn sm" onClick={nativeShare}>바로 공유</button>}
                <button className="btn sm" onClick={savePng}>이미지 저장</button>
                <button className="btn ghost sm" onClick={() => setConfirmDel(true)}>공유 삭제</button>
              </div>
            </>
          )}
          <p role="status" className="small strong">{msg}</p>
        </div>
      )}
      <ConfirmDialog open={confirmDel} title="공유를 삭제할까요?" confirmLabel="삭제" danger onCancel={() => setConfirmDel(false)} onConfirm={remove}>
        링크를 받은 사람도 더 이상 볼 수 없어요.
      </ConfirmDialog>
    </>
  )
}
