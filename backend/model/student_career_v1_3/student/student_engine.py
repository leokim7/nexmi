"""Student exploration module. Scores are heuristic indices, not aptitude probabilities."""
import json,pathlib,math
P=pathlib.Path(__file__).parent
load=lambda f:json.loads((P/f).read_text())
CARDS=load('occupation_cards.json');ACTIVITIES=load('activities.json');AXES=load('interest_axes.json')
TASKS=json.loads((P.parent/'career_engine_v1_2/tasks.json').read_text())
CAPS=['language','problem_solving','creativity','critical_thinking','knowledge','social','vision','manipulation','robotics','agency']
def score(v):
 if isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or not 0<=v<=100:raise ValueError('expected finite score 0–100')
 return float(v)
def diagnose(p):
 stage=p.get('stage')
 if stage not in ['middle','high','university','jobseeker']:raise ValueError('unknown stage')
 interests=p.get('interests',{})
 if set(interests)-set(AXES):raise ValueError('unknown interest axis')
 known={k:score(v) for k,v in interests.items() if v is not None}
 skills=p.get('skills',{})
 if set(skills)-set(CAPS):raise ValueError('unknown capability')
 skills={k:score(v) for k,v in skills.items() if v is not None}
 minutes=p.get('weekly_minutes',60)
 if isinstance(minutes,bool) or not isinstance(minutes,int) or not 1<=minutes<=10080:raise ValueError('weekly_minutes must be positive integer <=10080')
 favorites=p.get('favorite_occupations',[])
 if not isinstance(favorites,list) or set(favorites)-{c['occupation_id'] for c in CARDS}:raise ValueError('unknown favorite occupation')
 trials={};seen=set();activity_map={a['activity_id']:a for a in ACTIVITIES}
 for r in p.get('activity_results',[]):
  aid=r.get('activity_id')
  if aid not in activity_map or aid in seen:raise ValueError('unknown or duplicate activity result')
  seen.add(aid)
  if not isinstance(r.get('completed'),bool):raise ValueError('completed must be boolean')
  for k in ['enjoyment','repeat_interest']:
   if r.get(k) is not None:score(r[k])
  if r['completed'] and r.get('enjoyment') is not None and r.get('repeat_interest') is not None:
   oid=activity_map[aid]['occupation_id'];trials.setdefault(oid,[]).append((r['enjoyment']+r['repeat_interest'])/2)
 result={'model_version':'1.5.0-explorer-seed','stage':stage,'data_quality':'unvalidated_exploration','recommendations':[],'favorite_exploration':favorites,'aptitude_probability':None,'career_deadline':None,'uncertainties':['직군 매핑과 흥미 축은 저자 설계값이며 표준화된 적성검사가 아닙니다.','교육 경로는 탐색 예시이며 최신 진입요건은 별도 확인이 필요합니다.']}
 if len(known)<4:
  result.update(status='needs_more_exploration',next_questions=[k for k in AXES if k not in known],next_action='최소 4개 활동에 대한 관심을 답하거나 여러 체험을 먼저 진행해주세요.');return result
 candidates=[]
 for c in CARDS:
  relevant=[k for k,v in c['interest_tags'].items() if v];answered=[k for k in relevant if k in known]
  if len(answered)/len(relevant)<.67:continue
  base=sum(known[k] for k in answered)/len(answered);actual=trials.get(c['occupation_id'],[])
  exploration=.7*base+.3*sum(actual)/len(actual) if actual else base
  rs=[t for t in TASKS if t['occupation_id']==c['occupation_id']]
  req={k:sum(t[k]*t['task_weight'] for t in rs)/sum(t['task_weight'] for t in rs) for k in CAPS}
  needs=sorted([k for k in CAPS if req[k]>=40],key=lambda k:-req[k])
  readiness=None
  if needs and all(k in skills for k in needs):readiness=round(100*sum(min(1,skills[k]/req[k]) for k in needs)/len(needs),1)
  activities=[a for a in ACTIVITIES if a['occupation_id']==c['occupation_id']]
  chosen=next((a for a in activities if a['activity_id'] not in seen),activities[0]);variant=chosen['stage_variants'][stage]
  activity={**chosen,'selected_variant':variant,'sessions':math.ceil(variant['minutes']/minutes)}
  candidates.append({'occupation_id':c['occupation_id'],'name_ko':c['name_ko'],'family':c['family'],'exploration_index':round(exploration,1),'interest_index':round(base,1),'observed_interest':round(sum(actual)/len(actual),1) if actual else None,'evidence_count':len(actual),'readiness_index':readiness,'readiness_note':'자기보고와 가상의 요구수준 비교; 수행능력 인증 아님','why':[f'{AXES[k]}에 대한 관심 {known[k]:g}' for k in sorted(answered,key=lambda x:-known[x])[:2]],'skill_gaps':[{'capability':k,'status':'unknown' if k not in skills else ('practice_candidate' if skills[k]<req[k] else 'self_report_meets_seed'),'seed_requirement':round(req[k],1),'self_report':skills.get(k)} for k in needs[:4]],'education_path':{'subjects':c['illustrative_subjects'],'options':c['exploratory_paths'],'status':c['entry_requirement_status'],'note':c['path_note']},'ai_change':{'status':'qualitative_seed','message':'업무별 AI 보조 가능성과 인간 검토·책임·현장 역할을 탐색합니다. AI 변화는 추천 순위에 가산·감점하지 않습니다.','task_ids':c['related_task_ids'][:3]},'next_activity':activity,'plan':['이번 주: 직업의 실제 업무를 읽고 확인할 질문 작성','다음 단계: 선택한 미니 과제 수행','체험 후: 즐거움·재도전 의향과 피드백 기록','재탐색: 새로운 관심 응답과 체험 결과로 다시 계산']})
 # Diversity is visible and explicit; no false statistically distinct ranks.
 candidates.sort(key=lambda c:(-c['exploration_index'],c['occupation_id']));counts={};selected=[]
 for c in candidates:
  if counts.get(c['family'],0)>=2:continue
  counts[c['family']]=counts.get(c['family'],0)+1;selected.append(c)
  if len(selected)==5:break
 result.update(status='exploration_ready',recommendations=selected,selection_policy='exploration_index descending; maximum 2 per family; equal scores ordered by ID, not evidence of superiority',interest_response_coverage=len(known)/len(AXES))
 if selected and max(c['exploration_index'] for c in selected)<40:result['next_action']='뚜렷한 관심 후보가 부족합니다. 추천 확정 대신 서로 다른 활동을 체험해주세요.'
 return result
if __name__=='__main__':
 import argparse
 a=argparse.ArgumentParser();a.add_argument('profile');a.add_argument('--output');args=a.parse_args();out=json.dumps(diagnose(json.loads(pathlib.Path(args.profile).read_text())),ensure_ascii=False,indent=2)
 if args.output:pathlib.Path(args.output).write_text(out)
 else:print(out)
