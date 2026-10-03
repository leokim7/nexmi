import json, sqlite3, pathlib
P=pathlib.Path(__file__).parent
# occupation | family | ten role-specific tasks; four contextual tasks added below
RAW='''CEO/경영자|strategy|사업방향 설정,투자안 검토,자원 배분,경영성과 분석,이사회 보고,파트너 협상,조직구조 설계,핵심인재 선발,사업위기 대응,최종 경영판단
경영·사업기획|strategy|시장규모 조사,경쟁사 분석,사업모델 설계,사업계획 작성,예산안 작성,성과지표 설계,사업타당성 검토,실행과제 설계,제휴안 검토,경영진 의사결정 지원
PM/PO·서비스기획|strategy|사용자 조사,요구사항 정의,제품전략 수립,기능 우선순위 결정,화면흐름 설계,프로토타입 제작,개발 일정 조율,인수조건 정의,제품성과 분석,출시 의사결정
경영컨설턴트|strategy|고객문제 정의,산업자료 조사,인터뷰 진행,가설 수립,데이터 분석,개선안 설계,재무효과 추정,보고서 작성,경영진 설득,변화관리 지원
일반사무|routine|자료 입력,문서 분류,전자문서 작성,회의록 정리,일정 관리,비용증빙 취합,내부자료 검색,서류 대조,보고자료 취합,업무시스템 등록
행정·비서|routine|임원일정 조정,방문객 응대,출장 예약,공문 작성,회의 준비,결재문서 관리,통신내용 정리,행사 운영,비밀문서 취급,임원대외활동 지원
HR/채용|social|채용요건 정의,채용공고 작성,지원서 검토,면접 운영,후보자 소통,입사절차 진행,인사자료 관리,평가제도 운영,노무이슈 확인,교육계획 수립
구매·조달|routine|구매수요 취합,공급사 검색,견적 비교,공급사 평가,구매조건 협상,발주서 작성,납기 추적,검수자료 확인,구매원가 분석,공급위험 대응
회계·경리|routine|전표 입력,증빙 검토,계정 분류,매입매출 대사,급여 계산,지급명세 준비,월말 결산,자금현황 정리,세무신고자료 준비,미수금 추적
회계사|regulated|감사계획 수립,재무제표 분석,감사증거 수집,내부통제 평가,표본검사 수행,회계추정 검토,감사쟁점 판단,고객설명 진행,감사보고서 작성,감사의견 확정
세무사|regulated|세무자료 수집,신고서 작성,공제요건 검토,세액 계산,세법자료 검색,과세쟁점 검토,세무상담 진행,불복자료 작성,신고오류 수정,신고책임 검토
재무·금융분석가|analytic|재무자료 수집,기업가치 평가,현금흐름 모델링,산업동향 분석,투자위험 분석,포트폴리오 분석,시나리오 계산,투자보고서 작성,투자위원회 설명,모델가정 검토
은행원|regulated|계좌업무 처리,본인확인 진행,상품 안내,대출자료 확인,신용평가 보조,송금 처리,금융상담 진행,이상거래 확인,고객민원 처리,거래승인 검토
보험심사·사무|regulated|청구서 접수,증빙자료 확인,약관 검색,보장범위 확인,손해액 산정,이상청구 탐지,추가자료 요청,심사결과 작성,이의신청 검토,지급결정 검토
SW개발자|agent|요구사항 해석,기술설계,코드 작성,테스트 작성,디버깅,코드 리뷰,기술문서 작성,배포 수행,시스템 운영,보안 검토
데이터분석가|analytic|분석문제 정의,데이터 추출,데이터 정제,지표 정의,탐색분석,통계검정,대시보드 제작,결과 해석,분석보고서 작성,실험효과 분석
데이터사이언티스트|analytic|연구문제 정의,데이터셋 구축,특성 설계,모델 학습,모델 평가,오차 분석,인과추론,실험 설계,모델 배포 협의,분석한계 검토
AI엔지니어|agent|모델요건 정의,학습파이프라인 구축,모델 통합,프롬프트 설계,평가셋 구축,추론 최적화,안전성 평가,모델모니터링 구축,모델오류 분석,AI서비스 배포
DevOps/Cloud|agent|인프라 설계,인프라코드 작성,CI/CD 구축,배포 운영,성능 모니터링,장애 진단,복구 수행,비용 최적화,접근권한 설정,백업복원 검증
정보보안|agent|위협모델링,취약점 점검,보안로그 분석,침해사고 조사,보안정책 설계,접근권한 검토,모의침투,보안패치 관리,사고대응 조율,보안감사 준비
UX/UI디자이너|creative|사용자 인터뷰,사용성 평가,정보구조 설계,와이어프레임 제작,비주얼UI 제작,디자인시스템 구축,프로토타입 제작,접근성 검토,개발핸드오프,디자인성과 분석
그래픽디자이너|creative|브리프 해석,비주얼컨셉 개발,이미지 제작,타이포그래피 설계,편집레이아웃 제작,브랜드가이드 적용,인쇄파일 준비,시안 수정,색상 검수,최종시안 협의
영상제작·편집|creative|영상기획,콘티 작성,촬영 준비,현장 촬영,소스 정리,컷 편집,자막 제작,색보정,음향 편집,최종영상 검수
작가·카피라이터|creative|주제 조사,독자 분석,구성안 작성,원고 집필,카피 제작,문장 수정,사실 확인,톤 조정,편집자 협의,저작권 확인
기자|creative|취재주제 발굴,자료 조사,취재원 접촉,인터뷰 진행,현장 취재,사실 교차검증,기사 작성,제목 작성,취재윤리 판단,정정요청 대응
마케터|creative|시장 조사,고객세분화,캠페인 기획,콘텐츠 제작,광고소재 제작,광고집행 설정,성과 분석,전환실험,예산 배분,브랜드전략 수립
광고기획/AE|creative|광고주 브리프 정리,캠페인전략 설계,제안서 작성,크리에이티브 협의,매체계획 수립,제작일정 조율,광고주 설득,집행현황 관리,성과보고 작성,예산협상
B2B영업|social|잠재고객 조사,리드 발굴,첫접촉 진행,고객요구 파악,제안서 작성,제품시연,가격 협상,계약조건 협의,CRM 기록,고객관계 유지
판매직|social|매장고객 응대,제품 설명,상품 진열,재고 확인,결제 처리,교환반품 처리,구매추천,고객불만 대응,매장환경 관리,판매실적 정리
고객상담/CS|social|문의 분류,답변자료 검색,채팅 상담,전화 상담,계정문제 확인,환불요청 처리,고객감정 대응,복잡문의 이관,상담기록 작성,반복문제 분석
변호사|regulated|사건사실 파악,판례 검색,법률쟁점 분석,계약서 검토,법률문서 작성,의뢰인 상담,증거 검토,협상 진행,법정 변론,법률전략 판단
법무·법률사무|regulated|법률자료 검색,계약초안 작성,소송서류 준비,사건일정 관리,증거자료 정리,법인서류 관리,규정 검토,접수절차 처리,변호사 업무지원,문서누락 점검
교사|social|수업계획 수립,교재 준비,수업 진행,학습평가,학생피드백,생활지도,학부모 상담,학습격차 대응,학급 운영,학생안전 관리
교수·연구자|analytic|연구주제 설정,선행연구 검토,연구설계,실험 수행,데이터 분석,논문 작성,강의 진행,학생지도,연구비 제안,연구윤리 검토
학원강사|social|진도계획 작성,문제 선정,수업 진행,답안 채점,개별학습 상담,학부모 소통,시험자료 제작,보충지도,학습성과 분석,학생동기 지원
의사|clinical|문진,신체진찰,검사 처방,검사결과 해석,진단 판단,치료계획 수립,처치 수행,환자설명,의무기록 작성,응급상황 대응
간호사|clinical|환자상태 관찰,활력징후 측정,투약 수행,간호처치,환자이동 지원,환자교육,의무기록 작성,간호인계,감염예방 수행,응급상황 대응
약사|clinical|처방 검토,조제 수행,약물상호작용 확인,복약지도,약품재고 관리,약품품질 확인,의약품 정보검색,환자상담,조제기록 작성,투약오류 예방
심리·상담|social|초기면담,심리검사 운영,검사결과 해석,상담계획 수립,개별상담,집단상담,위기개입,내담자관계 형성,상담기록 작성,전문기관 의뢰
돌봄|physical|일상생활 지원,식사 지원,위생 관리,이동 보조,상태 관찰,정서적 지지,보호자 소통,돌봄기록 작성,안전사고 예방,긴급상황 보고
자연·공학연구원|analytic|연구가설 수립,문헌 조사,실험설계,실험장치 준비,실험 수행,측정데이터 처리,모델링,결과 검증,연구보고서 작성,기술이전 검토
기계·전기 엔지니어|physical|설계요건 분석,도면 작성,부품 선정,설계계산,시제품 제작,시험 수행,고장원인 분석,설계변경,생산협의,안전기준 검토
건설기술자|physical|현장조사,시공계획 작성,도면 검토,공정 관리,현장감독,물량 산출,품질검사,안전점검,협력사 조율,준공검수
전기·설비기사|physical|현장진단,설비 설치,전선 배선,계측 수행,고장수리,예방정비,안전차단 수행,작업환경 확인,작업기록 작성,설비인수시험
생산기술·품질|physical|공정설계,작업표준 작성,생산조건 설정,제품검사,불량원인 분석,공정개선,설비성능 확인,품질데이터 분석,협력사품질 검토,시정조치 검증
제조·조립|physical|부품 준비,부품 조립,장비 조작,제품 육안검사,포장 수행,자재 운반,작업조건 확인,불량품 분류,작업기록 작성,작업장 정리
운전·배송|physical|운행계획 확인,차량점검,화물 적재,차량 운전,경로 변경,배송지 확인,물품 인도,수령확인 처리,차량상태 대응,운행기록 작성
요리사|physical|메뉴 설계,재료 준비,재료 손질,가열조리,맛 조정,음식 담기,위생 관리,주방협업,재료재고 관리,조리품질 확인
미용사|physical|고객스타일 상담,모발상태 확인,커트,염색약 조합,염색 시술,펌 시술,스타일링,도구위생 관리,시술후 안내,고객불편 대응
농업종사자|physical|재배계획 수립,토양상태 확인,파종정식,관수관리,시비관리,병해충 예찰,방제 수행,수확,선별포장,농기계 점검'''
CAP=['language','problem_solving','creativity','critical_thinking','knowledge','social','vision','manipulation','robotics','agency']
# All numeric values are transparent synthetic priors, not source estimates.
TEMPLATES={
'routine':[75,45,20,40,45,15,20,0,0,50,95,85,85,20,25,20,0],
'strategy':[85,85,75,90,80,75,20,0,0,80,90,35,45,70,85,35,0],
'analytic':[80,85,55,85,85,25,35,5,5,70,95,65,75,35,55,30,5],
'agent':[75,85,50,80,85,20,35,0,0,85,100,65,85,25,45,25,0],
'creative':[85,65,90,65,60,45,65,5,5,60,90,45,60,40,40,20,5],
'social':[80,60,35,65,60,95,35,15,15,55,65,45,55,90,55,40,35],
'regulated':[85,80,35,90,95,60,30,5,5,70,90,60,70,65,95,90,10],
'clinical':[70,85,30,95,95,90,80,85,80,80,30,45,70,95,100,95,95],
'physical':[45,65,25,70,65,55,85,90,90,65,20,55,70,60,65,50,100]}
FIELDS=CAP+['digitality','standardization','verifiability','human_trust','accountability','regulation','physical_presence']
occ=[];tasks=[];profiles=[]
for n,line in enumerate(RAW.splitlines(),1):
 name,family,labels=line.split('|');oid=f'O{n:02d}'; labels=labels.split(',')
 labels += [f'{name}의 업무 우선순위 조정',f'{name}의 이해관계자 협의',f'{name}의 결과 검증·승인',f'{name}의 업무개선·새 도구 학습']
 occ.append(dict(occupation_id=oid,name_ko=name,family=family,classification_code=None,classification_status='unmapped',market_demand=None,evidence_status='author_seed_pending_review'))
 for j,label in enumerate(labels,1):
  kind=family
  if any(s in label for s in ['기록','자료 검색','문서 작성','전표','자막','자료 입력','회의록','서류','CRM']):kind='routine'
  if any(s in label for s in ['협상','상담','설득','협의','소통','인터뷰']):kind='social'
  if any(s in label for s in ['의사결정','최종','검증·승인','우선순위']):kind='strategy'
  d=dict(zip(FIELDS,TEMPLATES[kind]));d['agency']=min(100,d['agency']+(j%3-1)*5)
  # Physical/clinical document tasks stay digital, procedures retain field constraints.
  d.update(task_id=f'{oid}_T{j:02d}',occupation_id=oid,name_ko=label,template_id=kind,
    task_weight=round((10 if j<=10 else 5)/120,9),crossover_in=50 if kind in ['routine','creative','agent'] else 20,
    crossover_out=60 if kind in ['strategy','agent','analytic'] else 25,
    evidence_status='synthetic_prior',source_ids=[],review_status='unreviewed',uncertainty_low=0,uncertainty_high=100,
    rationale=f'{kind} 템플릿 초기값; 직무 전문가와 관측자료 검토 전 사용',current_ai_exposure=None,automation_potential=None,augmentation_potential=None)
  tasks.append(d)
 for level in ['junior','mid','senior']:
  ws=[(1.35 if j<=10 else .6) if level=='junior' else ((.8 if j<=10 else 1.5) if level=='senior' else 1) for j in range(1,15)]
  profiles.append(dict(occupation_id=oid,career_level=level,weights={f'{oid}_T{j:02d}':w/sum(ws) for j,w in enumerate(ws,1)},status='synthetic_fallback_user_weights_override'))
