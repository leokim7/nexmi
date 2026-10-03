import { ApiError } from './api'
import type { Crossing, ExplorerInput, Mode, Scenario, Stage, WorkerInput } from './types'

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new ApiError('네트워크에 연결할 수 없어요. 잠시 후 다시 시도해주세요.', 0, 'NETWORK')
  }
  if (res.status === 204) return undefined as T
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const e = body?.error
    throw new ApiError(e?.message ?? '요청을 처리하지 못했어요.', res.status, e?.code ?? 'HTTP_ERROR', e?.field_errors ?? {}, e?.request_id)
  }
  return body as T
}

export interface WorkerCard {
  occupation_id: string
  occupation_name: string
  crossings: Record<Scenario, Crossing>
  automation_now: number
  human_moat_now: number
  quick: boolean
  model_version: string
}
export interface ExplorerCard {
  stage: Stage
  status: string
  top: { occupation_id: string; name_ko: string; exploration_index: number }[]
  model_version: string
}
export type Share = { id: string; mode: 'worker'; payload: WorkerCard; created_at?: string } | { id: string; mode: 'explorer'; payload: ExplorerCard; created_at?: string }
export type CreatedShare = Share & { path: string; delete_key: string; expires_at: string }

export type Side = 'ai' | 'human'
export const SIDES: { id: Side; label: string; emoji: string; quip: string }[] = [
  { id: 'ai', label: 'AI편', emoji: '🤖', quip: 'AI야, 야근은 네가 해줘. 나는 퇴근할게.' },
  { id: 'human', label: '인간편', emoji: '🙋', quip: '그래도 마지막 사인은 사람이 한다.' },
]
export interface Post {
  id: number
  side: Side
  body: string
  nickname: string | null
  occupation_id: string | null
  occupation_name: string | null
  likes: number
  liked: boolean
  mine: boolean
  created_at: string
}
export interface Board { items: Post[]; side_counts: Record<Side, number>; total: number; next_before: number | null }
export interface BoardQuery { side?: Side | ''; occupation_id?: string; tag?: 'job' | 'none' | ''; sort?: 'new' | 'top'; before?: number; limit?: number; q?: string }

export const community = {
  createShare: (mode: Mode, input: WorkerInput | ExplorerInput, quick = false) =>
    call<CreatedShare>('/api/shares', { method: 'POST', body: JSON.stringify({ mode, input, quick }) }),
  getShare: (id: string) => call<Share>(`/api/shares/${encodeURIComponent(id)}`),
  deleteShare: (id: string, key: string) => call<void>(`/api/shares/${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-delete-key': key } }),
  posts: (q: BoardQuery) => {
    const p = new URLSearchParams()
    Object.entries(q).forEach(([k, v]) => v !== undefined && v !== '' && v !== 0 && p.set(k, String(v)))
    return call<Board>(`/api/posts?${p}`)
  },
  post: (id: number) => call<Post>(`/api/posts/${id}`),
  addPost: (p: { side: Side; body: string; nickname?: string; occupation_id?: string }) => call<Post>('/api/posts', { method: 'POST', body: JSON.stringify(p) }),
  like: (id: number) => call<{ id: number; likes: number; liked: boolean }>(`/api/posts/${id}/like`, { method: 'POST', body: '{}' }),
  report: (id: number) => call<{ id: number; reported: boolean }>(`/api/posts/${id}/report`, { method: 'POST', body: '{}' }),
  deletePost: (id: number) => call<void>(`/api/posts/${id}`, { method: 'DELETE' }),
}

/** 공유 카드 문장: 결과 화면 헤드라인과 같은 규칙. */
export function workerHeadline(c: Crossing): { big: string; line: string } {
  if (c.career_transformation != null) return { big: c.career_transformation === 2026 ? '이미 지금' : `${c.career_transformation}년쯤`, line: '지금 방식으로 일하기 어려워져요' }
  if (c.task_disruption != null) return { big: c.task_disruption === 2026 ? '이미 지금' : `${c.task_disruption}년쯤부터`, line: 'AI가 내 업무 일부를 맡기 시작해요' }
  return { big: '2040년까지', line: '큰 변화는 오지 않아요' }
}
