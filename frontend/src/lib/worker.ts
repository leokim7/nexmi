import { useCallback, useEffect, useRef, useState } from 'react'
import { api, ApiError } from './api'
import type { CareerLevel, WorkerDiagnosis, WorkerInput } from './types'
import type { WorkerDraft } from './store'
import { PERSONAL } from './labels'

type Cat = { profiles: { occupation_id: string; career_level: CareerLevel; weights: Record<string, number> }[] }

export function defaultWeights(cat: Cat, occ?: string, level?: CareerLevel): Record<string, number> | undefined {
  if (!occ || !level) return undefined
  return cat.profiles.find((p) => p.occupation_id === occ && p.career_level === level)?.weights
}

/** 0–1 비중을 합 100 정수 %로 (최대 나머지 방식). 사용자가 편집을 시작할 때만 쓴다. */
export function toPercentInts(fr: Record<string, number>): Record<string, number> {
  const entries = Object.entries(fr).map(([k, v]) => ({ k, raw: v * 100, base: Math.floor(v * 100) }))
  let rest = 100 - entries.reduce((a, e) => a + e.base, 0)
  entries.sort((a, b) => b.raw - b.base - (a.raw - a.base))
  for (const e of entries) {
    if (rest <= 0) break
    e.base += 1
    rest -= 1
  }
  return Object.fromEntries(entries.map((e) => [e.k, e.base]))
}

export const sumOf = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0)

/** 화면 표시용 % (편집 전이면 기본 분포를 소수 첫째 자리로) */
export function displayWeights(cat: Cat, d: WorkerDraft): Record<string, number> {
  if (d.weights) return d.weights
  const f = defaultWeights(cat, d.occupation_id, d.career_level) ?? {}
  return Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v * 100]))
}

export function missingWorker(d: WorkerDraft): string[] {
  const m: string[] = []
  if (!d.occupation_id) m.push('직군')
  if (!d.career_level) m.push('역할 수준')
  if (d.weights && Math.abs(sumOf(d.weights) - 100) > 1e-9) m.push('업무 비중 합계 100%')
  if (!d.ai_maturity) m.push('회사의 AI 도입 단계')
  PERSONAL.forEach((p) => d.personal[p.key] === undefined && m.push(p.label))
  return m
}

export function buildWorkerInput(cat: Cat, d: WorkerDraft): WorkerInput | null {
  if (missingWorker(d).length) return null
  const task_weights = d.weights
    ? Object.fromEntries(Object.entries(d.weights).map(([k, v]) => [k, v / 100]))
    : defaultWeights(cat, d.occupation_id, d.career_level)!
  const input: WorkerInput = {
    occupation_id: d.occupation_id!,
    career_level: d.career_level!,
    task_weights,
    ai_maturity: d.ai_maturity!,
    ...(Object.fromEntries(PERSONAL.map((p) => [p.key, d.personal[p.key]!])) as Pick<WorkerInput, 'ai_fluency'>),
  } as WorkerInput
  if (d.company_size) input.company_size = d.company_size
  return input
}

export function draftFromInput(input: WorkerInput, cat: Cat): WorkerDraft {
  const def = defaultWeights(cat, input.occupation_id, input.career_level)
  const isDefault = def && Object.keys(def).length === Object.keys(input.task_weights).length && Object.entries(def).every(([k, v]) => input.task_weights[k] === v)
  return {
    occupation_id: input.occupation_id,
    career_level: input.career_level,
    weights: isDefault ? undefined : Object.fromEntries(Object.entries(input.task_weights).map(([k, v]) => [k, Math.round(v * 100 * 1e6) / 1e6])),
    ai_maturity: input.ai_maturity,
    personal: Object.fromEntries(PERSONAL.map((p) => [p.key, (input as any)[p.key]])),
    company_size: input.company_size,
  }
}

/** 계산 호출: 중복 요청 차단, 15초 지연 안내, 실패 시 입력 보존. */
export function useRunner<I, R>(call: (i: I) => Promise<R>) {
  const [state, setState] = useState<{ loading: boolean; slow: boolean; error: ApiError | null }>({ loading: false, slow: false, error: null })
  const busy = useRef(false)
  const slowTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(slowTimer.current), [])
  const run = useCallback(
    async (input: I): Promise<R | null> => {
      if (busy.current) return null
      busy.current = true
      setState({ loading: true, slow: false, error: null })
      slowTimer.current = setTimeout(() => setState((s) => ({ ...s, slow: true })), 15_000)
      try {
        const r = await call(input)
        setState({ loading: false, slow: false, error: null })
        return r
      } catch (e) {
        setState({ loading: false, slow: false, error: e instanceof ApiError ? e : new ApiError('알 수 없는 오류가 생겼어요.', 0, 'UNKNOWN') })
        return null
      } finally {
        clearTimeout(slowTimer.current)
        busy.current = false
      }
    },
    [call],
  )
  return { ...state, run }
}

export const runWorker = (i: WorkerInput): Promise<WorkerDiagnosis> => api.worker(i)

export const WORKER_EXAMPLE: WorkerInput = {
  occupation_id: 'O15',
  career_level: 'mid',
  task_weights: {},
  ai_maturity: 'integrated',
  ai_fluency: 75,
  domain_expertise: 75,
  problem_definition: 75,
  learning_velocity: 75,
  cross_functional: 50,
  decision_authority: 50,
}