config={'model_version':'1.2.0-seed','base_year':2026,'horizon_year':2040,'capabilities':dict(zip(CAP,[85,75,70,60,80,35,75,20,20,60])), 'scenario_growth':{'slow':.025,'base':.055,'fast':.09},'thresholds':{'assistance':60,'task_disruption':30,'career_transformation':60},'adoption_levels':{'none':.15,'individual':.35,'official':.55,'integrated':.75,'agent':.9},'note':'Every coefficient is an unvalidated engineering assumption. Scenario ranges are not statistical confidence intervals.'}
for filename,data in [('occupations.json',occ),('tasks.json',tasks),('career_profiles.json',profiles),('config.json',config)]:
 (P/filename).write_text(json.dumps(data,ensure_ascii=False,indent=2))
con=sqlite3.connect(P/'seed.sqlite');con.execute('PRAGMA foreign_keys=ON')
con.executescript('CREATE TABLE occupations(occupation_id TEXT PRIMARY KEY,name_ko TEXT,family TEXT,payload TEXT); CREATE TABLE tasks(task_id TEXT PRIMARY KEY,occupation_id TEXT REFERENCES occupations(occupation_id),name_ko TEXT,payload TEXT); CREATE TABLE career_profiles(occupation_id TEXT REFERENCES occupations(occupation_id),career_level TEXT,payload TEXT,PRIMARY KEY(occupation_id,career_level));')
con.executemany('INSERT INTO occupations VALUES(?,?,?,?)',[(o['occupation_id'],o['name_ko'],o['family'],json.dumps(o,ensure_ascii=False)) for o in occ]);con.executemany('INSERT INTO tasks VALUES(?,?,?,?)',[(t['task_id'],t['occupation_id'],t['name_ko'],json.dumps(t,ensure_ascii=False)) for t in tasks]);con.executemany('INSERT INTO career_profiles VALUES(?,?,?)',[(c['occupation_id'],c['career_level'],json.dumps(c,ensure_ascii=False)) for c in profiles]);con.commit();con.close()
print({'occupations':len(occ),'tasks':len(tasks),'career_profiles':len(profiles)})
