"""Inspectable scenario calculator; synthetic priors, not a validated forecast."""
import json, math, pathlib
P=pathlib.Path(__file__).parent
load=lambda n:json.loads((P/n).read_text())
CONFIG=load('config.json');TASKS=load('tasks.json');PROFILES=load('career_profiles.json')
def bounded(v,lo=0,hi=100):
 if not isinstance(v,(int,float)) or isinstance(v,bool) or not math.isfinite(v) or not lo<=v<=hi:raise ValueError(f'value must be finite in [{lo},{hi}]')
 return float(v)
def calculate(profile,year=2026,scenario='base'):
 if scenario not in CONFIG['scenario_growth']:raise ValueError('unknown scenario')
 if not isinstance(year,int) or not 2026<=year<=2040:raise ValueError('year outside scenario horizon')
 rows=[t for t in TASKS if t['occupation_id']==profile['occupation_id']]
 if not rows:raise ValueError('unknown occupation')
 defaults=next((p for p in PROFILES if p['occupation_id']==profile['occupation_id'] and p['career_level']==profile.get('career_level','mid')),None)
 if defaults is None:raise ValueError('unknown career level')
 weights=profile.get('task_weights',defaults['weights']);valid={t['task_id'] for t in rows}
 if not weights or set(weights)-valid:raise ValueError('invalid task ids')
 weights={k:bounded(v,0,1) for k,v in weights.items()}
 if abs(sum(weights.values())-1)>1e-6:raise ValueError('task weights must sum to 1')
 maturity=profile.get('ai_maturity','individual')
 if maturity not in CONFIG['adoption_levels']:raise ValueError('unknown maturity')
 ai=bounded(profile.get('ai_fluency',50))/100
 migration_keys=['domain_expertise','problem_definition','learning_velocity','cross_functional','decision_authority']
 migration=sum(bounded(profile.get(k,50)) for k in migration_keys)/len(migration_keys)
 demand=profile.get('market_demand');demand=None if demand is None else bounded(demand,-100,100)
 growth=CONFIG['scenario_growth'][scenario];dt=year-2026
 adoption=1-(1-CONFIG['adoption_levels'][maturity])*math.exp(-growth*dt)
 caps={k:v+(100-v)*(1-math.exp(-growth*dt*(.4 if k in ['manipulation','robotics'] else 1))) for k,v in CONFIG['capabilities'].items()}
 task_results=[]
 for t in rows:
  # Requirement-normalized fit; weakest material requirement is the bottleneck.
  fits=[min(1,caps[k]/t[k]) for k in caps if t[k]>=20]
  fit=.5*min(fits)+.5*sum(fits)/len(fits)
  physical=t['physical_presence']/100
  tech=fit*(.25+.75*t['digitality']/100)*(1-.7*physical)*( .4+.6*t['standardization']/100)*(.4+.6*t['verifiability']/100)
  moat=max(t[k] for k in ['human_trust','accountability','regulation','physical_presence'])/100
  exposure=100*fit
  automation=100*tech*adoption*(1-.75*moat)
  augmentation=100*fit*(.35+.65*ai)*(1-.35*physical)
  task_results.append(dict(task_id=t['task_id'],name_ko=t['name_ko'],weight=weights.get(t['task_id'],0),exposure=exposure,automation=automation,augmentation=augmentation,human_moat=100*moat,compression=automation*t['crossover_in']/100,expansion=augmentation*t['crossover_out']/100,evidence_status=t['evidence_status']))
 avg=lambda k:sum(t['weight']*t[k] for t in task_results)
 metrics={k:round(avg(k),2) for k in ['exposure','automation','augmentation','compression','expansion','human_moat']};metrics.update(task_migration=round(migration,2),market_demand=demand)
 # Multiplicative pressure with bounded mitigation; not a probability.
 pressure=metrics['automation']+.25*metrics['compression']
 opportunity=.5*metrics['augmentation']/100+.5*migration/100
 pressure*=1-.45*opportunity
 if demand is not None:pressure*=1-.25*demand/100
 metrics['career_disruption_index']=round(min(100,max(0,pressure)),2)
 metrics['career_resilience']=round(100-metrics['career_disruption_index'],2)
 return {'model_version':CONFIG['model_version'],'year':year,'scenario':scenario,'metrics':metrics,'tasks':task_results,'data_quality':'synthetic_unvalidated','market_demand_status':'missing' if demand is None else 'user_scenario_input','confidence_interval':None,'forecast_validated':False}
def simulate(profile):
 paths={s:[calculate(profile,y,s) for y in range(2026,2041)] for s in CONFIG['scenario_growth']}
 thresholds={'assistance':('augmentation',60),'task_disruption':('automation',30),'career_transformation':('career_disruption_index',60)}
 crossings={s:{name:next((r['year'] for r in rs if r['metrics'][key]>=threshold),None) for name,(key,threshold) in thresholds.items()} for s,rs in paths.items()}
 return {'profile':profile,'crossings':crossings,'paths':paths,'interpretation':'Conditional scenario threshold years, not dismissal dates or confidence bounds. null means threshold not reached within 2026–2040.'}
if __name__=='__main__':
 import argparse
 a=argparse.ArgumentParser();a.add_argument('profile');a.add_argument('--output');args=a.parse_args();result=simulate(json.loads(pathlib.Path(args.profile).read_text()));text=json.dumps(result,ensure_ascii=False,indent=2)
 if args.output:pathlib.Path(args.output).write_text(text)
 else:print(text)
