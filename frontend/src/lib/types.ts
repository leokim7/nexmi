export type Stage = 'middle' | 'high' | 'university' | 'jobseeker'
export type CareerLevel = 'junior' | 'mid' | 'senior'
export type Scenario = 'slow' | 'base' | 'fast'
export type Mode = 'worker' | 'explorer'

export interface Occupation {
  occupation_id: string
  name_ko: string
  family: string
  classification_status: string
  evidence_status: string
  interest_tags: string[]
  illustrative_subjects: string[]
  exploratory_paths: string[]
  entry_requirement_status: string
  path_note: string
  project_idea: string
}
export interface Task {
  task_id: string
  occupation_id: string
  name_ko: string
  task_weight: number
  evidence_status: string
  review_status: string
}
export interface DefaultProfile {
  occupation_id: string
  career_level: CareerLevel
  weights: Record<string, number>
  status: string
}
export interface StageVariant { minutes: number; scope: string }
export interface Activity {
  activity_id: string
  occupation_id: string
  task_id: string
  title: string
  interest_tags: string[]
  mode: string
  steps: string[]
  deliverable: string
  stage_variants: Record<Stage, StageVariant>
  rubric: string[]
  reflection: string[]
  restrictions: string
  evidence_status: string
}
export interface Source { source_id: string; url: string; purpose: string; checked_date: string; evidence_type: string }
export interface Catalog {
  package_version: string
  worker_model_version: string
  explorer_model_version: string
  base_year: number
  horizon_year: number
  thresholds: Record<string, number>
  adoption_levels: string[]
  axes: Record<string, string>
  capabilities: string[]
  occupations: Occupation[]
  tasks: Task[]
  profiles: DefaultProfile[]
  activities: Activity[]
  sources: Source[]
}

export interface Diagnosis<R, I> {
  diagnosis_id: string
  created_at: string
  mode: Mode
  model_version: string
  stored: boolean
  input_snapshot: I
  result: R
}

// ---- worker ----
export interface WorkerInput {
  occupation_id: string
  career_level: CareerLevel
  task_weights: Record<string, number>
  ai_maturity: string
  ai_fluency: number
  domain_expertise: number
  problem_definition: number
  learning_velocity: number
  cross_functional: number
  decision_authority: number
  market_demand?: number | null
  company_size?: string
}
export interface TaskResult {
  task_id: string
  name_ko: string
  weight: number
  exposure: number
  automation: number
  augmentation: number
  human_moat: number
  compression: number
  expansion: number
  evidence_status: string
}
export interface YearResult {
  model_version: string
  year: number
  scenario: Scenario
  metrics: Record<string, number | null>
  tasks: TaskResult[]
  data_quality: string
  market_demand_status: string
}
export type Crossing = { assistance: number | null; task_disruption: number | null; career_transformation: number | null }
export interface WorkerResult {
  profile: WorkerInput
  crossings: Record<Scenario, Crossing>
  paths: Record<Scenario, YearResult[]>
  interpretation: string
}
/** quick: 3문항 빠른 진단 — 업무 비중·나머지 역할은 평균값으로 계산함 (화면에서 표시) */
export type WorkerDiagnosis = Diagnosis<WorkerResult, WorkerInput> & { quick?: boolean }

// ---- explorer ----
export interface ActivityResultInput { activity_id: string; completed: boolean; enjoyment: number | null; repeat_interest: number | null }
export interface ExplorerInput {
  stage: Stage
  interests: Record<string, number | null>
  skills: Record<string, number | null>
  weekly_minutes: number
  experiences: string[]
  favorite_occupations: string[]
  activity_results: ActivityResultInput[]
  values?: string[]
}
export interface SkillGap { capability: string; status: 'unknown' | 'practice_candidate' | 'self_report_meets_seed'; seed_requirement: number; self_report: number | null }
export interface Recommendation {
  occupation_id: string
  name_ko: string
  family: string
  exploration_index: number
  interest_index: number
  observed_interest: number | null
  evidence_count: number
  readiness_index: number | null
  readiness_note: string
  why: string[]
  skill_gaps: SkillGap[]
  education_path: { subjects: string[]; options: string[]; status: string; note: string }
  ai_change: { status: string; message: string; task_ids: string[] }
  next_activity: Activity & { selected_variant: StageVariant; sessions: number }
  plan: string[]
}
export interface ExplorerResult {
  model_version: string
  stage: Stage
  status: 'needs_more_exploration' | 'exploration_ready'
  recommendations: Recommendation[]
  favorite_exploration: string[]
  uncertainties: string[]
  next_questions?: string[]
  next_action?: string
  selection_policy?: string
  interest_response_coverage?: number
  aptitude_probability: null
  career_deadline: null
}
export type ExplorerDiagnosis = Diagnosis<ExplorerResult, ExplorerInput>
