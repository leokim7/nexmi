import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, ApiError } from './api'
import type { Activity, Catalog, Occupation, Task } from './types'

interface CatalogIndex extends Catalog {
  occupationById: Map<string, Occupation>
  tasksByOccupation: Map<string, Task[]>
  activitiesByOccupation: Map<string, Activity[]>
  activityById: Map<string, Activity>
  taskById: Map<string, Task>
}

type State = { status: 'loading' } | { status: 'error'; error: ApiError } | { status: 'ready'; catalog: CatalogIndex }

const Ctx = createContext<{ state: State; retry: () => void } | null>(null)

function index(c: Catalog): CatalogIndex {
  const group = <T,>(rows: T[], key: (r: T) => string) => {
    const m = new Map<string, T[]>()
    rows.forEach((r) => m.set(key(r), [...(m.get(key(r)) ?? []), r]))
    return m
  }
  return {
    ...c,
    occupationById: new Map(c.occupations.map((o) => [o.occupation_id, o])),
    tasksByOccupation: group(c.tasks, (t) => t.occupation_id),
    activitiesByOccupation: group(c.activities, (a) => a.occupation_id),
    activityById: new Map(c.activities.map((a) => [a.activity_id, a])),
    taskById: new Map(c.tasks.map((t) => [t.task_id, t])),
  }
}

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const load = useCallback(() => {
    setState({ status: 'loading' })
    api.catalog().then(
      (c) => setState({ status: 'ready', catalog: index(c) }),
      (e: ApiError) => setState({ status: 'error', error: e }),
    )
  }, [])
  useEffect(load, [load])
  const value = useMemo(() => ({ state, retry: load }), [state, load])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useCatalogState() {
  const v = useContext(Ctx)
  if (!v) throw new Error('CatalogProvider missing')
  return v
}

/** Only call inside <CatalogGate>, which guarantees the catalog is loaded. */
export function useCatalog(): CatalogIndex {
  const { state } = useCatalogState()
  if (state.status !== 'ready') throw new Error('catalog not ready')
  return state.catalog
}
