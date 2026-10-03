import type { CareerLevel, Scenario, Stage } from './types'

export const STAGES: { id: Stage; label: string; focus: string; minutes: string }[] = [
  { id: 'middle', label: '중학생', focus: '여러 활동을 해보며 관심 발견하기', minutes: '체험 1회 약 20분' },
  { id: 'high', label: '고등학생', focus: '과목·전공과 실제 업무 연결하기', minutes: '체험 1회 약 40분' },
  { id: 'university', label: '대학생', focus: '직무·포트폴리오 준비하기', minutes: '체험 1회 약 60분' },
  { id: 'jobseeker', label: '취업 준비생', focus: '직업 적합도와 직무 준비 방향 찾기 · 경력 전환 고민 포함', minutes: '체험 1회 약 60분' },
]
export const stageLabel = (s?: Stage) => STAGES.find((x) => x.id === s)?.label ?? '단계 미선택'

export const CAREER_LEVELS: { id: CareerLevel; label: string; desc: string }[] = [
  { id: 'junior', label: '주니어', desc: '정해진 업무를 수행하고 배우는 단계' },
  { id: 'mid', label: '미들', desc: '업무를 독립적으로 맡아 주도하는 단계' },
  { id: 'senior', label: '시니어', desc: '방향을 정하고 결과에 책임지는 단계' },
]

export const MATURITY: Record<string, { label: string; desc: string }> = {
  none: { label: '사용하지 않음', desc: '회사 업무에서 AI를 쓰지 않아요' },
  individual: { label: '개인별 사용', desc: '각자 알아서 AI 도구를 써요' },
  official: { label: '공식 허용', desc: '회사가 도구와 사용 규칙을 정했어요' },
  integrated: { label: '시스템 연결', desc: 'AI가 업무 시스템·데이터와 연결돼 있어요' },
  agent: { label: '에이전트 운영', desc: 'AI가 여러 단계 업무를 직접 실행해요' },
}

export const PERSONAL: { key: string; label: string; question: string }[] = [
  { key: 'ai_fluency', label: 'AI 활용·검증', question: 'AI로 업무를 수행하고 결과를 검증할 수 있나요?' },
  { key: 'domain_expertise', label: '분야 전문지식', question: '예외와 복잡한 문제를 해결할 전문지식이 있나요?' },
  { key: 'problem_definition', label: '문제 정의', question: '무엇을 해결할지 직접 정의하나요?' },
  { key: 'learning_velocity', label: '학습·적용', question: '새 도구를 배우고 실제 업무에 적용하나요?' },
  { key: 'cross_functional', label: '다른 직무 수행', question: '다른 직무 영역의 결과물을 완성할 수 있나요?' },
  { key: 'decision_authority', label: '최종 의사결정', question: '결과와 우선순위의 최종 결정권이 있나요?' },
]
export const BEHAVIOR_SCALE = [
  { v: 0, label: '경험 없음' },
  { v: 25, label: '도움받아 수행' },
  { v: 50, label: '일부 독립 수행' },
  { v: 75, label: '반복 수행' },
  { v: 100, label: '복잡한 상황까지 책임' },
]

export const INTEREST_SCALE = [
  { v: 0, label: '전혀 아니에요' },
  { v: 25, label: '별로예요' },
  { v: 50, label: '보통이에요' },
  { v: 75, label: '해보고 싶어요' },
  { v: 100, label: '아주 해보고 싶어요' },
]
export const REACTION_SCALE = [
  { v: 0, label: '전혀' },
  { v: 25, label: '조금' },
  { v: 50, label: '보통' },
  { v: 75, label: '꽤' },
  { v: 100, label: '매우' },
]

export const CAPABILITY_LABELS: Record<string, string> = {
  language: '읽고 쓰고 말하기',
  problem_solving: '문제 해결',
  creativity: '새로운 아이디어',
  critical_thinking: '비판적으로 따져보기',
  knowledge: '지식 찾아 활용하기',
  social: '사람과 소통·협력',
  vision: '이미지·시각 정보 읽기',
  manipulation: '손으로 정교하게 다루기',
  robotics: '장비·기계 다루기',
  agency: '스스로 계획하고 실행하기',
}

export const FAMILY_LABELS: Record<string, string> = {
  strategy: '전략·기획',
  routine: '사무·운영',
  social: '사람·서비스',
  regulated: '전문·규제',
  analytic: '분석·연구',
  agent: 'IT·개발',
  creative: '창작·마케팅',
  clinical: '보건·의료',
  physical: '현장·기술',
}
export const familyLabel = (f: string) => FAMILY_LABELS[f] ?? f

export const SCENARIOS: { id: Scenario; label: string; desc: string }[] = [
  { id: 'slow', label: '느린 변화', desc: 'AI 능력·도입이 천천히 늘어나는 가정' },
  { id: 'base', label: '기준 가정', desc: '현재 추세가 이어지는 가정' },
  { id: 'fast', label: '빠른 변화', desc: 'AI 능력·도입이 빠르게 늘어나는 가정' },
]

export const METRICS: { key: string; label: string; desc: string }[] = [
  { key: 'exposure', label: 'AI 노출', desc: 'AI가 업무 요구능력을 얼마나 충족하는지' },
  { key: 'automation', label: '자동화 압력', desc: '실제 도입·장벽을 반영한 대체 압력' },
  { key: 'augmentation', label: 'AI 증강', desc: 'AI로 내 업무가 강화될 여지' },
  { key: 'compression', label: '역할 압축', desc: '다른 사람의 일이 AI로 흡수되는 정도' },
  { key: 'expansion', label: '역할 확장', desc: 'AI로 다른 영역까지 넓힐 여지' },
  { key: 'human_moat', label: '인간 역할', desc: '신뢰·책임·규제·현장으로 남는 역할' },
  { key: 'task_migration', label: '업무 이동', desc: '내 역할을 옮겨갈 수 있는 개인 역량' },
  { key: 'market_demand', label: '시장 수요', desc: '현재 자료 없음 — 계산에서 제외' },
]

export const CROSSING_LABELS = {
  assistance: { label: 'AI 보조 본격화', desc: 'AI 증강 지수 60 도달' },
  task_disruption: { label: '업무 재편 시작', desc: '자동화 압력 30 도달' },
  career_transformation: { label: '현재 업무 방식 전환점', desc: '종합 재편 지수 60 도달' },
} as const

export const EVIDENCE_LABEL: Record<string, string> = {
  synthetic_prior: '설계값 · 검토 전',
  author_designed_seed: '설계값 · 검토 전',
  author_seed_pending_review: '설계값 · 검토 대기',
  not_verified: '공식 진입요건 미확인',
  unreviewed: '전문가 검토 전',
}

export function yearText(v: number | null | undefined, horizon = 2040) {
  if (v == null) return `${horizon}년까지 기준 미도달`
  if (v === 2026) return '2026년 (기준 시점에 이미 도달)'
  return `${v}년`
}

export function minutesText(m: number) {
  if (m < 60) return `${m}분`
  const h = Math.floor(m / 60)
  const r = m % 60
  return r ? `${h}시간 ${r}분` : `${h}시간`
}

export const fmt = (n: number | null | undefined, digits = 1) => (n == null ? '자료 없음' : Number(n).toFixed(digits).replace(/\.0+$/, ''))
export const dateText = (iso: string) => new Date(iso).toLocaleString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
