/* 정확한 엔진 출력이 있는 값만 그린다. 색은 한 가지 블루 계열 + 선 모양으로 가정을 구분한다. */
import type { Crossing, Scenario, YearResult } from '../lib/types'
import { CROSSING_LABELS, SCENARIOS } from '../lib/labels'

const STYLE: Record<Scenario, { color: string; dash?: string; width: number }> = {
  slow: { color: '#8fb3ff', dash: '6 5', width: 2.5 },
  base: { color: '#1464ff', width: 3 },
  fast: { color: '#071d49', dash: '2 4', width: 2.5 },
}
const Y0 = 2026
const Y1 = 2040

export function ScenarioLegend() {
  return (
    <div className="legend" aria-hidden="true">
      {SCENARIOS.map((s) => (
        <span key={s.id}>
          <svg width="22" height="6">
            <line x1="1" y1="3" x2="21" y2="3" stroke={STYLE[s.id].color} strokeWidth="3" strokeDasharray={STYLE[s.id].dash} strokeLinecap="round" />
          </svg>
          {s.label}
        </span>
      ))}
    </div>
  )
}

/** 종합 재편 지수(0–100) 연도별 추이와 기준선 60. */
export function DisruptionChart({ paths, threshold, highlight }: { paths: Record<Scenario, YearResult[]>; threshold: number; highlight: Scenario }) {
  const W = 520
  const H = 250
  const m = { l: 34, r: 12, t: 16, b: 30 }
  const x = (y: number) => m.l + ((y - Y0) / (Y1 - Y0)) * (W - m.l - m.r)
  const y = (v: number) => m.t + (1 - v / 100) * (H - m.t - m.b)
  const years = [2026, 2029, 2031, 2036, 2040]
  return (
    <figure className="stack sm" style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="dc-title">
        <title id="dc-title">가정별 종합 재편 지수 추이, 기준선 {threshold}</title>
        {[0, 20, 40, 60, 80, 100].map((v) => (
          <g key={v}>
            <line x1={m.l} x2={W - m.r} y1={y(v)} y2={y(v)} stroke="#e7ebf0" />
            <text x={m.l - 8} y={y(v) + 4} textAnchor="end">{v}</text>
          </g>
        ))}
        {years.map((yr) => (
          <text key={yr} x={x(yr)} y={H - 8} textAnchor="middle">{yr}</text>
        ))}
        <line x1={m.l} x2={W - m.r} y1={y(threshold)} y2={y(threshold)} stroke="#0b1220" strokeDasharray="3 4" strokeWidth={1.2} />
        <text x={W - m.r} y={y(threshold) - 6} textAnchor="end" style={{ fontWeight: 800, fill: '#0b1220' }}>전환 기준 {threshold}</text>
        {(['slow', 'fast', 'base'] as Scenario[])
          .sort((a) => (a === highlight ? 1 : -1))
          .map((s) => (
            <polyline
              key={s}
              fill="none"
              stroke={STYLE[s].color}
              strokeWidth={s === highlight ? STYLE[s].width + 1 : STYLE[s].width}
              strokeDasharray={STYLE[s].dash}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={s === highlight ? 1 : 0.55}
              points={paths[s].map((r) => `${x(r.year)},${y(Number(r.metrics.career_disruption_index))}`).join(' ')}
            />
          ))}
      </svg>
      <ScenarioLegend />
    </figure>
  )
}

/** 세 가정 × 세 전환점 타임라인. null 은 '2040까지 미도달'로 오른쪽 끝 바깥에 표시. */
export function CrossingTimeline({ crossings }: { crossings: Record<Scenario, Crossing> }) {
  const W = 520
  const rowH = 52
  const m = { l: 84, r: 70, t: 22, b: 30 }
  const H = m.t + rowH * 3 + m.b
  const x = (y: number) => m.l + ((y - Y0) / (Y1 - Y0)) * (W - m.l - m.r)
  const keys = ['assistance', 'task_disruption', 'career_transformation'] as const
  const marker = (k: (typeof keys)[number], cx: number, cy: number, color: string) =>
    k === 'assistance' ? (
      <circle cx={cx} cy={cy} r={6} fill="#fff" stroke={color} strokeWidth={2.4} />
    ) : k === 'task_disruption' ? (
      <rect x={cx - 6} y={cy - 6} width={12} height={12} rx={2} fill="#fff" stroke={color} strokeWidth={2.4} />
    ) : (
      <circle cx={cx} cy={cy} r={8.5} fill={color} />
    )
  return (
    <figure className="stack sm" style={{ margin: 0 }}>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-labelledby="ct-title">
        <title id="ct-title">가정별 세 전환점 연도</title>
        {[2026, 2031, 2036, 2040].map((yr) => (
          <g key={yr}>
            <line x1={x(yr)} x2={x(yr)} y1={m.t - 8} y2={H - m.b} stroke="#e7ebf0" />
            <text x={x(yr)} y={H - 8} textAnchor="middle">{yr}</text>
          </g>
        ))}
        <line x1={W - m.r + 44} x2={W - m.r + 44} y1={m.t - 8} y2={H - m.b} stroke="#e7ebf0" strokeDasharray="2 3" />
        <text x={W - m.r + 44} y={H - 8} textAnchor="middle">미도달</text>
        {SCENARIOS.map((s, i) => {
          const cy = m.t + rowH * i + rowH / 2
          const c = crossings[s.id]
          return (
            <g key={s.id}>
              <text x={0} y={cy + 4} style={{ fontWeight: 800, fill: '#0b1220' }}>{s.label}</text>
              <line x1={m.l} x2={W - m.r} y1={cy} y2={cy} stroke="#e7ebf0" strokeWidth={6} strokeLinecap="round" />
              {keys.map((k, j) => {
                const v = c[k]
                // markers share a row; same-year overlaps are nudged up/down
                const dup = keys.slice(0, j).filter((kk) => c[kk] === v).length
                const cx = v == null ? W - m.r + 44 : x(v)
                const cyy = cy + (dup ? (dup === 1 ? -11 : 11) : 0)
                return <g key={k}>{marker(k, cx, cyy, STYLE[s.id].color === '#8fb3ff' ? '#5b8ef5' : STYLE[s.id].color)}</g>
              })}
            </g>
          )
        })}
      </svg>
      <div className="legend" aria-hidden="true">
        <span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="#fff" stroke="#1464ff" strokeWidth="2" /></svg>{CROSSING_LABELS.assistance.label}</span>
        <span><svg width="14" height="14"><rect x="2" y="2" width="10" height="10" rx="2" fill="#fff" stroke="#1464ff" strokeWidth="2" /></svg>{CROSSING_LABELS.task_disruption.label}</span>
        <span><svg width="14" height="14"><circle cx="7" cy="7" r="6" fill="#1464ff" /></svg>{CROSSING_LABELS.career_transformation.label}</span>
      </div>
    </figure>
  )
}
