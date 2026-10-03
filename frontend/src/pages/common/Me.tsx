/* 내 기록: 대시보드(SC-19/W-15) + 기록·저장 관리(SC-22/23, W-17/19)를 한 화면으로 통합. */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { ConfirmDialog, Empty, Notice, PageHead } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { dateText, stageLabel, yearText } from '../../lib/labels'
import { useStore } from '../../lib/store'

type Pending = null | 'device-on' | 'device-off' | 'worker' | 'explorer' | 'practice' | 'all' | 'corrupt'

export default function Me() {
  useTitle('내 기록')
  const cat = useCatalog()
  const s = useStore()
  const { data } = s
  const [pending, setPending] = useState<Pending>(null)
  const w = data.worker.current
  const e = data.explorer.current
  const subs = Object.values(data.explorer.submissions)
  const completed = subs.filter((x) => x.completions.length > 0)
  const drafts = subs.filter((x) => x.status === 'draft')
  const empty = !w && !e && subs.length === 0 && data.practice.journal.length === 0

  const confirmText: Record<Exclude<Pending, null>, { title: string; body: string; label: string; danger?: boolean; run: () => void }> = {
    'device-on': { title: '이 기기에 기록을 저장할까요?', body: '분석 결과·체험 초안·기록이 이 브라우저(localStorage)에 저장되고, 다음에 열면 자동으로 이어져요. 서버로 보내지 않아요. 여러 사람이 쓰는 기기라면 켜지 마세요.', label: '저장 켜기', run: s.enableDevice },
    'device-off': { title: '기기 저장을 끄고 저장본을 지울까요?', body: '이 기기에 저장된 기록이 삭제돼요. 현재 탭의 내용은 탭을 닫기 전까지 남아 있어요.', label: '끄고 삭제', danger: true, run: s.disableDevice },
    worker: { title: '재직자 기록을 초기화할까요?', body: '분석 결과·이력·대응 시뮬레이션·계획이 지워져요. 진로 탐색 기록은 그대로예요.', label: '초기화', danger: true, run: () => s.resetMode('worker') },
    explorer: { title: '진로 탐색 기록을 초기화할까요?', body: '응답·결과·이력·체험 초안과 성찰·비교 목록이 지워져요. 재직자 기록은 그대로예요.', label: '초기화', danger: true, run: () => s.resetMode('explorer') },
    practice: { title: '실천 기록을 초기화할까요?', body: '일지·목표·과제 완료 표시가 지워져요.', label: '초기화', danger: true, run: () => s.resetMode('practice') },
    all: { title: '모든 기록을 지울까요?', body: '현재 탭과(저장을 켰다면) 이 기기의 모든 기록이 지워져요. 되돌릴 수 없어요.', label: '모두 삭제', danger: true, run: s.resetAll },
    corrupt: { title: '손상된 저장본을 지울까요?', body: '읽을 수 없는 저장본을 삭제하고 기기 저장을 꺼요.', label: '삭제', danger: true, run: s.disableDevice },
  }

  return (
    <div className="wrap page">
      <PageHead eyebrow="MY RECORDS" title="내 기록" lead="두 모드의 결과와 체험·실천 기록을 모아봐요. 두 모드의 점수를 합치지 않아요." />
      <div className="stack lg">
        <DeviceCard onAsk={setPending} />

        {empty ? (
          <Empty title="아직 기록이 없어요" action={<div className="btn-row"><Link to="/worker" className="btn primary">직업 미래 분석</Link><Link to="/explore" className="btn">진로 탐색</Link></div>}>
            분석이나 체험을 하면 여기에 모여요.
          </Empty>
        ) : (
          <div className="grid-2">
            <section className="card" aria-labelledby="mw-h">
              <div className="row between">
                <h2 id="mw-h" className="h3">직업 미래</h2>
                <span className="chip gray num">이력 {data.worker.history.length}</span>
              </div>
              {w ? (
                <>
                  <p>
                    <strong>{cat.occupationById.get(w.input_snapshot.occupation_id)?.name_ko}</strong>{' '}
                    <span className="muted">· 기준 가정 전환점 {yearText(w.result.crossings.base.career_transformation)}</span>
                  </p>
                  <p className="small muted">{dateText(w.created_at)} · 모델 {w.model_version}</p>
                  <div className="btn-row">
                    <Link to="/worker/result" className="btn sm primary">결과 보기</Link>
                    <Link to="/report/worker" className="btn sm"><Icon name="print" /> 리포트</Link>
                    <Link to="/me/history?mode=worker" className="btn sm ghost">이력 비교</Link>
                  </div>
                </>
              ) : (
                <p className="muted small">아직 분석하지 않았어요. <Link className="link" to="/worker">시작하기</Link></p>
              )}
            </section>
            <section className="card" aria-labelledby="me-h">
              <div className="row between">
                <h2 id="me-h" className="h3">진로 탐색</h2>
                <span className="chip gray num">이력 {data.explorer.history.length}</span>
              </div>
              {e ? (
                <>
                  <p>
                    <strong>{stageLabel(e.input_snapshot.stage)}</strong>{' '}
                    <span className="muted">· {e.result.status === 'exploration_ready' ? e.result.recommendations.map((r) => r.name_ko).slice(0, 3).join(', ') : '추가 탐색 필요'}</span>
                  </p>
                  <p className="small muted">{dateText(e.created_at)} · 모델 {e.model_version}</p>
                  <div className="btn-row">
                    <Link to="/explore/result" className="btn sm primary">결과 보기</Link>
                    <Link to="/report/explorer" className="btn sm"><Icon name="print" /> 리포트</Link>
                    <Link to="/me/history?mode=explorer" className="btn sm ghost">이력 비교</Link>
                  </div>
                </>
              ) : (
                <p className="muted small">아직 탐색하지 않았어요. <Link className="link" to="/explore">시작하기</Link></p>
              )}
              {(completed.length > 0 || drafts.length > 0) && (
                <div className="stack sm">
                  <span className="small strong">체험 · 완료 {completed.length} / 진행 중 {drafts.length}</span>
                  <ul className="stack sm" style={{ listStyle: 'none' }}>
                    {[...drafts, ...completed].slice(0, 4).map((x) => (
                      <li key={x.activity_id} className="small">
                        <Link className="link" to={`/activities/${x.activity_id}`}>{cat.activityById.get(x.activity_id)?.title}</Link>{' '}
                        <span className="muted">· {x.status === 'draft' ? '진행 중' : `완료 ${x.completions.length}회`}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          </div>
        )}

        <section className="card" aria-labelledby="pr-h">
          <div className="row between">
            <h2 id="pr-h" className="h3">실천 기록</h2>
            <Link to="/practice" className="link small">실천으로</Link>
          </div>
          <p className="small muted">
            일지 {data.practice.journal.length}개 · 목표 {data.practice.goals.length}개 (완료 {data.practice.goals.filter((g) => g.completed).length}) · 과제 완료 {data.practice.missionsDone.length}개
          </p>
        </section>

        <section className="card paper" aria-labelledby="dm-h">
          <h2 id="dm-h" className="h3">기록 관리</h2>
          <p className="small muted">모드별로 따로 지울 수 있어요. 현재 탭과 기기 저장본에 함께 적용돼요.</p>
          <div className="btn-row">
            <button className="btn sm danger" onClick={() => setPending('worker')}>재직자 기록 초기화</button>
            <button className="btn sm danger" onClick={() => setPending('explorer')}>진로 탐색 기록 초기화</button>
            <button className="btn sm danger" onClick={() => setPending('practice')}>실천 기록 초기화</button>
            <button className="btn sm dark" onClick={() => setPending('all')}><Icon name="trash" /> 모두 삭제</button>
          </div>
          <p className="small muted">공유 링크·계정 저장은 아직 제공하지 않아요. 제공되면 공유 철회와 계정 기록 삭제도 여기에서 함께 관리해요.</p>
        </section>
      </div>
      {pending && (
        <ConfirmDialog
          open
          title={confirmText[pending].title}
          confirmLabel={confirmText[pending].label}
          danger={confirmText[pending].danger}
          onCancel={() => setPending(null)}
          onConfirm={() => {
            confirmText[pending].run()
            setPending(null)
          }}
        >
          {confirmText[pending].body}
        </ConfirmDialog>
      )}
    </div>
  )
}

function DeviceCard({ onAsk }: { onAsk: (p: Pending) => void }) {
  const { device } = useStore()
  return (
    <section className={`card ${device.status === 'on' ? 'soft' : ''}`} aria-labelledby="dev-h">
      <div className="row between top">
        <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'flex-start' }}>
          <div className="icon-box"><Icon name="device" /></div>
          <div className="stack sm" style={{ gap: 4 }}>
            <h2 id="dev-h" className="h3">
              이 기기에 저장 {device.status === 'on' ? <span className="chip ok">켜짐</span> : device.status === 'corrupt' ? <span className="chip warn">저장본 손상</span> : <span className="chip gray">꺼짐</span>}
            </h2>
            <p className="small muted">
              {device.status === 'on'
                ? `변경할 때마다 이 브라우저에 저장돼요${device.savedAt ? ` · 마지막 저장 ${dateText(device.savedAt)}` : ''}.`
                : device.status === 'unavailable'
                  ? '이 브라우저에서는 기기 저장을 쓸 수 없어요(사생활 보호 모드 등). 현재 탭에서만 보관돼요.'
                  : device.status === 'corrupt'
                    ? '저장본을 읽을 수 없어요. 손상된 저장본을 지우고 다시 시작해주세요.'
                    : '지금은 현재 탭에만 보관돼요. 새로고침하거나 탭을 닫으면 사라져요.'}
            </p>
          </div>
        </div>
        {device.status === 'off' && <button className="btn sm primary" onClick={() => onAsk('device-on')}>저장 켜기</button>}
        {device.status === 'on' && <button className="btn sm" onClick={() => onAsk('device-off')}>끄고 저장본 삭제</button>}
        {device.status === 'corrupt' && <button className="btn sm dark" onClick={() => onAsk('corrupt')}>손상된 저장본 삭제</button>}
      </div>
      {device.error && <Notice kind="error" role="alert">{device.error}</Notice>}
    </section>
  )
}
