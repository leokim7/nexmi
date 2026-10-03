# 개발 인수·검증 계획

## 1. 제품 구현에 바로 사용할 계약

직군 선택 → 14개 업무 비중 배분 → 조직 AI 수준 → 행동 중심 개인 문항 → calculate → simulate. 비중 입력 합계 100%를 확인한다. 서버에서는 task ID 소속 직군, 0–1 범위, 유한한 수, 합계 1을 재확인한다. 질문에 없는 파라미터를 LLM이 추측하여 넣지 않는다.

API 초안: POST /diagnoses (profile와 model_version), GET /diagnoses/:id, POST /diagnoses/:id/scenarios (원본과 변경 프로필 각각 계산). 모든 결과에 model_version, created_at, 입력 스냅샷, data_quality를 저장한다. 현재 패키지에는 HTTP 서버와 인증은 포함되지 않는다.

What-if는 task_weights 및 개인/조직 입력을 바꿔 동일 엔진을 재실행한다. 비중을 바꾸면 합계 1을 재확인한다. 두 결과 차이는 조건부 시뮬레이션이며 교육 수강의 실제 효과를 보장하지 않는다.

화면: 현재 8개 지표 → 업무별 근거 → 세 시나리오 연도 또는 미도달 → 사용자가 바꾼 가정 비교. 미입력 수요는 '자료 없음', 검토 전 점수는 '초기 모델', 결과 날짜는 '가정별 전환 시점'으로 표시한다. 표본 데이터 없이 동일 직군 평균·백분위를 만들지 않는다.

## 2. 데이터 정규화 확장

현재 SQLite는 FK를 가진 core 열 + JSON payload 구조. 운영 DB에서는 occupations, tasks, task_parameters, task_weights, questions, question_parameter_mappings, sources, parameter_evidence, model_versions, diagnosis_profiles, diagnosis_results로 분리한다.

task_parameters: task_id, parameter_name, value, low, high, scale, source_id(nullable), evidence_type, rationale, reviewer, reviewed_at, version. 근거없는 값은 evidence_type=synthetic_prior로 유지한다.

공식 직업명 검색 확장: 한국직업분류 최신판 기준으로 code/version/source/매핑 사유 저장. 다의적인 직업명은 자동 확정하지 않고 업무 확인 질문을 추가한다. 현재 classification_code=null이다.

## 3. 실증 보정

1) 7개 직군 업무 전문가 각 최소 2명에게 이름·누락·비중·능력요건·장벽을 독립 평가받는다. 이것은 제안된 수집 설계이며 이미 실시한 작업이 아니다.
2) 디지털 업무는 실제 산출물과 성공 기준으로 AI 수행률, 인간 검토시간, 실패 비용을 측정한다. 현장직은 문서 보조와 물리 작업을 따로 평가한다.
3) 사용자의 2–4주 업무 로그에서 자기보고 비중을 검토한다. 역할 수준 임시 분포를 교체한다.
4) Adoption은 허용 여부, 시스템 연결, 실제 운영 범위, 경제성, 조직정책으로 확장한다. 법적 허용을 미래 능력 증가로 우회하지 않는다.
5) 수요는 한국 직군별 채용·임금·종사자 데이터의 시점과 모집단을 맞춰 연결한다. 세계 WEF 전망을 한국 직군 점수로 직접 환산하지 않는다.
6) 역할 압축·확장은 직군 간 업무공유·실제 수행증거에 기반한 그래프를 구축한다. 현재 crossover 템플릿을 교체한다.
7) 모델 계수 조정용 데이터와 검증용 데이터를 분리한다. 전문가 합의도·관측 자동화율 오차·직군별 편향을 확인한다. 원하는 직군 순위나 마케팅 날짜에 맞춰 보정하지 않는다.

## 4. 배포 전 수용 기준

700개 업무 review_status 변경, 근거별 점수와 분류코드 매핑, 수요 결측 정책, 문항 응답 신뢰도, 시나리오 민감도, 보호 장벽 적용, 실측 외부 검증을 각각 승인한다. 승인 전에는 내부 프로토타입/모델 탐색용으로 사용한다. 실행 테스트 통과를 예측 정확도 검증으로 표기하지 않는다.

## 5. 개인정보

첫 프로토타입은 회사명·주민번호·실제 고객명 없이 직군과 업무만 받는다. 서버 구현 시 진단 저장 동의, 삭제, 접근권한과 보관기간을 정의한다. 개인 평가를 고용 의사결정에 재사용하려면 별도 목적과 검증이 필요하다.
