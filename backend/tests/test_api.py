"""API contract + parity tests: API results must equal the handoff's fixed examples."""
import json
import pathlib

import pytest
from fastapi.testclient import TestClient

from app.main import app

MODEL = pathlib.Path(__file__).resolve().parents[1] / "model" / "student_career_v1_3"
client = TestClient(app)


def load(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))


def roundtrip(v):
    """Compare through JSON, the same way the browser receives it."""
    return json.loads(json.dumps(v, ensure_ascii=False))


def same(a, b, path="$"):
    """Exact equality except unrounded floats, which may differ in the last ulp across Python builds."""
    if isinstance(a, float) or isinstance(b, float):
        assert a == pytest.approx(b, rel=1e-9, abs=1e-9), path
    elif isinstance(a, dict):
        assert a.keys() == b.keys(), path
        for k in a:
            same(a[k], b[k], f"{path}.{k}")
    elif isinstance(a, list):
        assert len(a) == len(b), path
        for i, (x, y) in enumerate(zip(a, b)):
            same(x, y, f"{path}[{i}]")
    else:
        assert a == b, path


WORKER_EXAMPLE = load(MODEL / "career_engine_v1_2" / "example_profile.json")


def full_worker_profile():
    p = dict(WORKER_EXAMPLE)
    default = next(x for x in client.get("/api/catalog").json()["profiles"] if x["occupation_id"] == p["occupation_id"] and x["career_level"] == p["career_level"])
    p["task_weights"] = default["weights"]
    return p


def test_catalog_shape():
    c = client.get("/api/catalog").json()
    assert len(c["occupations"]) == 50 and len(c["tasks"]) == 700 and len(c["activities"]) == 100
    assert c["worker_model_version"] == "1.2.0-seed" and c["explorer_model_version"] == "1.5.0-explorer-seed"
    assert all(len(a["stage_variants"]) == 4 for a in c["activities"])


def test_worker_parity_with_fixed_example():
    """The handoff example omits task_weights (engine falls back to defaults).
    The API requires explicit weights, so we send the default distribution and expect identical paths."""
    expected = load(MODEL / "career_engine_v1_2" / "example_result.json")
    r = client.post("/api/worker/diagnoses", json=full_worker_profile())
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["mode"] == "worker" and body["stored"] is False
    assert body["result"]["crossings"] == expected["crossings"]
    same(body["result"]["paths"], roundtrip(expected["paths"]))


@pytest.mark.parametrize("stage", ["middle", "high", "university", "jobseeker"])
def test_explorer_parity_with_fixed_examples(stage):
    profile = load(MODEL / "student" / f"example_{stage}.json")
    expected = load(MODEL / "student" / f"example_{stage}_result.json")
    r = client.post("/api/explorer/diagnoses", json=profile)
    assert r.status_code == 200, r.text
    same(r.json()["result"], roundtrip(expected))


def test_explorer_insufficient_is_200_not_error():
    r = client.post("/api/explorer/diagnoses", json={"stage": "middle", "interests": {"build": 75, "create": None, "help": 50}, "weekly_minutes": 60})
    assert r.status_code == 200
    assert r.json()["result"]["status"] == "needs_more_exploration"


@pytest.mark.parametrize("patch,field", [
    ({"weekly_minutes": 0}, "weekly_minutes"),
    ({"weekly_minutes": "60"}, "weekly_minutes"),
    ({"weekly_minutes": 10081}, "weekly_minutes"),
    ({"weekly_minutes": True}, "weekly_minutes"),
    ({"interests": {"build": 101}}, "interests.build"),
    ({"favorite_occupations": ["O99"]}, "favorite_occupations"),
    ({"stage": "elementary"}, "stage"),
])
def test_explorer_field_errors(patch, field):
    base = {"stage": "high", "interests": {"build": 75}, "weekly_minutes": 60}
    r = client.post("/api/explorer/diagnoses", json={**base, **patch})
    assert r.status_code == 422
    err = r.json()["error"]
    assert err["code"] == "INVALID_INPUT" and field in err["field_errors"] and err["request_id"]


def test_explorer_duplicate_activity_rejected():
    res = {"activity_id": "O01_A1", "completed": True, "enjoyment": 50, "repeat_interest": 50}
    r = client.post("/api/explorer/diagnoses", json={"stage": "high", "weekly_minutes": 60, "activity_results": [res, res]})
    assert r.status_code == 422


@pytest.mark.parametrize("patch,field", [
    ({"occupation_id": "O99"}, "occupation_id"),
    ({"ai_fluency": None}, "ai_fluency"),
    ({"ai_fluency": True}, "ai_fluency"),
    ({"ai_maturity": "magic"}, "ai_maturity"),
    ({"surprise": 1}, "surprise"),
])
def test_worker_field_errors(patch, field):
    r = client.post("/api/worker/diagnoses", json={**full_worker_profile(), **patch})
    assert r.status_code == 422 and field in r.json()["error"]["field_errors"]


def test_worker_weights_must_sum_to_100():
    p = full_worker_profile()
    p["task_weights"] = {k: v * 0.9 for k, v in p["task_weights"].items()}
    r = client.post("/api/worker/diagnoses", json=p)
    assert r.status_code == 422 and "task_weights" in r.json()["error"]["field_errors"]


def test_worker_null_crossing_is_reported_as_null():
    p = full_worker_profile()
    p.update(ai_maturity="none", **{k: 100 for k in ("ai_fluency", "domain_expertise", "problem_definition", "learning_velocity", "cross_functional", "decision_authority")})
    crossings = client.post("/api/worker/diagnoses", json=p).json()["result"]["crossings"]
    assert crossings["slow"]["career_transformation"] is None  # 2040까지 기준 미도달, not a year


def test_oversized_and_bad_json():
    assert client.post("/api/worker/diagnoses", content=b"x" * 100_001, headers={"content-type": "application/json"}).status_code == 400
    r = client.post("/api/worker/diagnoses", content=b"{bad", headers={"content-type": "application/json"})
    assert r.status_code == 400 and "Traceback" not in r.text


def test_no_recruiting_routes():
    paths = [getattr(r, "path", "") for r in app.routes]
    assert not any(k in p for p in paths for k in ("job", "apply", "recruit", "company"))
    assert client.get("/api/jobs").status_code == 404
