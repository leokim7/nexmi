import { useEffect, useRef } from 'react'
import { NavLink, Outlet, ScrollRestoration, useLocation } from 'react-router-dom'
import { useCatalogState } from '../lib/catalog'
import { Icon } from './Icon'

const NAV = [
  { to: '/', label: '홈', icon: 'home', end: true },
  { to: '/worker', label: '직업 미래', icon: 'briefcase' },
  { to: '/explore', label: '진로 탐색', icon: 'compass' },
  { to: '/practice', label: '실천', icon: 'flag' },
  { to: '/me', label: '내 기록', icon: 'user' },
]
const ALSO_ACTIVE: Record<string, string[]> = { '/explore': ['/occupations', '/compare', '/activities'] }

export function Layout() {
  const loc = useLocation()
  const main = useRef<HTMLElement>(null)
  const first = useRef(true)

  // 라우트가 바뀌면 화면낭독기가 새 페이지를 읽도록 본문으로 포커스를 옮긴다.
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    main.current?.focus({ preventScroll: true })
  }, [loc.pathname])

  const isActive = (to: string, active: boolean) => active || (ALSO_ACTIVE[to] ?? []).some((p) => loc.pathname.startsWith(p))

  return (
    <>
      <a className="skip-link" href="#main">본문으로 건너뛰기</a>
      <nav className="site-nav" aria-label="주요 메뉴">
        <div className="wrap nav-inner">
          <NavLink to="/" className="brand" aria-label="NEXMI 홈">
            <span className="brand-mark" aria-hidden="true"><i /><i /><i /><i /></span>
            NEXMI<small>베타</small>
          </NavLink>
          <div className="nav-links">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive: a }) => (isActive(n.to, a) ? 'active' : '')}>
                {n.label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>
      <main id="main" ref={main} tabIndex={-1} className="app-main" style={{ outline: 'none' }}>
        <CatalogGate>
          <Outlet />
        </CatalogGate>
      </main>
      <nav className="tabbar" aria-label="하단 메뉴">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive: a }) => (isActive(n.to, a) ? 'active' : '')}>
            <Icon name={n.icon} />
            {n.label}
          </NavLink>
        ))}
      </nav>
      <ScrollRestoration />
    </>
  )
}

function CatalogGate({ children }: { children: React.ReactNode }) {
  const { state, retry } = useCatalogState()
  if (state.status === 'loading')
    return (
      <div className="wrap page" role="status">
        <p className="muted">직군·업무 정보를 불러오고 있어요…</p>
      </div>
    )
  if (state.status === 'error')
    return (
      <div className="wrap page narrow stack">
        <div className="notice error" role="alert">
          <Icon name="alert" />
          <div>직군·업무 정보를 불러오지 못했어요. {state.error.message}</div>
        </div>
        <div>
          <button className="btn primary" onClick={retry}>
            <Icon name="refresh" /> 다시 불러오기
          </button>
        </div>
      </div>
    )
  return <>{children}</>
}

export function useTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · NEXMI` : 'NEXMI — 나의 일, 다음'
  }, [title])
}
