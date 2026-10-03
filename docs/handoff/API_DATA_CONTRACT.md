# 두 모드 API·저장 계약 v1.5

패키지버전1.5, 재직자모델1.2.0-seed, 진로모델1.5.0-explorer-seed. 제품버전과모델버전은독립. 계수·기준연도변경은검증과명시적버전발행필요.

## 계산

POST /api/worker/diagnoses → 원본 engine.simulate(profile). POST /api/explorer/diagnoses → student_engine.diagnose(profile). 로컬시안의진로경로만 /api/diagnoses이며 운영API와분리한다.

재직자입력: occupation_id,career_level,task_weights(task_id→0–1합1),ai_maturity(none/individual/official/integrated/agent),ai_fluency/domain_expertise/problem_definition/learning_velocity/cross_functional/decision_authority 각0–100. 운영UI는응답필수로하고초기선택값을학생입력처럼오해하지않게표시. market_demand는선택시나리오입력-100–100이며MVP화면은자료없음null. 회사규모·산업은수집전용. 숫자유한성·bool거부·직군소속·배열/객체타입검증.

재직자출력: {diagnosis_id,created_at,mode:'worker',model_version,input_snapshot,result:{profile,crossings,paths,interpretation}}. crossings.scenario.career_transformation은표시용예상종료연도. null=2026–2040내미도달. assistance/task_disruption 별도. paths는시나리오별연도·8지표·업무별결과. 실제종료일·확률·통계신뢰구간을추가생성하지않는다.

진로입력: stage=middle/high/university/jobseeker,interests8축0–100|null,skills선택10축0–100|null,weekly_minutes정수1–10080,experiences선택string[],favorite_occupations선택ID[],activity_results선택배열. 모름null,미선택키생략. 값known4개미만은정상200+needs_more_exploration. 후보0/1–4/5개모두지원.

활동결과 {activity_id,completed:boolean,enjoyment,repeat_interest,reflection?}. 서버는학생별활동ID당최신완료결과1개만전달. 재수행이력은보존. 즐거움·재도전의향둘다있는완료체험만점수반영. 일반일지·수강·포트폴리오갯수·가치관은현엔진점수미반영.

진로출력envelope {diagnosis_id,created_at,mode:'explorer',model_version,input_snapshot,result}. 원본result유지:status,recommendations,favorite_exploration,uncertainties,career_deadline:null,aptitude_probability:null. exploration_index는화면에서탐색적합지수로표시가능하나적성확률아님. education_path.status=not_verified. readyIndex 결측null. 준비수준순위반영금지.

## 운영 API

| 경로 | 동작·정책 |
|---|---|
| GET /api/catalog?mode= | 직군/업무/체험/축/버전,공개캐시 |
| GET /api/occupations/:id | 직군마스터·업무·체험·검토상태 |
| GET /api/activities/:id?stage= | 4단계과제,ID/enum검증 |
| POST /api/:mode/diagnoses | 위계산,익명처리가능·영구저장별도동의 |
| GET /api/:mode/diagnoses/:id | 본인스냅샷 |
| GET /api/history?mode= | 모드별스냅샷·페이지네이션 |
| POST /api/history/compare | 동일입력/모델/조건비교,원인구분 |
| PUT /api/submissions/:id | 본인체험초안/성찰,revision충돌409 |
| POST /api/journal | 업무적용/체험일지,점수에자동가산하지않음 |
| GET /api/journal | 본인기록,모드/직군필터 |
| PUT /api/goals/:id | 목표·시점·완료,본인권한 |
| GET /api/missions?mode= | 검토카탈로그에서조건별선택 |
| GET /api/updates?occupation_id= | 검토된정보·출처·관련taskIDs |
| GET /api/monthly-reports/:id | 활동·입력변화·모델변화분리 |
| PUT /api/notification-preferences | 기본off,사용자채널/빈도·해지 |
| DELETE /api/me/data | 본인기록삭제·공유철회 |
| POST /api/shares | 선택범위·만료·토큰hash·원본projection |
| DELETE /api/shares/:id | 본인철회 |
| GET /api/shared/:token | 선택필드만,만료/철회410 |
| GET/PATCH /api/admin/content | 관리자검토초안·revision |
| POST /api/admin/releases | 승인콘텐츠/모델발행,버전분리 |

채용API·기업추천·입사지원테이블/라우트없음. 익명결과와계정저장본합치기는사용자가선택한범위만. 공통계정은선택적이며로그인전진단허용. 운영인증은프로젝트기존방식활용,계정저장시인증/저장동의완료전영구저장하지않음.

오류 {error:{code,message,field_errors?,request_id}}. 400형식/401인증/403권한/404없음/409버전충돌/422입력/429제한/500서버. request100KB,텍스트3000자·경험20개각300자 제안. 스택노출금지.

## 스냅샷·변화 원인

진단입력·결과불변,재진단새ID. 비교요청의원본스냅샷을보존한다. 같은현재모델로이전입력/현재입력차이는개인변화,같은이전입력으로이전/현재모델차이는모델변화. 데이터부족하면해당비교자료없음. 롤업통계·동일직군백분위는실제동의표본없으면금지.

## 저장과 개인정보

기본session메모리,기기저장은선택후localStorage. 운영은버전·만료·손상검사. 계산전송과영구저장동의분리. 공유는선택된항목만서버projection,전체JSON뒤CSS숨김금지. 성찰·원문응답기본공유제외. 미성년자운영동의·보관기간·삭제·접근권한은서비스상황별검토후구현. 이벤트로그에원문응답/성찰/날짜점수를노출하지않음.
