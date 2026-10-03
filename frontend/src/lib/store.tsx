/* App state.
   기본은 현재 탭 메모리만 사용한다(새로고침하면 사라짐).
   사용자가 '이 기기에 저장'을 켠 경우에만 localStorage 에 버전·손상검사와 함께 보관한다. */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { CareerLevel, ExplorerDiagnosis, Mode, Stage, WorkerDiagnosis, YearResult, Scenario } from './types'

export interface WorkerDraft {
  occupation_id?: string
  career_level?: CareerLevel
  /** percent per task. undefined = 아직 임시 분포(직군·역할 기본값)를 그대로 사용 */
  weights?: Record<string, number>
  ai_maturity?: string
  personal: Record<string, number | undefined>
  company_size?: string
}
export interface ExplorerDraft {
  stage?: Stage
  /** key 없음 = 아직 답하지 않음, null = 모름 */
  interests: Record<string, number | null>
  skills: Record<string, number | null>
  weekly_minutes?: number
  experiences: string[]
  favorites: string[]
  /** 수집 전용 — 현재 엔진 점수에 반영되지 않는다 */
  values: string[]
}
export interface Submission {
  activity_id: string
  step: number
  drafts: string[]
  enjoyment?: number
  repeat_interest?: number
  reflection: string
  status: 'draft' | 'completed'
  updated_at: string
  completions: { at: string; enjoyment: number; repeat_interest: number }[]
}
export interface JournalEntry {
  id: string
  mode: Mode
  created_at: string
  title: string
  occupation_id?: string
  task_id?: string
  activity_id?: string
  minutes?: number
  verification_minutes?: number
  result_notes: string
  reflection: string
  next_action: string
  mission_id?: string
}
export interface Goal { id: string; mode: Mode; title: string; check_at?: string; next_action: string; completed: boolean; created_at: string }

export interface AppData {
  worker: { draft: WorkerDraft; current?: WorkerDiagnosis; history: WorkerDiagnosis[]; whatif?: { draft: WorkerDraft; result?: WorkerDiagnosis }; planDone: Record<string, boolean> }
  explorer: { draft: ExplorerDraft; current?: ExplorerDiagnosis; history: ExplorerDiagnosis[]; compare: string[]; submissions: Record<string, Submission>; planDone: Record<string, boolean> }
  practice: { journal: JournalEntry[]; goals: Goal[]; missionsDone: string[] }
  /** 내가 만든 공유 링크 (삭제 키 포함 — 이 기기에서만 지울 수 있음) */
  shares: MyShare[]
}
export interface MyShare { id: string; path: string; delete_key: string; mode: Mode; title: string; created_at: string; expires_at: string }

export const emptyWorkerDraft = (): WorkerDraft => ({ personal: {} })
export const emptyExplorerDraft = (): ExplorerDraft => ({ interests: {}, skills: {}, experiences: [], favorites: [], values: [] })
const empty = (): AppData => ({
  worker: { draft: emptyWorkerDraft(), history: [], planDone: {} },
  explorer: { draft: emptyExplorerDraft(), history: [], compare: [], submissions: {}, planDone: {} },
  practice: { journal: [], goals: [], missionsDone: [] },
  shares: [],
})

export const HISTORY_LIMIT = 10
export const TASK_YEARS = [2026, 2031, 2036, 2040]

/** 전체 결과(약 300KB)에서 화면에 쓰는 부분만 남긴다: 모든 연도 지표 + 일부 연도 업무별 결과. */
export function compactWorker(d: WorkerDiagnosis): WorkerDiagnosis {
  const paths = Object.fromEntries(
    Object.entries(d.result.paths).map(([s, rows]) => [s, rows.map((r: YearResult) => (TASK_YEARS.includes(r.year) ? r : { ...r, tasks: [] }))]),
  ) as Record<Scenario, YearResult[]>
  return { ...d, result: { ...d.result, paths } }
}

// ---------------- device storage ----------------
const KEY = 'nexmi:v1'
const CONSENT_KEY = 'nexmi:device-consent'
const SCHEMA = 1
export const CONSENT_VERSION = '2026-10'

