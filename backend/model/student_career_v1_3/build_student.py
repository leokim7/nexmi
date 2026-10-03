import pathlib,json
P=pathlib.Path(__file__).parent;BASE=P/'career_engine_v1_2';OUT=P/'student';OUT.mkdir(exist_ok=True)
load=lambda f:json.loads((BASE/f).read_text())
AXES={'investigate':'자료를 찾고 원인을 분석하기','create':'글·그림·영상·아이디어 만들기','build':'도구·코드·물건 만들기','help':'다른 사람을 돕고 가르치기','persuade':'제안하고 설득·협상하기','organize':'자료·일정·절차를 정리하기','lead':'목표·우선순위를 정하고 조율하기','field':'현장을 관찰하고 직접 움직이기'}
FAMILY={
 'strategy':{'axes':['lead','investigate','persuade'],'subjects':['국어','사회','수학'],'majors':['경영학','경제학','산업공학'],'project':'학교나 동아리의 문제를 정의하고 개선안을 제안하기'},
 'routine':{'axes':['organize','investigate'],'subjects':['수학','정보','국어'],'majors':['경영학','회계학','행정학'],'project':'가상의 행사 예산과 일정표를 만들고 오류 검토하기'},
 'analytic':{'axes':['investigate','build'],'subjects':['수학','정보','과학'],'majors':['통계학','컴퓨터공학','관련 자연·공학 분야'],'project':'공개된 소규모 자료를 분석하고 가정과 한계 설명하기'},
 'agent':{'axes':['build','investigate'],'subjects':['정보','수학','영어'],'majors':['컴퓨터공학','소프트웨어학','정보보호학'],'project':'간단한 프로그램을 만들고 테스트 결과 기록하기'},
 'creative':{'axes':['create','investigate'],'subjects':['국어','미술','정보'],'majors':['디자인','미디어·콘텐츠','광고·홍보'],'project':'같은 메시지를 두 가지 결과물로 만들고 사용자 피드백 비교하기'},
 'social':{'axes':['help','persuade','lead'],'subjects':['국어','사회','영어'],'majors':['교육학','심리학','경영학'],'project':'가상 상대의 요구를 듣고 이해한 내용을 확인하는 역할극'},
 'regulated':{'axes':['investigate','organize','persuade'],'subjects':['국어','사회','수학'],'majors':['법학 관련 학습','회계·세무','금융 관련 학습'],'project':'가상의 사례에서 확인할 사실과 모르는 점을 구분하기'},
 'clinical':{'axes':['help','investigate','field'],'subjects':['생명과학','화학','국어'],'majors':['직종에 해당하는 보건의료 전공'],'project':'가상의 환자 안내문을 읽기 쉽게 고치고 전문가 확인사항 정리하기'},
 'physical':{'axes':['field','build','organize'],'subjects':['과학','기술 관련 학습','수학'],'majors':['관련 공학·기술 분야 또는 직업교육'],'project':'사진이나 모형에서 작업 순서와 위험요인을 찾아 설명하기'}}
