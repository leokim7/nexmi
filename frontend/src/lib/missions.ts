/* 이번 주 작은 과제 — 검토된 고정 카탈로그(RETENTION_STRATEGY.md 예시)에서만 고른다.
   LLM 생성 과제나 실제 위험 작업은 넣지 않는다. 과제 완료는 점수에 가산되지 않는다. */
import type { Mode, Stage } from './types'

export interface Mission {
  id: string
  mode: Mode
  title: string
  why: string
  minutes: number
  stages?: Stage[]
  kind: 'record' | 'experiment' | 'review' | 'compare' | 'reflect'
}

export const MISSIONS: Mission[] = [
  { id: 'w-time-log', mode: 'worker', kind: 'record', minutes: 20, title: '반복 업무 하나의 전후 소요시간 기록하기', why: '실제 업무 비중을 확인해야 다음 분석의 입력이 정확해져요.' },
  { id: 'w-approval', mode: 'worker', kind: 'review', minutes: 30, title: 'AI가 만든 자료 초안의 승인 기준 만들기', why: '사람이 판단할 부분을 정해두면 검토 시간이 줄고 책임이 분명해져요.' },
  { id: 'w-error3', mode: 'worker', kind: 'review', minutes: 30, title: 'AI 출력에서 오류 3개 찾아 기록하기', why: '검증 역량은 자동화 이후에도 남는 역할이에요.' },
  { id: 'w-experiment', mode: 'worker', kind: 'experiment', minutes: 45, title: '반복 업무 하나에 AI를 적용하고 검토 시간까지 기록하기', why: '절약 시간은 검토·재작업 시간을 함께 기록해야 실제 효과를 알 수 있어요.' },
  { id: 'w-problem', mode: 'worker', kind: 'experiment', minutes: 30, title: '고객(또는 동료)의 문제를 한 문장으로 정의해보기', why: '무엇을 해결할지 정의하는 일은 AI가 대신하기 어려운 역할이에요.' },
  { id: 'w-realloc', mode: 'worker', kind: 'reflect', minutes: 15, title: '절약한 시간을 어디에 쓸지 정하기', why: '판단·고객·검증 업무로 시간을 옮기는 것이 대응의 핵심이에요.' },

  { id: 'e-other-family', mode: 'explorer', kind: 'compare', minutes: 30, title: '지금 후보와 다른 영역의 직군 체험 하나 해보기', why: '서로 다른 활동을 해봐야 관심이 진짜인지 확인할 수 있어요.' },
  { id: 'e-second-task', mode: 'explorer', kind: 'experiment', minutes: 40, title: '관심 직군의 두 번째 업무 체험하기', why: '한 직군 안에서도 업무마다 느낌이 달라요.' },
  { id: 'e-improve', mode: 'explorer', kind: 'reflect', minutes: 30, title: '지난 체험 결과물을 고쳐보고 전후 비교하기', why: '다시 해보고 싶은지가 관심을 확인하는 좋은 단서예요.', stages: ['high', 'university', 'jobseeker'] },
  { id: 'e-questions', mode: 'explorer', kind: 'record', minutes: 20, title: '관심 전공·경로에서 확인할 질문 3개 적기', why: '교육 경로는 공식 요건을 직접 확인해야 해요.', stages: ['high', 'university', 'jobseeker'] },
  { id: 'e-read-tasks', mode: 'explorer', kind: 'record', minutes: 15, title: '관심 직업의 실제 업무 14개 읽고 궁금한 점 적기', why: '직업 이름보다 실제로 하는 일이 중요해요.' },
  { id: 'e-portfolio', mode: 'explorer', kind: 'experiment', minutes: 60, title: '체험 결과물을 포트폴리오 한 장으로 정리하기', why: '결과물과 검증 과정을 남기면 직무 준비 근거가 돼요.', stages: ['university', 'jobseeker'] },
]

/** 규칙: 미수행 우선 → 시간 적합(주당 시간 이하) → 짧은 것부터. */
export function pickMissions(mode: Mode, opts: { stage?: Stage; weeklyMinutes?: number; done: string[] }, n = 3): Mission[] {
  const pool = MISSIONS.filter((m) => m.mode === mode && (!m.stages || !opts.stage || m.stages.includes(opts.stage)))
  const budget = opts.weeklyMinutes ?? Infinity
  return [...pool]
    .sort((a, b) => Number(opts.done.includes(a.id)) - Number(opts.done.includes(b.id)) || Number(a.minutes > budget) - Number(b.minutes > budget) || a.minutes - b.minutes)
    .slice(0, n)
}
