import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CrossingTimeline, DisruptionChart } from '../../components/charts'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Metric, Notice, Segmented, Tabs } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { CAREER_LEVELS, CROSSING_LABELS, dateText, EVIDENCE_LABEL, fmt, MATURITY, METRICS, SCENARIOS, yearText } from '../../lib/labels'
import { TASK_YEARS, useStore } from '../../lib/store'
import type { Scenario, WorkerDiagnosis } from '../../lib/types'

type Tab = 'summary' | 'tasks' | 'outlook' | 'evidence'

export default function WorkerResult() {
  useTitle('나의 직업 예상 종료일')
  const { data } = useStore()
  const cur = data.worker.current
  const [scenario, setScenario] = useState<Scenario>('base')
  const [tab, setTab] = useState<Tab>('summary')
  const cat = useCatalog()

  if (!cur)
    return (
      <div className="wrap page narrow">
        <Empty title="아직 분석 결과가 없어요" action={<Link to="/worker/start/1" className="btn primary">내 업무 분석 시작</Link>}>
          현재 탭에서 계산한 결과만 보여드려요. 새로고침하면 사라지니, 남기려면 기기 저장을 켜주세요.
        </Empty>
      </div>
    )

  const occ = cat.occupationById.get(cur.input_snapshot.occupation_id)
  const c = cur.result.crossings[scenario]
  const ct = c.career_transformation

  return (
    <div className="wrap page">
      <div className="stack lg">
        <div className="row between top">
          <div className="stack sm">
            <div className="eyebrow">CAREER TRANSFORMATION</div>
            <h1 className="h1">{occ?.name_ko}의 예상 전환점</h1>
            <div className="chips">
              <span className="chip gray">{CAREER_LEVELS.find((l) => l.id === cur.input_snapshot.career_level)?.label}</span>
              <span className="chip gray">AI {MATURITY[cur.input_snapshot.ai_maturity]?.label}</span>
              <span className="chip line">모델 {cur.model_version}</span>
              <span className="chip line">{dateText(cur.created_at)} 계산</span>
            </div>
          </div>
          <Segmented label="가정 선택" options={SCENARIOS} value={scenario} onChange={setScenario} />
        </div>

        <section className="result-hero" aria-live="polite">
          <div className="stack">
            <span className="small strong" style={{ color: '#8fb3ff' }}>{SCENARIOS.find((s) => s.id === scenario)?.label} · 현재 업무 방식의 전환점</span>
            <p className={`year num ${ct == null ? 'none' : ''}`}>{yearText(ct)}</p>
            <p className="muted">
              {ct == null
                ? '현재 모델·가정·계산 범위(2026–2040)에서는 기준에 닿지 않았어요. 영원히 안전하다는 뜻은 아니에요.'
                : `초기 모델의 종합 재편 지수가 ${cat.thresholds.career_transformation}에 처음 닿는 해예요. 해고일이나 직업이 사라지는 날이 아니에요.`}
            </p>
          </div>
          <div className="crossings">
            {(Object.keys(CROSSING_LABELS) as (keyof typeof CROSSING_LABELS)[]).map((k) => (
              <div className="crossing" key={k}>
                <div>
                  <div className="strong">{CROSSING_LABELS[k].label}</div>
                  <div className="small muted">{CROSSING_LABELS[k].desc}</div>
                </div>
                <b>{c[k] == null ? '미도달' : `${c[k]}년`}</b>
              </div>
            ))}
          </div>
        </section>

        <Notice>세 가정은 통계적 신뢰구간이 아니라 AI 능력·도입 속도에 대한 서로 다른 시나리오예요. 모든 수치는 확률이 아닌 지수(0–100)예요.</Notice>

        <div>
          <Tabs
            label="결과 상세"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'summary', label: '요약' },
              { id: 'tasks', label: '업무별 변화' },
              { id: 'outlook', label: '연도별 전망' },
              { id: 'evidence', label: '계산 근거' },
            ]}
          />
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === 'summary' && <Summary d={cur} scenario={scenario} />}
            {tab === 'tasks' && <TasksTab d={cur} scenario={scenario} />}
            {tab === 'outlook' && <Outlook d={cur} />}
            {tab === 'evidence' && <Evidence d={cur} />}
          </div>
        </div>

        <section className="card soft no-print">
          <h2 className="h3">다음으로 할 수 있는 일</h2>
          <div className="btn-row stretch">
            <Link to="/worker/whatif" className="btn primary">
              <Icon name="scale" /> 업무 구성을 바꿔보기
            </Link>
            <Link to="/worker/plan" className="btn">
              <Icon name="flag" /> 실행 계획 만들기
            </Link>
            <Link to="/report/worker" className="btn">
              <Icon name="print" /> 리포트·인쇄
            </Link>
            {data.worker.history.length > 1 && (
              <Link to="/me/history?mode=worker" className="btn ghost">
                이전 결과와 비교
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function Summary({ d, scenario }: { d: WorkerDiagnosis; scenario: Scenario }) {
  const cat = useCatalog()
  const y0 = d.result.paths[scenario][0]
  const top = [...y0.tasks].filter((t) => t.weight > 0).sort((a, b) => b.automation * b.weight - a.automation * a.weight).slice(0, 3)
  const keep = [...y0.tasks].filter((t) => t.weight > 0).sort((a, b) => b.human_moat - a.human_moat).slice(0, 3)
  return (
    <div className="stack lg">
      <div className="grid-2">
        <div className="card">
          <h2 className="h3">세 가지 전환점</h2>
          <CrossingTimeline crossings={d.result.crossings} />
        </div>
        <div className="card">
          <h2 className="h3">종합 재편 지수 추이</h2>
          <DisruptionChart paths={d.result.paths} threshold={cat.thresholds.career_transformation} highlight={scenario} />
        </div>
      </div>
      <div className="stack">
        <div className="row between">
          <h2 className="h3">기준연도 {cat.base_year} 지표</h2>
          <span className="small muted">지수 0–100 · 확률 아님</span>
        </div>
        <div className="grid-4">
          {METRICS.map((m) => (
            <Metric key={m.key} label={m.label} value={y0.metrics[m.key]} desc={m.desc} bar />
          ))}
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2 className="h3">먼저 바뀔 가능성이 큰 업무</h2>
          <p className="small muted">자동화 압력 × 내 시간 비중이 큰 순서</p>
          <ol className="stack sm" style={{ paddingLeft: 20 }}>
            {top.map((t) => (
              <li key={t.task_id}>
                <strong>{t.name_ko}</strong> <span className="muted small num">· 비중 {fmt(t.weight * 100)}% · 자동화 압력 {fmt(t.automation)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2 className="h3">사람의 역할이 크게 남는 업무</h2>
          <p className="small muted">신뢰·책임·규제·현장 역할이 큰 순서</p>
          <ol className="stack sm" style={{ paddingLeft: 20 }}>
            {keep.map((t) => (
              <li key={t.task_id}>
                <strong>{t.name_ko}</strong> <span className="muted small num">· 인간 역할 {fmt(t.human_moat)}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function TasksTab({ d, scenario }: { d: WorkerDiagnosis; scenario: Scenario }) {
  const [year, setYear] = useState(TASK_YEARS[0])
  const row = d.result.paths[scenario].find((r) => r.year === year)!
  const tasks = [...row.tasks].sort((a, b) => b.automation - a.automation)
  return (
    <div className="stack">
      <div className="row between">
        <Segmented label="연도" options={TASK_YEARS.map((y) => ({ id: String(y), label: `${y}` }))} value={String(year)} onChange={(v) => setYear(Number(v))} />
        <span className="small muted">자동화 압력 높은 순 · {SCENARIOS.find((s) => s.id === scenario)?.label}</span>
      </div>
      <p className="scroll-hint">← 표를 옆으로 밀어 더 볼 수 있어요 →</p>
      <div className="table-wrap">
        <table className="table" style={{ minWidth: 720 }}>
          <caption className="sr-only">{year}년 업무별 지수</caption>
          <thead>
            <tr>
              <th scope="col">업무</th>
              <th scope="col" className="num">내 비중</th>
              <th scope="col" className="num">AI 노출</th>
              <th scope="col" className="num">자동화 압력</th>
              <th scope="col" className="num">AI 증강</th>
              <th scope="col" className="num">인간 역할</th>
              <th scope="col">근거</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.task_id} style={t.weight === 0 ? { color: 'var(--muted)' } : undefined}>
                <th scope="row" style={{ fontWeight: 700 }}>{t.name_ko}</th>
                <td className="num">{fmt(t.weight * 100)}%</td>
                <td className="num">{fmt(t.exposure)}</td>
                <td className="num">
                  <strong>{fmt(t.automation)}</strong>
                </td>
                <td className="num">{fmt(t.augmentation)}</td>
                <td className="num">{fmt(t.human_moat)}</td>
                <td>
                  <span className="chip gray" style={{ whiteSpace: 'nowrap' }}>{EVIDENCE_LABEL[t.evidence_status] ?? t.evidence_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notice>업무별 수치는 직군 템플릿의 초기 설계값으로 계산한 지수예요. 관측된 확률이 아니며, 내 비중이 0%인 업무는 종합 지표에 영향을 주지 않아요.</Notice>
    </div>
  )
}

const OUTLOOK_METRICS = [
  { id: 'career_disruption_index', label: '종합 재편' },
  { id: 'automation', label: '자동화 압력' },
  { id: 'augmentation', label: 'AI 증강' },
  { id: 'exposure', label: 'AI 노출' },
]
function Outlook({ d }: { d: WorkerDiagnosis }) {
  const [metric, setMetric] = useState('career_disruption_index')
  const years = [2026, 2029, 2031, 2036, 2040]
  return (
    <div className="stack">
      <Segmented label="지표 선택" options={OUTLOOK_METRICS} value={metric} onChange={setMetric} />
      <div className="table-wrap">
        <table className="table">
          <caption className="sr-only">연도별 가정별 {OUTLOOK_METRICS.find((m) => m.id === metric)?.label}</caption>
          <thead>
            <tr>
              <th scope="col">연도</th>
              {SCENARIOS.map((s) => (
                <th key={s.id} scope="col" className="num">{s.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {years.map((y) => (
              <tr key={y}>
                <th scope="row" className="num">{y}{y === 2026 && <span className="muted small"> 기준</span>}</th>
                {SCENARIOS.map((s) => (
                  <td key={s.id} className="num">{fmt(d.result.paths[s.id].find((r) => r.year === y)?.metrics[metric] as number)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Notice>기준연도는 2026으로 고정돼 있어요. 달력이 바뀌어도 자동으로 연도를 옮기거나 전환점을 앞당기지 않아요. 새 모델은 검토·발행 후 반영돼요.</Notice>
    </div>
  )
}

function Evidence({ d }: { d: WorkerDiagnosis }) {
  const cat = useCatalog()
  return (
    <div className="stack lg">
      <div className="grid-2">
        <div className="card paper">
          <h2 className="h3">기술과 도입</h2>
          <p className="muted">업무가 요구하는 능력 대비 AI 능력(언어·문제해결·창의 등 10가지), 업무의 디지털성·표준화·검증 가능성, 회사의 AI 도입 단계를 곱해 자동화 압력을 계산해요.</p>
        </div>
        <div className="card paper">
          <h2 className="h3">남는 역할</h2>
          <p className="muted">신뢰·책임·규제·현장 중 가장 큰 장벽이 자동화를 늦추고, 나의 AI 활용과 업무 이동 역량(전문지식·문제정의·학습·확장·결정권)이 압력을 일부 완화해요.</p>
        </div>
      </div>
      <div className="card">
        <h2 className="h3">근거 상태</h2>
        <ul className="stack sm" style={{ paddingLeft: 20 }}>
          <li>700개 업무 점수와 모든 계수는 <strong>저자 설계값</strong>이에요. 전문가 검토·관측자료 검증 전이에요.</li>
          <li>아래 연구는 개념 틀을 참고한 것이고, 이 서비스의 업무 점수를 제공하지 않아요.</li>
          <li>시장 수요는 자료가 없어 계산에서 제외했어요.</li>
        </ul>
        <ul className="stack sm" style={{ listStyle: 'none' }}>
          {cat.sources.map((s) => (
            <li key={s.source_id} className="small">
              <a className="link" href={s.url} target="_blank" rel="noreferrer noopener">
                {s.purpose}
              </a>{' '}
              <span className="muted">· 확인일 {s.checked_date}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <h2 className="h3">이 결과의 계산 조건</h2>
        <p className="small muted">
          모델 {d.model_version} · 기준연도 {cat.base_year} · 범위 {cat.base_year}–{cat.horizon_year} · 전환 기준: 종합 재편 {cat.thresholds.career_transformation}, 자동화 압력 {cat.thresholds.task_disruption}, AI 증강 {cat.thresholds.assistance}
        </p>
        <p className="small muted">{d.result.interpretation}</p>
      </div>
    </div>
  )
}
