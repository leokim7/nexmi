import json,pathlib
P=pathlib.Path(__file__).parent
qs=[]
def add(i,text,target,typ,options=None,required=False,note=''):
 qs.append(dict(question_id=i,text_ko=text,target=target,type=typ,options=options,required=required,mapping_note=note))
add('Q01','현재 수행하는 대표 직군은 무엇인가요?','occupation_id','occupation_selector',required=True,note='occupations.json의 ID 선택; 미분류 직업은 수동 확인')
add('Q02','현재 역할 수준을 선택해주세요.','career_level','enum',['junior','mid','senior'],True,'나이·연차 점수 없음. 업무비중 미응답 시 임시 분포 선택')
add('Q03','각 업무에 사용하는 시간의 비중을 입력해주세요.','task_weights','weights',required=True,note='선택 직군 14개 업무에 배분, 합 100%; 엔진에서는 0–1. 해당없음=0')
add('Q04','회사에서 AI를 어느 단계로 사용하나요?','ai_maturity','enum',['none','individual','official','integrated','agent'],True,'adoption_levels 선택; AI를 쓰는 기업 비율과 자동화 비율을 혼동하지 않음')
for i,text,target in [(5,'AI로 업무를 수행하고 결과를 검증할 수 있나요?','ai_fluency'),(6,'예외와 복잡한 문제를 해결할 전문지식이 있나요?','domain_expertise'),(7,'무엇을 해결할지 직접 정의하나요?','problem_definition'),(8,'새 도구를 배우고 실제 업무에 적용하나요?','learning_velocity'),(9,'다른 직무 영역의 결과물을 완성할 수 있나요?','cross_functional'),(10,'결과와 우선순위의 최종 결정권이 있나요?','decision_authority')]:
 add(f'Q{i:02d}',text,target,'behavioral_scale',[0,25,50,75,100],True,'0 경험없음 / 25 도움받아 수행 / 50 독립적으로 일부 수행 / 75 반복 수행 / 100 복잡한 상황까지 책임지고 수행. 자기보고값')
for i,text,target in [(11,'고객 관계를 직접 유지하나요?','client_ownership'),(12,'다른 사람의 업무를 조율하고 관리하나요?','leadership'),(13,'결과에 대한 공식 책임이 있나요?','personal_accountability'),(14,'현장에서 예외 상황을 처리하나요?','situational_skill')]:add(f'Q{i:02d}',text,target,'behavioral_scale',[0,25,50,75,100],False,'v1.2 수집 전용; 계산에 미반영. 계수 검증 후 연결')
add('Q15','회사 인원 규모는 어떻게 되나요?','company_size','enum',['1–9','10–49','50–249','250+'],note='맥락 수집 전용. 현재 엔진 계수 아님')
add('Q16','어떤 산업에서 일하나요?','industry','text',note='수요 데이터 조인용; 현재 점수에 미반영')
add('Q17','업무에 필요한 AI 사용이 정책상 허용되나요?','ai_policy','enum',['allowed','restricted','prohibited'],note='수집 전용; prohibited면 agent 응답 모순 확인 필요')
add('Q18','최근 채용과 업무량의 변화를 알려주세요.','demand_observation','text',note='단일 자기보고에서 market_demand를 자동 산출하지 않음')
(P/'questions.json').write_text(json.dumps(qs,ensure_ascii=False,indent=2))
profile={'occupation_id':'O15','career_level':'mid','ai_maturity':'integrated','ai_fluency':75,'domain_expertise':75,'problem_definition':75,'learning_velocity':75,'cross_functional':50,'decision_authority':50}
(P/'example_profile.json').write_text(json.dumps(profile,ensure_ascii=False,indent=2))