export type DeviceStatus = 'off' | 'on' | 'corrupt' | 'unavailable'

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function storageAvailable() {
  try {
    localStorage.setItem('nexmi:probe', '1')
    localStorage.removeItem('nexmi:probe')
    return true
  } catch {
    return false
  }
}

function readDevice(): { status: DeviceStatus; data?: AppData; savedAt?: string } {
  if (!storageAvailable()) return { status: 'unavailable' }
  const consent = safeGet(CONSENT_KEY)
  if (!consent) return { status: 'off' }
  const raw = safeGet(KEY)
  if (!raw) return { status: 'on' }
  try {
    const parsed = JSON.parse(raw)
    if (parsed?.schema !== SCHEMA || !parsed.data?.worker || !parsed.data?.explorer || !parsed.data?.practice) throw new Error('schema')
    const base = empty()
    const data: AppData = {
      worker: { ...base.worker, ...parsed.data.worker },
      explorer: { ...base.explorer, ...parsed.data.explorer },
      practice: { ...base.practice, ...parsed.data.practice },
      shares: Array.isArray(parsed.data.shares) ? parsed.data.shares : [],
    }
    return { status: 'on', data, savedAt: parsed.saved_at }
  } catch {
    return { status: 'corrupt' }
  }
}

// ---------------- context ----------------
interface Store {
  data: AppData
  update: (fn: (d: AppData) => AppData) => void
  device: { status: DeviceStatus; savedAt?: string; error?: string }
  enableDevice: () => void
  disableDevice: () => void
  resetMode: (mode: Mode | 'practice' | 'shares') => void
  resetAll: () => void
  /** 작성 중인 체험 초안이 있으면 이탈 경고를 띄운다 */
  dirtyActivity: string | null
  setDirtyActivity: (id: string | null) => void
}
const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useRef(readDevice())
  const [data, setData] = useState<AppData>(() => initial.current.data ?? empty())
  const [device, setDevice] = useState<Store['device']>({ status: initial.current.status, savedAt: initial.current.savedAt })
  const [dirtyActivity, setDirtyActivity] = useState<string | null>(null)

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), [])

  // Persist only with consent. Debounced; quota errors are surfaced, not swallowed.
  useEffect(() => {
    if (device.status !== 'on') return
    const t = setTimeout(() => {
      const saved_at = new Date().toISOString()
      try {
        localStorage.setItem(KEY, JSON.stringify({ schema: SCHEMA, app: 'nexmi', saved_at, data }))
        setDevice((s) => (s.status === 'on' ? { status: 'on', savedAt: saved_at } : s))
      } catch {
        setDevice((s) => ({ ...s, error: '기기 저장 공간이 부족해 마지막 변경을 저장하지 못했어요. 오래된 기록을 지워주세요.' }))
      }
    }, 400)
    return () => clearTimeout(t)
  }, [data, device.status])

  const enableDevice = useCallback(() => {
    try {
      localStorage.setItem(CONSENT_KEY, JSON.stringify({ version: CONSENT_VERSION, at: new Date().toISOString() }))
      setDevice({ status: 'on' })
    } catch {
      setDevice({ status: 'unavailable' })
    }
  }, [])
  const disableDevice = useCallback(() => {
    try {
      localStorage.removeItem(KEY)
      localStorage.removeItem(CONSENT_KEY)
    } catch {
      /* ignore */
    }
    setDevice({ status: storageAvailable() ? 'off' : 'unavailable' })
  }, [])

  const resetMode = useCallback((mode: Mode | 'practice' | 'shares') => {
    const e = empty()
    setData((d) => ({ ...d, [mode]: e[mode] }))
  }, [])
  const resetAll = useCallback(() => setData(empty()), [])

  const value = useMemo(
    () => ({ data, update, device, enableDevice, disableDevice, resetMode, resetAll, dirtyActivity, setDirtyActivity }),
    [data, update, device, enableDevice, disableDevice, resetMode, resetAll, dirtyActivity],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const v = useContext(Ctx)
  if (!v) throw new Error('StoreProvider missing')
  return v
}

export const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36))
