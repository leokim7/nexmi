/* 3문항 빠른 진단: ① 직업(홈에서 고름) ② 회사의 AI 사용 ③ 나의 AI 활용.
   업무 비중·나머지 역할 5개는 평균값(직군 기본 분포, 50점)으로 계산하고, 결과에 그렇게 표시한다. */
import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { useTitle } from '../../components/Layout'
import { Notice, Progress } from '../../components/ui'
import { useCatalog } from '../../lib/catalog'
import { MATURITY, PERSONAL } from '../../lib/labels'
import { compactWorker, HISTORY_LIMIT, useStore } from '../../lib/store'
import type { WorkerInput } from '../../lib/types'
import { defaultWeights, runWorker, useRunner } from '../../lib/worker'

const FLUENCY: { v: number; label: string; d: string }[] = [
  { v: 0, label: '거의 안 써요', d: '업무에 AI를 써본 적이 없어요' },
  { v: 25, label: '가끔 물어봐요', d: '누가 알려주면 따라 써요' },
  { v: 50, label: '일부 업무에 써요', d: '혼자서 몇 가지 일에 써요' },
  { v: 75, label: '자주 써요', d: '반복 업무에 꾸준히 써요' },
  { v: 100, label: '맡기고 검토해요', d: '복잡한 일도 AI로 하고 결과를 책임져요' },
]

export default function Quick() {
  const { occ } = useParams()
  const cat = useCatalog()
  const nav = useNavigate()
  const { update } = useStore()
  const [step, setStep] = useState<1 | 2>(1)
  const [maturity, setMaturity] = useState<string>()
  const runner = useRunner(runWorker)
  const o = occ ? cat.occupationById.get(occ) : undefined
  useTitle(o ? `${o.name_ko} · 빠른 진단` : '빠른 진단')
  if (!o) return <Navigate to="/" replace />

  const finish = async (fluency: number) => {
    const input: WorkerInput = {
      occupation_id: o.occupation_id,
      career_level: 'mid',
      task_weights: defaultWeights(cat, o.occupation_id, 'mid')!,
      ai_maturity: maturity!,
      ai_fluency: fluency,
      domain_expertise: 50,
      problem_definition: 50,
      learning_velocity: 50,
      cross_functional: 50,
      decision_authority: 50,
    }
    const r = await runner.run(input)
    if (!r) return
    const c = { ...compactWorker(r), quick: true }
    // 정밀 분석으로 이어갈 때 직접 답한 것만 미리 채운다 (평균값은 채우지 않음).
    update((d) => ({
      ...d,
      worker: {
        ...d.worker,
        current: c,
        whatif: undefined,
        history: [c, ...d.worker.history].slice(0, HISTORY_LIMIT),
        draft: { occupation_id: o.occupation_id, ai_maturity: maturity, personal: { ai_fluency: fluency } },
      },
    }))
    nav('/worker/result')
  }

  return (
    <div className="wrap page form">
      <div className="stack lg">
        <div className="stack sm">
          <div className="row between">
            <span className="small strong num">질문 {step + 1} / 3</span>
            <span className="chip">{o.name_ko}</span>
          </div>
          <Progress value={step} max={3} label="빠른 진단 진행률" />
        </div>

        {step === 1 ? (
          <>
            <h1 className="h1">회사에서 AI를 얼마나 쓰나요?</h1>
            <div className="options" role="group" aria-label="회사의 AI 사용">
              {Object.entries(MATURITY).map(([k, m]) => (
                <button key={k} type="button" className="opt" aria-pressed={maturity === k} onClick={() => (setMaturity(k), setStep(2))}>
                  <span className="t">{m.label}</span>
                  <span className="d">{m.desc}</span>
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <h1 className="h1">나는 일할 때 AI를 얼마나 쓰나요?</h1>
            <div className="options" role="group" aria-label="나의 AI 활용">
              {FLUENCY.map((f) => (
                <button key={f.v} type="button" className="opt" disabled={runner.loading} onClick={() => finish(f.v)}>
                  <span className="t">{f.label}</span>
                  <span className="d">{f.d}</span>
                </button>
              ))}
            </div>
            {runner.loading && <Notice kind="info" role="status">계산하고 있어요…</Notice>}
            {runner.error && <Notice kind="error" role="alert">{runner.error.message}</Notice>}
          </>
        )}

        <div className="btn-row" style={{ justifyContent: 'space-between' }}>
          {step === 2 ? (
            <button className="btn" onClick={() => setStep(1)}>
              <Icon name="back" /> 이전
            </button>
          ) : (
            <Link to="/" className="btn">
              <Icon name="back" /> 직업 다시 고르기
            </Link>
          )}
        </div>
        <p className="small muted">
          나머지(업무 시간 배분, {PERSONAL.slice(1).map((p) => p.label).join('·')})는 평균값으로 계산해요. 결과를 본 뒤 내 상황에 맞게 더 정확히 볼 수 있어요.
        </p>
      </div>
    </div>
  )
}

