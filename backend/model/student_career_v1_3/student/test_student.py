import unittest,json
from student_engine import *
class StudentTest(unittest.TestCase):
 def setUp(self):self.p={'stage':'high','interests':{k:50 for k in AXES}}
 def test_counts(self):self.assertEqual(len(CARDS),50);self.assertEqual(len(ACTIVITIES),100);self.assertEqual(len(load('student_questions.json')),18)
 def test_references(self):
  ids={t['task_id'] for t in TASKS};self.assertTrue(all(a['task_id'] in ids for a in ACTIVITIES))
 def test_three_stages(self):
  for s in ['middle','high','university']:self.assertEqual(len(diagnose({**self.p,'stage':s})['recommendations']),5)
 def test_missing_interests(self):self.assertEqual(diagnose({'stage':'middle'})['recommendations'],[])
 def test_unknown_is_not_zero(self):self.assertEqual(diagnose({'stage':'high','interests':{k:None for k in AXES}})['status'],'needs_more_exploration')
 def test_skill_does_not_change_ranking(self):
  a=diagnose(self.p);b=diagnose({**self.p,'skills':{k:100 for k in CAPS}});self.assertEqual([x['occupation_id'] for x in a['recommendations']],[x['occupation_id'] for x in b['recommendations']])
 def test_activity_changes_interest(self):
  r=diagnose({**self.p,'activity_results':[{'activity_id':'O01_A1','completed':True,'enjoyment':100,'repeat_interest':100}]});self.assertEqual(r['recommendations'][0]['occupation_id'],'O01');self.assertEqual(r['recommendations'][0]['evidence_count'],1)
 def test_incomplete_not_used(self):
  r=diagnose({**self.p,'activity_results':[{'activity_id':'O01_A1','completed':False,'enjoyment':100,'repeat_interest':100}]});self.assertEqual(r['recommendations'][0]['evidence_count'],0)
 def test_bad_inputs(self):
  for p in [{**self.p,'stage':'bad'},{**self.p,'interests':{'create':float('nan')}},{**self.p,'weekly_minutes':0},{**self.p,'skills':{'bad':50}},{**self.p,'activity_results':[{'activity_id':'bad','completed':True}]}]:
   with self.assertRaises(ValueError):diagnose(p)
 def test_diversity(self):
  from collections import Counter
  self.assertTrue(all(v<=2 for v in Counter(c['family'] for c in diagnose(self.p)['recommendations']).values()))
 def test_unknown_readiness(self):self.assertTrue(all(r['readiness_index'] is None for r in diagnose(self.p)['recommendations']))
 def test_no_deadline(self):self.assertIsNone(diagnose(self.p)['career_deadline']);self.assertIsNone(diagnose(self.p)['aptitude_probability'])
 def test_stage_duration(self):
  r=diagnose({**self.p,'stage':'university','weekly_minutes':20});self.assertEqual(r['recommendations'][0]['next_activity']['sessions'],3)
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.defaultTestLoader.loadTestsFromTestCase(StudentTest))
 (P/'student_validation.json').write_text(json.dumps({'tests':r.testsRun,'passed':r.wasSuccessful(),'scope':'software behavior only; no psychometric validation'},indent=2))
 if not r.wasSuccessful():raise SystemExit(1)
