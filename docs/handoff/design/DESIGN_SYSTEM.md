# 디자인 시스템

톤: 차분한 탐색 도구. 가칭 ‘진로의 다음’. 흰 카드·옅은 녹색·짙은 텍스트, 결과보다 다음 행동을 강조. 유료 서비스·브랜드 확정은 범위 밖이다.

## 레이아웃

360/390px 모바일, 768px 태블릿, 1280/1440px 데스크톱 확인. 800px 이상 좌측 탐색영역220px + 본문, 모바일 상단 가로메뉴(시안) / 운영은 하단4탭(탐색·체험·계획·내기록) 권장. content max1280px. 모바일 gutter20, desktop42. 모바일 카드1열, desktop2열. 질문은 집중형1열. 비교표는 가로스크롤과 고정 행제목, 선택 직군명 계속 확인 가능.

## 컴포넌트 계약

| 컴포넌트 | props/상태 | 접근성 |
|---|---|---|
| StageCard | stage,label,selected,onSelect | radio group |
| InterestScale | value(number/null/undefined),onChange | 미선택/모름 별도, radio group |
| ProgressHeader | step,total,back | 현재질문 텍스트 |
| OccupationCard | id,name,reasons,evidenceCount,compareSelected | 전체카드 중첩클릭 금지 |
| EvidenceBadge | unreviewed/verified/missing | 색+텍스트 |
| ReadinessPanel | value/null,gaps | 미응답은 자료없음 |
| ComparisonTable | 1–3occupationIds | table headers, 스크롤 안내 |
| ActivityStepper | steps,current,draft,status | 이탈경고, 현재단계 읽기 |
| ReflectionForm | enjoyment,repeatInterest,text,error | 필드별 오류 |
| LearningPathCard | options,subjects,requirementStatus | 공식요건 미확인 배지 |
| PlanItem | label,duration,checked | checkbox label |
| EmptyState / ErrorState | message,action | error role=alert |
| ReportPrint | snapshot,selectedSections | print 전용간격 |
| ConfirmDialog | delete/save/share | focus trap·Escape·포커스 복귀 |

토큰은 design_tokens.json. 그래프는 정확한 데이터가 있을 때만 사용. 레이더로 적성 점수를 연출하지 않음. 준비 점수는 선택된 자기보고 능력의 상태 설명과 함께 제공한다.

## 상태·문구

기본 미응답 ‘아직 모름’, 오류 ‘입력을 확인해주세요’, 추천 부족 ‘조금 더 알아보면 좋겠어요’, 준비 결측 ‘아직 확인하지 않은 역량이 있어요’, 교육요건 ‘공식 진입요건 미확인’, 계산 실패 ‘입력은 유지했어요. 다시 시도해주세요.’. 버튼 로딩 중 중복클릭 차단, 네트워크 장애 시 기존 입력 보존.

모션150–200ms, reduced-motion 지원. 사진·아이콘 외부 URL에 의존하지 않고 CSS·텍스트와 라이선스 확인된 아이콘만 사용. 시안은 외부 이미지·폰트 의존이 없다.
