/* 리포트·인쇄 (SC-21, W-18). 계산 당시의 입력 스냅샷으로 만든다. 성찰 원문은 기본 제외. */
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { BEHAVIOR_SCALE, CAREER_LEVELS, CROSSING_LABELS, dateText, fmt, MATURITY, METRICS, minutesText, PERSONAL, SCENARIOS, stageLabel, yearText } from '../../lib/labels'
import { useStore } from '../../lib/store'
import { WORKER_PLAN } from '../worker/WorkerPlan'

export default function Report() {
  const { mode } = useParams()
  useTitle('리포트')
  if (mode !== 'worker' && mode !== 'explorer') return <Navigate to="/me" replace />
  return (
    <div className="wrap page narrow">
      <div className="row between no-print" style={{ marginBottom: 24 }}>
        <Link to="/me" className="link small">← 내 기록</Link>
        <button className="btn primary sm" onClick={() => window.print()}>
          <Icon name="print" /> 인쇄 · PDF 저장
        </button>
      </div>
      {mode === 'worker' ? <WorkerReport /> : <ExplorerReport />}
    </div>
  )
}

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <header className="stack sm">
      <div className="eyebrow">NEXMI REPORT</div>
      <h1 className="h1">{title}</h1>
      <p className="small muted">{sub}</p>
    </header>
  )
}

