import json,unittest,copy
from engine import *
class Validation(unittest.TestCase):
 def setUp(self):self.p=load('example_profile.json')
 def test_counts(self):self.assertEqual(len(load('occupations.json')),50);self.assertEqual(len(TASKS),700);self.assertEqual(len(PROFILES),150)
 def test_references(self):
  ids={o['occupation_id'] for o in load('occupations.json')};self.assertEqual(len({t['task_id'] for t in TASKS}),700);self.assertTrue(all(t['occupation_id'] in ids for t in TASKS))
 def test_weights(self):
  for p in PROFILES:self.assertAlmostEqual(sum(p['weights'].values()),1)
 def test_bounds(self):
  for o in load('occupations.json'):
   p={**self.p,'occupation_id':o['occupation_id']}
   for y in [2026,2030,2040]:
    for s in CONFIG['scenario_growth']:
     for k,v in calculate(p,y,s)['metrics'].items():
      if v is not None:self.assertTrue(0<=v<=100)
 def test_invalid_weights(self):
  for w in [{'O15_T01':.8},{'bad':1},{'O15_T01':float('nan')},{'O15_T01':-1}]:
   with self.assertRaises(ValueError):calculate({**self.p,'task_weights':w})
 def test_ai_fluency(self):
  lo=calculate({**self.p,'ai_fluency':0})['metrics'];hi=calculate({**self.p,'ai_fluency':100})['metrics']
  self.assertEqual(lo['exposure'],hi['exposure']);self.assertEqual(lo['automation'],hi['automation']);self.assertLess(lo['augmentation'],hi['augmentation'])
 def test_maturity(self):self.assertLess(calculate({**self.p,'ai_maturity':'none'})['metrics']['automation'],calculate({**self.p,'ai_maturity':'agent'})['metrics']['automation'])
 def test_demand(self):
  low=calculate({**self.p,'market_demand':-100})['metrics'];high=calculate({**self.p,'market_demand':100})['metrics'];self.assertLess(high['career_disruption_index'],low['career_disruption_index']);self.assertIsNone(calculate(self.p)['metrics']['market_demand'])
 def test_physical(self):
  sw=calculate(self.p)['metrics']['automation'];nurse=calculate({**self.p,'occupation_id':'O37'})['metrics']['automation'];electrician=calculate({**self.p,'occupation_id':'O44'})['metrics']['automation'];self.assertGreater(sw,nurse);self.assertGreater(sw,electrician)
 def test_scenarios(self):self.assertLessEqual(calculate(self.p,2035,'slow')['metrics']['automation'],calculate(self.p,2035,'fast')['metrics']['automation'])
 def test_no_fake_confidence(self):self.assertIsNone(calculate(self.p)['confidence_interval']);self.assertFalse(calculate(self.p)['forecast_validated'])
 def test_personalized_tasks(self):
  a=calculate({**self.p,'task_weights':{'O15_T03':1}});b=calculate({**self.p,'task_weights':{'O15_T13':1}});self.assertNotEqual(a['metrics']['automation'],b['metrics']['automation'])
if __name__=='__main__':
 suite=unittest.defaultTestLoader.loadTestsFromTestCase(Validation);result=unittest.TextTestRunner(verbosity=2).run(suite)
 profiles=[]
 for oid in ['O15','O03','O09','O26','O28','O37','O44']:
  p={**load('example_profile.json'),'occupation_id':oid};r=calculate(p);profiles.append({'occupation_id':oid,'occupation':next(o['name_ko'] for o in load('occupations.json') if o['occupation_id']==oid),'metrics':r['metrics'],'crossings':simulate(p)['crossings']})
 (P/'validation_report.json').write_text(json.dumps({'tests_run':result.testsRun,'passed':result.wasSuccessful(),'scope':'software invariants and synthetic scenario sanity only; no empirical calibration','representative_profiles':profiles},ensure_ascii=False,indent=2))
 if not result.wasSuccessful():raise SystemExit(1)
