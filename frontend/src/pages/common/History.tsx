/* 변화 비교 (SC-20, W-16): 같은 모드의 두 스냅샷을 비교. 모델 버전이 다르면 조건 차이를 명시한다. */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTitle } from '../../components/Layout'
import { Empty, Notice, PageHead, Segmented } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { BEHAVIOR_SCALE, dateText, fmt, MATURITY, PERSONAL, SCENARIOS, stageLabel, yearText } from '../../lib/labels'
import { useStore } from '../../lib/store'
import type { ExplorerDiagnosis, Mode, WorkerDiagnosis } from '../../lib/types'

export default function History() {
  useTitle('변화 비교')
  const [sp, setSp] = useSearchParams()
  const mode: Mode = sp.get('mode') === 'explorer' ? 'explorer' : 'worker'
  const { data } = useStore()
  const list = mode === 'worker' ? data.worker.history : data.explorer.history
  const [a, setA] = useState(1)
  const [b, setB] = useState(0)

  return (
    <div className="wrap page">
      <PageHead eyebrow="HISTORY" title="변화 비교" lead="이전 분석과 지금 분석의 입력·결과가 어떻게 다른지 봐요. 현재 탭 또는 기기에 저장된 최근 10개까지 보관돼요.">
        <Segmented
          label="모드"
          value={mode}
          onChange={(m) => setSp({ mode: m }, { replace: true })}
          options={[
            { id: 'worker', label: '직업 미래' },
            { id: 'explorer', label: '진로 탐색' },
          ]}
        />
      </PageHead>
      {list.length < 2 ? (
        <Empty title={list.length === 0 ? '아직 분석 기록이 없어요' : '비교하려면 분석이 두 번 이상 필요해요'} action={<Link to={mode === 'worker' ? '/worker' : '/explore'} className="btn primary">{list.length === 0 ? '분석하기' : '다시 분석하기'}</Link>}>
          실제로 바뀐 입력(업무 비중·역할·관심·체험)이 있을 때 다시 분석해보세요.
        </Empty>
      ) : (
        <div className="stack lg">
          <div className="grid-2">
            {[
              ['이전', a, setA],
              ['현재', b, setB],
            ].map(([label, v, set]) => (
              <div className="field" key={label as string}>
                <label htmlFor={`h-${label}`}>{label as string} 기록</label>
                <select id={`h-${label}`} value={v as number} onChange={(e) => (set as (n: number) => void)(Number(e.target.value))}>
                  {list.map((d, i) => (
                    <option key={d.diagnosis_id} value={i}>
                      {dateText(d.created_at)} · {d.model_version}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          {list[a].model_version !== list[b].model_version && (
            <Notice kind="info">두 기록의 모델 버전이 달라요({list[a].model_version} → {list[b].model_version}). 결과 차이에는 입력 변화와 모델 변화가 섞여 있어요.</Notice>
          )}
          {a === b ? (
            <Notice>서로 다른 두 기록을 골라주세요.</Notice>
          ) : mode === 'worker' ? (
            <WorkerDiff a={list[a] as WorkerDiagnosis} b={list[b] as WorkerDiagnosis} />
          ) : (
            <ExplorerDiff a={list[a] as ExplorerDiagnosis} b={list[b] as ExplorerDiagnosis} />
          )}
        </div>
      )}
    </div>
  )
}

function Table({ rows }: { rows: [string, React.ReactNode, React.ReactNode][] }) {
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">이전</th>
            <th scope="col">현재</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([k, x, y]) => (
            <tr key={k}>
              <th scope="row">{k}</th>
              <td>{x}</td>
              <td>{x === y ? <span className="muted">{y}</span> : <strong>{y}</strong>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function WorkerDiff({ a, b }: { a: WorkerDiagnosis; b: WorkerDiagnosis }) {
  const cat = useCatalog()
  const ia = a.input_snapshot
  const ib = b.input_snapshot
  const sameOcc = ia.occupation_id === ib.occupation_id
  const changedTasks = sameOcc ? Object.keys(ia.task_weights).filter((k) => Math.abs((ia.task_weights[k] ?? 0) - (ib.task_weights[k] ?? 0)) >= 0.005).length : null
  const inputs: [string, React.ReactNode, React.ReactNode][] = [
    ['직군', cat.occupationById.get(ia.occupation_id)?.name_ko, cat.occupationById.get(ib.occupation_id)?.name_ko],
    ['AI 도입', MATURITY[ia.ai_maturity]?.label, MATURITY[ib.ai_maturity]?.label],
    ...PERSONAL.map((p) => [p.label, BEHAVIOR_SCALE.find((s) => s.v === (ia as any)[p.key])?.label, BEHAVIOR_SCALE.find((s) => s.v === (ib as any)[p.key])?.label] as [string, string, string]),
    ['업무 비중', '—', changedTasks == null ? '직군이 달라 비교 불가' : changedTasks === 0 ? '—' : `${changedTasks}개 업무 변경`],
  ]
  const results: [string, React.ReactNode, React.ReactNode][] = [
    ...SCENARIOS.map((s) => [`전환점 · ${s.label}`, yearText(a.result.crossings[s.id].career_transformation), yearText(b.result.crossings[s.id].career_transformation)] as [string, string, string]),
    ['자동화 압력 (2026)', fmt(a.result.paths.base[0].metrics.automation), fmt(b.result.paths.base[0].metrics.automation)],
    ['종합 재편 지수 (2026)', fmt(a.result.paths.base[0].metrics.career_disruption_index), fmt(b.result.paths.base[0].metrics.career_disruption_index)],
  ]
  return (
    <div className="grid-2">
      <section className="stack">
        <h2 className="h3">바뀐 입력</h2>
        <Table rows={inputs} />
      </section>
      <section className="stack">
        <h2 className="h3">결과</h2>
        <Table rows={results} />
        {!sameOcc && <Notice>다른 직군끼리의 비교예요. 개인 변화로 해석하지 마세요.</Notice>}
      </section>
    </div>
  )
}

function ExplorerDiff({ a, b }: { a: ExplorerDiagnosis; b: ExplorerDiagnosis }) {
  const cat = useCatalog()
  const ia = a.input_snapshot
  const ib = b.input_snapshot
  const iv = (v: number | null | undefined) => (v === undefined ? '미응답' : v === null ? '모름' : String(v))
  const inputs: [string, React.ReactNode, React.ReactNode][] = [
    ['학습 단계', stageLabel(ia.stage), stageLabel(ib.stage)],
    ...Object.entries(cat.axes).map(([k, l]) => [l, iv(ia.interests[k]), iv(ib.interests[k])] as [string, string, string]),
    ['반영된 체험', `${ia.activity_results.length}개`, `${ib.activity_results.length}개`],
  ]
  const names = (d: ExplorerDiagnosis) => (d.result.status === 'exploration_ready' ? d.result.recommendations.map((r) => `${r.name_ko} ${fmt(r.exploration_index)}`).join(', ') || '없음' : '정보 부족')
  return (
    <div className="grid-2">
      <section className="stack">
        <h2 className="h3">바뀐 입력</h2>
        <Table rows={inputs} />
      </section>
      <section className="stack">
        <h2 className="h3">후보</h2>
        <Table rows={[['후보 · 탐색 지수', names(a), names(b)]]} />
        <Notice>체험 기록이 늘어도 체험 반응(즐거움·다시 해보고 싶음)만 점수에 반영돼요. 과제 수가 많다고 지수가 오르지 않아요.</Notice>
      </section>
    </div>
  )
}
