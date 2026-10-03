import { useCallback } from 'react'
import { api } from './api'
import { HISTORY_LIMIT, useStore, type ExplorerDraft, type Submission } from './store'
import type { ExplorerInput } from './types'
import { useRunner } from './worker'

export const knownInterestCount = (d: ExplorerDraft) => Object.values(d.interests).filter((v) => v !== null && v !== undefined).length
export const answeredInterestCount = (d: ExplorerDraft) => Object.keys(d.interests).length

/** 완료 + 두 반응이 모두 있는 체험만 엔진에 전달한다. 같은 체험은 최신 반응 1개(Submission 이 최신 상태를 유지). */
export function activityResults(subs: Record<string, Submission>) {
  return Object.values(subs)
    .filter((s) => s.completions.length > 0)
    .map((s) => {
      const last = s.completions[s.completions.length - 1]
      return { activity_id: s.activity_id, completed: true, enjoyment: last.enjoyment, repeat_interest: last.repeat_interest }
    })
}

export function buildExplorerInput(d: ExplorerDraft, subs: Record<string, Submission>): ExplorerInput | null {
  if (!d.stage) return null
  return {
    stage: d.stage,
    interests: { ...d.interests },
    skills: { ...d.skills },
    weekly_minutes: d.weekly_minutes ?? 60,
    experiences: d.experiences,
    favorite_occupations: d.favorites,
    activity_results: activityResults(subs),
    ...(d.values?.length ? { values: d.values } : {}),
  }
}

/** 계산 → 현재 결과·이력 갱신. 실패하면 입력은 그대로 둔다. */
export function useExplorerCalc() {
  const { data, update } = useStore()
  const runner = useRunner(api.explorer)
  const calc = useCallback(async () => {
    const input = buildExplorerInput(data.explorer.draft, data.explorer.submissions)
    if (!input) return null
    const r = await runner.run(input)
    if (r) update((d) => ({ ...d, explorer: { ...d.explorer, current: r, history: [r, ...d.explorer.history].slice(0, HISTORY_LIMIT) } }))
    return r
  }, [data.explorer.draft, data.explorer.submissions, runner.run, update])
  return { ...runner, calc }
}

export const WEEKLY_OPTIONS = [30, 60, 120, 180, 300]