function WorkerReport() {
  const cat = useCatalog()
  const { data } = useStore()
  const d = data.worker.current
  if (!d) return <Empty title="리포트로 만들 분석 결과가 없어요" action={<Link to="/worker" className="btn primary">분석하기</Link>} />
  const i = d.input_snapshot
  const y0 = d.result.paths.base[0]
  const tasks = [...y0.tasks].filter((t) => t.weight > 0).sort((a, b) => b.weight - a.weight)
  return (
    <article className="report-sheet">
      <Head title={`${cat.occupationById.get(i.occupation_id)?.name_ko} · 직업 미래 리포트`} sub={`${dateText(d.created_at)} 계산 · 모델 ${d.model_version} · 기준연도 ${cat.base_year} · 진단 ID ${d.diagnosis_id.slice(0, 8)}`} />
      <section className="stack sm">
        <h2 className="h3">현재 업무 방식의 전환점</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">가정</th>
                {Object.values(CROSSING_LABELS).map((c) => (
                  <th key={c.label} scope="col">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.id}>
                  <th scope="row">{s.label}</th>
                  {(Object.keys(CROSSING_LABELS) as (keyof typeof CROSSING_LABELS)[]).map((k) => (
                    <td key={k} className="num">{yearText(d.result.crossings[s.id][k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">연도 단위 조건부 시나리오예요. 해고일·직업 소멸일이 아니며, 세 가정은 통계적 신뢰구간이 아니에요. 미도달은 2040년까지 기준에 닿지 않았다는 뜻이에요.</p>
      </section>
      <section className="stack sm">
        <h2 className="h3">입력한 내용</h2>
        <p className="small">
          역할 {CAREER_LEVELS.find((l) => l.id === i.career_level)?.label} · AI 도입 {MATURITY[i.ai_maturity]?.label} ·{' '}
          {PERSONAL.map((p) => `${p.label} ${BEHAVIOR_SCALE.find((b) => b.v === (i as any)[p.key])?.label}`).join(' · ')}
        </p>
      </section>
      <section className="stack sm">
        <h2 className="h3">기준연도 지표</h2>
        <div className="grid-4">
          {METRICS.map((m) => (
            <div key={m.key} className="metric">
              <span className="k">{m.label}</span>
              <span className={`v ${y0.metrics[m.key] == null ? 'none' : ''}`} style={{ fontSize: 22 }}>{fmt(y0.metrics[m.key])}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="stack sm">
        <h2 className="h3">업무별 변화 (내 비중 순)</h2>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th scope="col">업무</th>
                <th scope="col" className="num">비중</th>
                <th scope="col" className="num">자동화 압력</th>
                <th scope="col" className="num">AI 증강</th>
                <th scope="col" className="num">인간 역할</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.task_id}>
                  <th scope="row">{t.name_ko}</th>
                  <td className="num">{fmt(t.weight * 100)}%</td>
                  <td className="num">{fmt(t.automation)}</td>
                  <td className="num">{fmt(t.augmentation)}</td>
                  <td className="num">{fmt(t.human_moat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="stack sm">
        <h2 className="h3">실행 계획</h2>
        <ul style={{ paddingLeft: 20 }}>
          {WORKER_PLAN.map((p) => (
            <li key={p.id}>
              {data.worker.planDone[p.id] ? '☑' : '☐'} {p.title}
            </li>
          ))}
        </ul>
      </section>
      <section className="stack sm">
        <h2 className="h3">검토 상태와 한계</h2>
        <p className="small muted">700개 업무 점수와 모든 계수는 전문가 검토 전 설계값이에요. 시장 수요는 자료가 없어 제외했어요. 확률·백분위·동일 직군 평균은 제공하지 않아요.</p>
      </section>
    </article>
  )
}

function ExplorerReport() {
  const cat = useCatalog()
  const { data } = useStore()
  const [withReflection, setWithReflection] = useState(false)
  const d = data.explorer.current
  if (!d) return <Empty title="리포트로 만들 탐색 결과가 없어요" action={<Link to="/explore" className="btn primary">탐색하기</Link>} />
  const done = Object.values(data.explorer.submissions).filter((s) => s.completions.length > 0)
  const recs = d.result.recommendations
  return (
    <article className="report-sheet">
      <label className="row no-print small" style={{ flexWrap: 'nowrap' }}>
        <input type="checkbox" checked={withReflection} onChange={(e) => setWithReflection(e.target.checked)} style={{ width: 20, height: 20 }} />
        체험 성찰 원문 포함하기 (기본 제외)
      </label>
      <Head title={`${stageLabel(d.input_snapshot.stage)} · 진로 탐색 리포트`} sub={`${dateText(d.created_at)} 계산 · 모델 ${d.model_version} · 진단 ID ${d.diagnosis_id.slice(0, 8)}`} />
      <section className="stack sm">
        <h2 className="h3">탐색 후보</h2>
        {d.result.status !== 'exploration_ready' ? (
          <p>관심 응답이 4개 미만이라 후보를 계산하지 않았어요.</p>
        ) : recs.length === 0 ? (
          <p>응답과 맞는 후보가 없었어요.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th scope="col">직군</th>
                  <th scope="col" className="num">탐색 적합지수</th>
                  <th scope="col">추천 이유</th>
                  <th scope="col">체험 근거</th>
                  <th scope="col">준비 상태</th>
                </tr>
              </thead>
              <tbody>
                {recs.map((r) => (
                  <tr key={r.occupation_id}>
                    <th scope="row">{r.name_ko}</th>
                    <td className="num">{fmt(r.exploration_index)}</td>
                    <td className="small">{r.why.join(', ')}</td>
                    <td className="small">{r.evidence_count}개</td>
                    <td className="small">{r.readiness_index == null ? '미확인 역량 있음' : fmt(r.readiness_index)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small muted">탐색 적합지수는 관심과 체험 반응으로 만든 탐색용 지수예요. 적성 확률이 아니며, 준비 수준은 순위에 반영하지 않아요.</p>
      </section>
      <section className="stack sm">
        <h2 className="h3">완료한 체험</h2>
        {done.length === 0 ? (
          <p className="muted small">아직 완료한 체험이 없어요.</p>
        ) : (
          <ul className="stack sm" style={{ listStyle: 'none' }}>
            {done.map((s) => {
              const last = s.completions[s.completions.length - 1]
              return (
                <li key={s.activity_id}>
                  <strong>{cat.activityById.get(s.activity_id)?.title}</strong>{' '}
                  <span className="small muted">· 즐거움 {last.enjoyment} · 다시 해보고 싶음 {last.repeat_interest} · {s.completions.length}회</span>
                  {withReflection && s.reflection && <p className="small">성찰: {s.reflection}</p>}
                </li>
              )
            })}
          </ul>
        )}
      </section>
      <section className="stack sm">
        <h2 className="h3">학습 경로 (공식 진입요건 미확인)</h2>
        <ul style={{ paddingLeft: 20 }}>
          {recs.map((r) => (
            <li key={r.occupation_id} className="small">
              <strong>{r.name_ko}</strong> · 과목 {r.education_path.subjects.join(', ')} · 경로 {r.education_path.options.join(', ')}
            </li>
          ))}
        </ul>
      </section>
      <section className="stack sm">
        <h2 className="h3">다음 체험 계획</h2>
        <ul style={{ paddingLeft: 20 }}>
          {recs.slice(0, 3).map((r) => (
            <li key={r.occupation_id} className="small">
              {r.next_activity.title} · {minutesText(r.next_activity.selected_variant.minutes)}
            </li>
          ))}
        </ul>
      </section>
      <section className="stack sm">
        <h2 className="h3">검토 상태와 한계</h2>
        <ul style={{ paddingLeft: 20 }}>
          {d.result.uncertainties.map((u) => (
            <li key={u} className="small muted">{u}</li>
          ))}
        </ul>
      </section>
    </article>
  )
}