# Author-designed exploration paths, never admission/licensing requirements.
OVERRIDE={
'O13':['경영학','경제학','금융 관련 학습'],'O14':['보험·금융','경영학'],'O23':['영상·미디어','디자인'],'O24':['국어국문','문예창작','광고·홍보'],'O25':['언론·미디어','관심 취재 분야 전공'],
'O30':['경영·서비스 관련 학습','다양한 전공 가능'],'O31':['법률 분야 진입 경로 확인'],'O32':['법학·행정 관련 학습'],'O33':['희망 교과 관련 전공과 교원 양성 경로 확인'],'O34':['해당 학문 분야 전공'],'O35':['희망 교과 관련 전공'],'O36':['의학 관련 정규 진입 경로 확인'],'O37':['간호학'],'O38':['약학 관련 정규 진입 경로 확인'],'O39':['심리학','상담 관련 학습'],'O40':['돌봄 관련 직업교육'],'O41':['연구 대상 자연과학·공학 전공'],'O42':['기계공학','전기·전자공학'],'O43':['토목·건축 관련 학습'],'O44':['전기·설비 관련 직업교육·공학'],'O45':['산업공학','생산·품질 관련 학습'],'O46':['제조 관련 직업교육'],'O47':['운송·물류 관련 학습'],'O48':['조리 관련 학습·직업교육'],'O49':['미용 관련 학습·직업교육'],'O50':['농업 관련 학습·직업교육']}
cards=[];activities=[]
for o in load('occupations.json'):
 ts=[t for t in load('tasks.json') if t['occupation_id']==o['occupation_id']];f=FAMILY[o['family']]
 tag={k:(1 if k in f['axes'] else 0) for k in AXES}
 cards.append({'occupation_id':o['occupation_id'],'name_ko':o['name_ko'],'family':o['family'],'interest_tags':tag,'related_task_ids':[t['task_id'] for t in ts], 'illustrative_subjects':f['subjects'],'exploratory_paths':OVERRIDE.get(o['occupation_id'],f['majors']), 'entry_requirements':None,'entry_requirement_status':'not_verified','project_idea':f['project'],'evidence_status':'author_designed_seed','path_note':'관련 학습 예시이며 필수 전공·입시요건·자격 취득요건이 아님'})
 for i,t in enumerate([ts[0],ts[5]],1):
  activities.append({'activity_id':f"{o['occupation_id']}_A{i}",'occupation_id':o['occupation_id'],'task_id':t['task_id'],'title':f"{o['name_ko']} 체험: {t['name_ko']}",'interest_tags':f['axes'],'mode':'fictional_case_only','steps':['해당 업무의 목적과 필요한 정보를 적는다.',f"가상의 상황에서 ‘{t['name_ko']}’을 수행하는 초안이나 절차도를 만든다.",'결과를 확인하는 방법과 사람이 판단할 부분을 표시한다.'],'deliverable':'1쪽 초안 또는 절차도와 자기 성찰 기록','stage_variants':{'middle':{'minutes':20,'scope':'간단한 가상 사례와 결과 그림/짧은 글'},'high':{'minutes':40,'scope':'조건이 다른 가상 사례 두 개 비교'},'university':{'minutes':60,'scope':'자료 근거·검증 기준·한계를 포함한 포트폴리오 초안'}},'rubric':['목적을 설명했는가','필요한 정보를 구분했는가','결과 확인 방법을 제시했는가'],'reflection':['과정이 즐거웠나요?','어떤 부분을 다시 해보고 싶나요?','완성 난도는 어땠나요?'],'restrictions':'의료·법률·금융 판단, 전기 작업, 도로 운행, 화학 시술 등 실제 실행 대신 가상 사례·사진·모형만 사용. 전문 자격이나 수행 능력을 인증하지 않음','evidence_status':'author_designed_seed'})
questions=[{'id':'S01','text':'현재 학습 단계를 선택해주세요.','target':'stage','type':'enum','options':['middle','high','university'],'required':True}]
for n,(axis,label) in enumerate(AXES.items(),2):questions.append({'id':f'S{n:02d}','text':f'{label} 활동을 해보고 싶은가요?','target':f'interests.{axis}','type':'scale','options':[0,25,50,75,100],'allow_unknown':True,'mapping':'추천에만 반영; 능력이나 적성 점수로 해석하지 않음'})
questions += [{'id':'S10','text':'어떤 과목·활동을 경험했나요?','target':'experiences','type':'list','mapping':'설명용; 성적이나 경험 부족으로 후보 제외하지 않음'}, {'id':'S11','text':'스스로 할 수 있는 업무 역량을 알려주세요.','target':'skills','type':'capability_scale','allow_unknown':True,'mapping':'준비 수준에만 반영; 흥미 추천 순위와 분리'}, {'id':'S12','text':'체험에 쓸 수 있는 주당 시간은?','target':'weekly_minutes','type':'number','mapping':'활동계획 분할'}, {'id':'S13','text':'원하는 학습 방식은?','target':'learning_preference','type':'enum','options':['read','make','discuss','observe'],'mapping':'수집 전용'}, {'id':'S14','text':'일에서 중요하게 생각하는 것은?','target':'values','type':'list','mapping':'수집 전용; 미검증 가치관 적합점수 없음'}, {'id':'S15','text':'이미 관심 있는 직업이 있나요?','target':'favorite_occupations','type':'occupation_list','mapping':'추천과 별도로 탐색목록에 추가'}, {'id':'S16','text':'활동 후 과정이 즐거웠나요?','target':'activity_results[].enjoyment','type':'scale','options':[0,25,50,75,100],'mapping':'해당 직군의 탐색점수 일부 보완'}, {'id':'S17','text':'이 활동을 다시 해보고 싶나요?','target':'activity_results[].repeat_interest','type':'scale','options':[0,25,50,75,100],'mapping':'해당 직군의 탐색점수 일부 보완'}, {'id':'S18','text':'결과물에 대한 피드백과 어려웠던 점은?','target':'activity_results[].reflection','type':'text','mapping':'수집 전용; 자동 적성 판정 없음'}]
for name,data in [('occupation_cards.json',cards),('activities.json',activities),('student_questions.json',questions),('interest_axes.json',AXES)]: (OUT/name).write_text(json.dumps(data,ensure_ascii=False,indent=2))
print({'cards':len(cards),'activities':len(activities),'questions':len(questions)})
