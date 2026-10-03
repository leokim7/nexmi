import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CrossingTimeline, DisruptionChart } from '../../components/charts'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Empty, Metric, Notice, Segmented, Tabs } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { CAREER_LEVELS, CROSSING_LABELS, dateText, EVIDENCE_LABEL, fmt, MATURITY, METRICS, SCENARIOS, yearText } from '../../lib/labels'
import { TASK_YEARS, useStore } from '../../lib/store'
import type { Crossing, Scenario, WorkerDiagnosis } from '../../lib/types'

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
  return (
    <div className="wrap page">
      <div className="stack lg">
        <div className="row between top">
          <div className="stack sm">
            <div className="eyebrow">MY WORK, NEXT</div>
            <h1 className="h1">{occ?.name_ko}의 일, 언제 바뀔까요?</h1>
            <div className="chips">
              <span className="chip gray">{CAREER_LEVELS.find((l) => l.id === cur.input_snapshot.career_level)?.label}</span>
              <span className="chip gray">회사 AI: {MATURITY[cur.input_snapshot.ai_maturity]?.label}</span>
              <span className="chip line">{dateText(cur.created_at)} 계산</span>
            </div>
          </div>
          <Segmented label="AI가 퍼지는 속도" options={SCENARIOS} value={scenario} onChange={setScenario} />
        </div>

        <section className="result-hero" aria-live="polite">
          <Headline c={c} scenarioDesc={SCENARIOS.find((s) => s.id === scenario)!.desc} />
          <div className="stack sm">
            <span className="small strong" style={{ color: '#8fb3ff' }}>이렇게 바뀌어요</span>
            <ol className="crossings" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {(Object.keys(CROSSING_LABELS) as (keyof typeof CROSSING_LABELS)[]).map((k, i) => (
                <li className="crossing" key={k}>
                  <div>
                    <div className="strong">
                      {i + 1}. {CROSSING_LABELS[k].label}
                    </div>
                    <div className="small muted">{CROSSING_LABELS[k].desc}</div>
                  </div>
                  <b style={{ whiteSpace: 'nowrap' }}>{yearText(c[k])}</b>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <Notice>
          AI가 퍼지는 속도를 세 가지로 나눠 계산했어요. 위 버튼으로 바꿔보세요. 점수는 모두 0~100 사이의 <strong>비교용 점수</strong>이고, 일어날 확률이 아니에요.
        </Notice>

        <div>
          <Tabs
            label="결과 상세"
            value={tab}
            onChange={setTab}
            tabs={[
              { id: 'summary', label: '요약' },
              { id: 'tasks', label: '업무별로 보기' },
              { id: 'outlook', label: '해마다 보기' },
              { id: 'evidence', label: '어떻게 계산했나요' },
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

/** 큰 숫자 하나 + 한 문장. 종합 전환점이 없으면 실제로 값이 있는 ‘업무 일부를 맡기 시작’ 연도를 앞에 보여준다. */
function Headline({ c, scenarioDesc }: { c: Crossing; scenarioDesc: string }) {
  const ct = c.career_transformation
  const td = c.task_disruption
  let big: string, line: string, sub: string
  if (ct != null) {
    big = ct === 2026 ? '이미 지금' : `${ct}년쯤`
    line = '지금 방식으로 일하기 어려워져요'
    sub = '해고되는 날이 아니에요. 지금처럼 일하는 방식이 크게 바뀌는 때예요. 미리 업무를 바꿔두면 늦출 수 있어요.'
  } else if (td != null) {
    big = td === 2026 ? '이미 지금' : `${td}년쯤부터`
    line = td === 2026 ? 'AI가 내 업무 일부를 맡기 시작했어요' : 'AI가 내 업무 일부를 맡기 시작해요'
    sub = '다만 2040년까지 내 일 전체가 바뀌는 시점은 오지 않았어요. 2040년 이후는 계산하지 않았어요.'
  } else {
    big = '2040년까지'
    line = '큰 변화는 오지 않아요'
    sub = '계산한 기간(2026~2040년) 안의 이야기예요. 그 뒤는 계산하지 않았으니 ‘영원히 안전하다’는 뜻은 아니에요.'
  }
  return (
    <div className="stack">
      <span className="small strong" style={{ color: '#8fb3ff' }}>{scenarioDesc}</span>
      <p className="year num">{big}</p>
      <p className="h2" style={{ color: '#fff' }}>{line}</p>
      <p className="muted">{sub}</p>
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
          <h2 className="h3">속도별로 언제 바뀔까</h2>
          <CrossingTimeline crossings={d.result.crossings} />
        </div>
        <div className="card">
          <h2 className="h3">전체 변화 점수 (60점을 넘으면 큰 변화)</h2>
          <DisruptionChart paths={d.result.paths} threshold={cat.thresholds.career_transformation} highlight={scenario} />
        </div>
      </div>
      <div className="stack">
        <div className="row between">
          <h2 className="h3">지금({cat.base_year}년) 내 일의 상태</h2>
          <span className="small muted">0~100점 · 확률 아님</span>
        </div>
        <div className="grid-4">
          {METRICS.map((m) => (
            <Metric key={m.key} label={m.label} value={y0.metrics[m.key]} desc={m.desc} bar />
          ))}
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <h2 className="h3">AI가 먼저 맡게 될 내 업무</h2>
          <p className="small muted">AI가 대신할 가능성이 높고, 내가 시간을 많이 쓰는 순서</p>
          <ol className="stack sm" style={{ paddingLeft: 20 }}>
            {top.map((t) => (
              <li key={t.task_id}>
                <strong>{t.name_ko}</strong> <span className="muted small num">· 비중 {fmt(t.weight * 100)}% · AI가 대신할 가능성 {fmt(t.automation)}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card">
          <h2 className="h3">계속 사람이 해야 할 내 업무</h2>
          <p className="small muted">신뢰·책임·법·현장 때문에 사람이 필요한 순서</p>
          <ol className="stack sm" style={{ paddingLeft: 20 }}>
            {keep.map((t) => (
              <li key={t.task_id}>
                <strong>{t.name_ko}</strong> <span className="muted small num">· 사람이 필요한 정도 {fmt(t.human_moat)}</span>
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
        <span className="small muted">AI가 대신할 가능성 높은 순 · {SCENARIOS.find((s) => s.id === scenario)?.label}</span>
      </div>
      <p className="scroll-hint">← 표를 옆으로 밀어 더 볼 수 있어요 →</p>
      <div className="table-wrap">
        <table className="table" style={{ minWidth: 720 }}>
          <caption className="sr-only">{year}년 업무별 지수</caption>
          <thead>
            <tr>
              <th scope="col">업무</th>
              <th scope="col" className="num">내 비중</th>
              <th scope="col" className="num">AI가 할 수 있음</th>
              <th scope="col" className="num">AI가 대신할 가능성</th>
              <th scope="col" className="num">AI 도움 여지</th>
              <th scope="col" className="num">사람 필요</th>
              <th scope="col">근거 상태</th>
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
      <Notice>업무별 점수는 전문가 검토 전의 초기 추정값으로 계산했어요. 확률이 아니에요. 내가 0%로 둔 업무는 전체 결과에 들어가지 않아요.</Notice>
    </div>
  )
}

const OUTLOOK_METRICS = [
  { id: 'career_disruption_index', label: '전체 변화 점수' },
  { id: 'automation', label: 'AI가 대신할 가능성' },
  { id: 'augmentation', label: 'AI 도움 받을 여지' },
  { id: 'exposure', label: 'AI가 할 수 있는 정도' },
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
      <Notice>2026년을 출발점으로 계산했어요. 해가 바뀐다고 결과가 저절로 당겨지지 않아요. 계산 방법이 바뀌면 새 버전으로 알려드려요.</Notice>
    </div>
  )
}

function Evidence({ d }: { d: WorkerDiagnosis }) {
  const cat = useCatalog()
  return (
    <div className="stack lg">
      <div className="grid-2">
        <div className="card paper">
          <h2 className="h3">AI가 할 수 있는가</h2>
          <p className="muted">업무에 필요한 능력을 AI가 얼마나 갖췄는지, 그 일이 컴퓨터로 하는 일인지·정해진 방식이 있는지·결과를 확인하기 쉬운지, 그리고 회사가 AI를 얼마나 쓰는지를 함께 봐요.</p>
        </div>
        <div className="card paper">
          <h2 className="h3">그래도 사람이 해야 하는가</h2>
          <p className="muted">신뢰·책임·법·현장 때문에 사람이 필요한 일은 늦게 바뀌어요. 내가 AI를 잘 쓰고, 전문성·문제 정의·학습·결정권이 있을수록 변화의 충격이 줄어요.</p>
        </div>
      </div>
      <div className="card">
        <h2 className="h3">솔직하게 알려드려요</h2>
        <ul className="stack sm" style={{ paddingLeft: 20 }}>
          <li>700개 업무 점수와 계산식은 <strong>초기 추정값</strong>이에요. 아직 전문가 검토와 실제 데이터 검증 전이에요.</li>
          <li>아래 연구는 생각의 틀을 참고했을 뿐, 점수를 그대로 가져온 것은 아니에요.</li>
          <li>일자리 수요는 자료가 없어 계산에서 뺐어요.</li>
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
        <h2 className="h3">계산 조건 (전문가용)</h2>
        <p className="small muted">
          모델 {d.model_version} · 기준연도 {cat.base_year} · 범위 {cat.base_year}–{cat.horizon_year} · 전환 기준: 종합 재편 {cat.thresholds.career_transformation}, 자동화 압력 {cat.thresholds.task_disruption}, AI 증강 {cat.thresholds.assistance}
        </p>
        <p className="small muted">{d.result.interpretation}</p>
      </div>
    </div>
  )
}
