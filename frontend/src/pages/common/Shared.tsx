/* 공유 링크로 들어온 사람이 보는 화면: 카드 + ‘나도 해보기’. */
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { ShareCardView } from '../../components/ShareCard'
import { Empty } from '../../components/ui'
import { ApiError } from '../../lib/api'
import { community, type Share } from '../../lib/community'

export default function Shared() {
  const { token } = useParams()
  const [share, setShare] = useState<Share | null>(null)
  const [err, setErr] = useState<ApiError | null>(null)
  useTitle('공유된 결과')
  useEffect(() => {
    if (token) community.getShare(token).then(setShare, setErr)
  }, [token])

  if (err)
    return (
      <div className="wrap page narrow">
        <Empty title={err.status === 410 ? '공유가 끝난 결과예요' : '결과를 찾을 수 없어요'} action={<Link to="/" className="btn primary">나도 해보기</Link>}>
          {err.status === 410 ? '만든 사람이 지웠거나 90일이 지났어요.' : err.message}
        </Empty>
      </div>
    )
  if (!share) return <div className="wrap page" role="status"><p className="muted">불러오는 중…</p></div>

  const isWorker = share.mode === 'worker'
  return (
    <div className="wrap page narrow">
      <div className="stack lg" style={{ alignItems: 'center', textAlign: 'center' }}>
        <div className="eyebrow">친구가 보낸 결과</div>
        <ShareCardView share={share} />
        <h1 className="h2">{isWorker ? '내 직업은 몇 년 남았을까?' : '나와 맞는 직업은 뭘까?'}</h1>
        <p className="muted">{isWorker ? '직업을 고르고 두 가지만 답하면 30초 만에 알려드려요.' : '8가지 질문으로 내 관심과 맞는 직업을 찾아드려요.'}</p>
        <div className="btn-row stretch" style={{ justifyContent: 'center' }}>
          <Link to={isWorker ? '/' : '/explore'} className="btn primary lg">
            나도 해보기 <Icon name="arrow" />
          </Link>
          {isWorker && (
            <Link to={`/occupations/${share.payload.occupation_id}?tab=talk`} className="btn lg">
              {share.payload.occupation_name}들의 한마디
            </Link>
          )}
        </div>
        <p className="small muted">예언이 아닌 참고용 계산이에요. 입력한 답은 공유되지 않아요.</p>
      </div>
    </div>
  )
}
