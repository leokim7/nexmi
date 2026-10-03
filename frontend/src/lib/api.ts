import type { Catalog, ExplorerDiagnosis, ExplorerInput, WorkerDiagnosis, WorkerInput } from './types'

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public fieldErrors: Record<string, string> = {},
    public requestId?: string,
  ) {
    super(message)
  }
  get isNetwork() {
    return this.status === 0
  }
}

const TIMEOUT_MS = 30_000

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  let res: Response
  try {
    res = await fetch(path, { ...init, signal: ctrl.signal, headers: { 'Content-Type': 'application/json', ...init?.headers } })
  } catch {
    throw new ApiError('네트워크에 연결할 수 없어요. 입력은 유지했어요. 다시 시도해주세요.', 0, 'NETWORK')
  } finally {
    clearTimeout(timer)
  }
  let body: any = null
  try {
    body = await res.json()
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok) {
    const e = body?.error
    throw new ApiError(e?.message ?? '요청을 처리하지 못했어요. 다시 시도해주세요.', res.status, e?.code ?? 'HTTP_ERROR', e?.field_errors ?? {}, e?.request_id)
  }
  return body as T
}

export const api = {
  catalog: () => request<Catalog>('/api/catalog'),
  worker: (input: WorkerInput) => request<WorkerDiagnosis>('/api/worker/diagnoses', { method: 'POST', body: JSON.stringify(input) }),
  explorer: (input: ExplorerInput) => request<ExplorerDiagnosis>('/api/explorer/diagnoses', { method: 'POST', body: JSON.stringify(input) }),
}
