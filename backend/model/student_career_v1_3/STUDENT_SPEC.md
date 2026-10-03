# 학생 서비스 개발 명세

## 제품 목적

진로를 대신 결정하지 않고 실제 업무를 이해하고 경험하며 후보를 좁히도록 돕는다. 학생 모드와 재직자 모드는 같은 직군·업무 마스터를 사용하지만 질문·계산·결과는 분리한다.

## 화면과 기능

1. 시작: 중학생/고등학생/대학생 선택, 저장 없이 탐색할 수 있는 경로.
2. 나 알아보기: 관심 활동 8문항. 경험 없음/모름 허용. 성적을 적성의 대용값으로 사용하지 않음.
3. 추가 정보: 현재 경험·관심 직업·사용 가능한 시간. 현재 구현에서 가치관과 학습 방식은 수집 전용.
4. 후보 탐색: 최대 5개 직군, 추천 이유, 추천 근거 개수. 통계적 우열이 없는 점수를 ‘정밀한 순위’로 강조하지 않음. 관심 직군 별도 보기.
5. 실제 업무: 기존 14개 업무 목록, 어떤 결과물을 만들고 어떤 판단이 필요한지 체험으로 확인.
6. 업무 체험: 해당 직군의 두 활동 중 미수행 활동 우선. 단계별 과제, 결과물, 확인 기준, 학령별 버전. 실제 의료·법률·전기·화학·도로 작업을 시키지 않음.
7. 성찰: 즐거움·재도전 의향, 어려운 점, 피드백. 결과물의 숙련도와 즐거움을 혼동하지 않음.
8. 학습 경로: 관련 과목·전공·직업교육 탐색 예시. 최신 공식 진입요건과 출처 확인 상태 표시.
9. 준비 계획: 정보 확인→체험→성찰→재탐색. 개인 주당 시간보다 긴 체험은 세션 분할.
10. 재진단: 입력·체험이 바뀐 결과와 원래 결과를 비교. 추천 변화 원인을 보여줌.

## API 초안

POST /student/diagnoses: stage, interests, optional skills, weekly_minutes, favorite_occupations, activity_results. 현재 엔진의 diagnose 함수 호출.
GET /student/occupations/:id: 탐색 카드와 연결된 tasks.
GET /student/activities/:id: 학령별 체험 설명.
POST /student/activities/:id/reflections: 개인 소유권·형식·중복 확인 후 기록 저장.
GET /student/diagnoses/:id/compare: 이전 입력과 동일 모델의 재계산 결과 비교.

이는 인터페이스 설계이며 이번 패키지에 HTTP 서버·인증·저장 서비스는 없다.

## 운영 데이터 모델

student_profiles: 익명 ID, stage, responses, consent_state, created_at.
student_diagnoses: profile_id, model_version, input_snapshot, result_snapshot, created_at.
activity_submissions: profile_id, activity_id, version, completed, artifact_reference, feedback, reflection.
learning_paths: occupation_id, path_type, description, verified_source, verified_at, requirement_status.
interest_task_mapping: occupation_id/task_id, interest_axis, weight, evidence_type, reviewer, version.

현재 JSON의 직군별 흥미 매핑을 추후 업무별 매핑으로 세분화한다. 실제 700개 업무별 흥미 평가를 완료한 데이터로 소개하지 않는다.

## 설명·추천 정책

추천 이유는 엔진이 반환한 사용자 응답과 체험 근거에서만 생성한다. LLM이 능력·성격·가정환경을 추론하여 점수에 추가하지 않는다. 낮은 준비 수준·AI 노출·성적·부모 직업으로 후보를 제외하지 않는다. 체험의 접근성이나 자원 제약은 대체 활동과 시간계획에 반영하는 후속 기능으로 구현한다.

AI 전망은 추천과 별도 축이다. 미래 수요가 검증되지 않은 직군은 ‘자료 없음’. 정규 직업·자격·학위가 필요한 진입 경로는 공식 최신 자료 확인 후 안내한다.

## 개인정보·미성년자 운영

학교명·실명·연락처를 필수로 받지 않는다. 운영 서비스의 동의·보호자 절차는 대상 연령과 저장 목적에 맞춰 별도로 확정한다. 교사·보호자 공유는 학생에게 공유 범위를 보여주고 명시적으로 선택하게 한다. 익명 탐색 결과를 입시·채용 선발에 재사용하지 않는다. 삭제·보관기간·접근권한은 서버 구현 시 포함한다. 이번 문서는 법률 요건을 검증한 안내문이 아니다.
