"""Share cards and per-occupation comments."""
from fastapi.testclient import TestClient

from app.main import app
from tests.test_api import full_worker_profile

client = TestClient(app)
client.__enter__()  # run startup (creates tables)


def other(ua: str) -> dict:
    return {"user-agent": ua}


def test_share_card_is_rebuilt_from_engine_and_hides_answers():
    p = full_worker_profile()
    r = client.post("/api/shares", json={"mode": "worker", "input": p, "quick": True})
    assert r.status_code == 200, r.text
    body = r.json()
    card = body["payload"]
    assert card["occupation_name"] == "SW개발자" and card["quick"] is True
    assert card["crossings"]["base"]["task_disruption"] == 2032
    assert "task_weights" not in str(card) and "ai_fluency" not in str(card)
    got = client.get(f"/api/shares/{body['id']}")
    assert got.status_code == 200 and got.json()["payload"] == card
    page = client.get(body["path"])
    assert page.status_code in (200, 503)
    if page.status_code == 200:
        assert "og:title" in page.text and "SW개발자" in page.text


def test_share_delete_requires_key_then_410():
    r = client.post("/api/shares", json={"mode": "worker", "input": full_worker_profile()}).json()
    assert client.delete(f"/api/shares/{r['id']}", headers={"x-delete-key": "wrong"}).status_code == 404
    assert client.delete(f"/api/shares/{r['id']}", headers={"x-delete-key": r["delete_key"]}).status_code == 204
    assert client.get(f"/api/shares/{r['id']}").status_code == 410


def test_share_rejects_invalid_input():
    assert client.post("/api/shares", json={"mode": "worker", "input": {"occupation_id": "O99"}}).status_code == 422
    assert client.post("/api/shares", json={"mode": "jobs", "input": {}}).status_code == 422


def test_explorer_share_has_only_top3_names():
    p = {"stage": "high", "interests": {"investigate": 100, "build": 100, "create": 50, "help": 25}, "weekly_minutes": 60}
    card = client.post("/api/shares", json={"mode": "explorer", "input": p}).json()["payload"]
    assert len(card["top"]) <= 3 and "interests" not in card


def test_comment_flow_like_report_hide():
    h = other("writer")
    r = client.post("/api/occupations/O16/comments", json={"reaction": "preparing", "body": "SQL 자동화 공부 중이에요", "nickname": "분석가"}, headers=h)
    assert r.status_code == 201, r.text
    cid = r.json()["id"]
    assert r.json()["mine"] is True
    # own comment cannot be liked; others can, toggle
    assert client.post(f"/api/comments/{cid}/like", headers=h).status_code == 409
    assert client.post(f"/api/comments/{cid}/like", headers=other("a")).json() == {"id": cid, "likes": 1, "liked": True}
    assert client.post(f"/api/comments/{cid}/like", headers=other("a")).json()["liked"] is False
    lst = client.get("/api/occupations/O16/comments", headers=other("b")).json()
    assert lst["total"] >= 1 and lst["counts"]["preparing"] >= 1
    # 3 distinct reports hide it; duplicate reports don't count twice
    for ua in ("r1", "r1", "r2", "r3"):
        client.post(f"/api/comments/{cid}/report", headers=other(ua))
    assert cid not in [c["id"] for c in client.get("/api/occupations/O16/comments").json()["items"]]


def test_comment_validation_and_rate_limit():
    h = other("spammer")
    bad = [
        {"reaction": "angry", "body": "hello"},
        {"reaction": "fine", "body": "x"},
        {"reaction": "fine", "body": "연락주세요 010-1234-5678"},
        {"reaction": "fine", "body": "여기 보세요 https://spam.example"},
        {"reaction": "fine", "body": "이 시발 직업"},
    ]
    for b in bad:
        assert client.post("/api/occupations/O01/comments", json=b, headers=h).status_code == 422, b
    assert client.post("/api/occupations/O99/comments", json={"reaction": "fine", "body": "괜찮아요"}).status_code == 404
    codes = [client.post("/api/occupations/O01/comments", json={"reaction": "fine", "body": f"한마디 {i}"}, headers=h).status_code for i in range(4)]
    assert codes == [201, 201, 201, 429]


def test_delete_own_and_admin():
    h = other("deleter")
    cid = client.post("/api/occupations/O02/comments", json={"reaction": "unsure", "body": "잘 모르겠어요"}, headers=h).json()["id"]
    assert client.delete(f"/api/comments/{cid}", headers=other("someone")).status_code == 404
    assert client.delete(f"/api/comments/{cid}", headers=h).status_code == 204
    cid2 = client.post("/api/occupations/O02/comments", json={"reaction": "unsure", "body": "두 번째"}, headers=h).json()["id"]
    assert client.delete(f"/api/admin/comments/{cid2}").status_code == 403
    assert client.delete(f"/api/admin/comments/{cid2}", headers={"x-admin-token": "test-admin"}).status_code == 204
