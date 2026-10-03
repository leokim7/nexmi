import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useCatalogState } from '../lib/catalog'
import { useStore } from '../lib/store'
import { Icon } from './Icon'

export const COMPARE_MAX = 3

export function CompareToggle({ id, small = true }: { id: string; small?: boolean }) {
  const { data, update } = useStore()
  const [msg, setMsg] = useState<string>()
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(() => setMsg(undefined), 3000)
    return () => clearTimeout(t)
  }, [msg])
  const on = data.explorer.compare.includes(id)
  const toggle = () => {
    if (!on && data.explorer.compare.length >= COMPARE_MAX) return setMsg(`최대 ${COMPARE_MAX}개까지 비교할 수 있어요. 하나를 빼고 담아주세요.`)
    update((d) => ({ ...d, explorer: { ...d.explorer, compare: on ? d.explorer.compare.filter((x) => x !== id) : [...d.explorer.compare, id] } }))
  }
  return (
    <span className="row" style={{ gap: 8 }}>
      <button type="button" className={`btn ${small ? 'sm' : ''} ${on ? 'dark' : 'ghost'}`} aria-pressed={on} onClick={toggle}>
        <Icon name={on ? 'check' : 'plus'} /> {on ? '비교에 담음' : '비교 담기'}
      </button>
      <span role="status" className="small" style={{ color: 'var(--danger)', fontWeight: 700 }}>
        {msg}
      </span>
    </span>
  )
}

/** 직군 비교 바구니. 탐색 화면에서만 하단에 띄운다. */
export function CompareTray() {
  const { data, update } = useStore()
  const { state } = useCatalogState()
  const loc = useLocation()
  const ids = data.explorer.compare
  const show = ids.length > 0 && /^\/(explore\/result|occupations)/.test(loc.pathname)
  if (!show || state.status !== 'ready') return null
  const cat = state.catalog
  return (
    <div className="tray no-print" role="region" aria-label="직군 비교 바구니">
      <span className="names">
        <strong className="num">{ids.length}/{COMPARE_MAX}</strong> · {ids.map((i) => cat.occupationById.get(i)?.name_ko).join(', ')}
      </span>
      <button className="btn sm ghost" style={{ color: '#fff' }} onClick={() => update((d) => ({ ...d, explorer: { ...d.explorer, compare: [] } }))} aria-label="비교 바구니 비우기">
        <Icon name="x" />
      </button>
      <Link to="/compare" className="btn sm primary">
        비교하기
      </Link>
    </div>
  )
}
