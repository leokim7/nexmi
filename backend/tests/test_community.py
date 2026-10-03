"""Share cards and the AI vs 인간 board."""
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


def test_board_post_side_counts_like_report_hide():
    h = other("writer")
    r = client.post("/api/posts", json={"side": "human", "body": "마지막 사인은 사람이 해요", "nickname": "분석가", "occupation_id": "O16"}, headers=h)
    assert r.status_code == 201, r.text
    p = r.json()
    assert p["mine"] is True and p["occupation_name"] == "데이터분석가" and p["side"] == "human"
    pid = p["id"]
    client.post("/api/posts", json={"side": "ai", "body": "반복 업무는 AI에게"}, headers=other("w2"))
    board = client.get("/api/posts", headers=other("b")).json()
    assert board["side_counts"]["human"] >= 1 and board["side_counts"]["ai"] >= 1
    # filters
    assert all(i["side"] == "ai" for i in client.get("/api/posts?side=ai").json()["items"])
    job = client.get("/api/posts?occupation_id=O16").json()
    assert [i["id"] for i in job["items"]] == [pid] and job["side_counts"] == {"ai": 0, "human": 1}
    assert all(i["occupation_id"] is None for i in client.get("/api/posts?tag=none").json()["items"])
    assert pid in [i["id"] for i in client.get("/api/posts?q=사인").json()["items"]]
    assert pid in [i["id"] for i in client.get("/api/posts?q=데이터분석").json()["items"]]
    assert client.get(f"/api/posts/{pid}").json()["id"] == pid
    # own post cannot be liked; others toggle
    assert client.post(f"/api/posts/{pid}/like", headers=h).status_code == 409
    assert client.post(f"/api/posts/{pid}/like", headers=other("a")).json() == {"id": pid, "likes": 1, "liked": True}
    assert client.get("/api/posts?sort=top").json()["items"][0]["id"] == pid
    assert client.post(f"/api/posts/{pid}/like", headers=other("a")).json()["liked"] is False
    # 3 distinct reports hide it; duplicate reports don't count twice
    for ua in ("r1", "r1", "r2", "r3"):
        client.post(f"/api/posts/{pid}/report", headers=other(ua))
    assert client.get(f"/api/posts/{pid}").status_code == 404
    assert pid not in [i["id"] for i in client.get("/api/posts").json()["items"]]


def test_board_pagination():
    for i in range(3):
        client.post("/api/posts", json={"side": "ai", "body": f"페이지 {i}"}, headers=other(f"pg{i}"))
    first = client.get("/api/posts?limit=2").json()
    assert len(first["items"]) == 2 and first["next_before"]
    second = client.get(f"/api/posts?limit=2&before={first['next_before']}").json()
    assert all(i["id"] < first["next_before"] for i in second["items"])


def test_board_validation_and_rate_limit():
    h = other("spammer")
    bad = [
        {"side": "robot", "body": "hello"},
        {"side": "ai", "body": "x"},
        {"side": "ai", "body": "연락주세요 010-1234-5678"},
        {"side": "ai", "body": "여기 보세요 https://spam.example"},
        {"side": "ai", "body": "이 시발 직업"},
        {"side": "ai", "body": "직업 없음", "occupation_id": "O99"},
    ]
    for b in bad:
        assert client.post("/api/posts", json=b, headers=h).status_code == 422, b
    codes = [client.post("/api/posts", json={"side": "human", "body": f"한마디 {i}"}, headers=h).status_code for i in range(4)]
    assert codes == [201, 201, 201, 429]


def test_delete_own_and_admin():
    h = other("deleter")
    pid = client.post("/api/posts", json={"side": "human", "body": "잘 모르겠어요"}, headers=h).json()["id"]
    assert client.delete(f"/api/posts/{pid}", headers=other("someone")).status_code == 404
    assert client.delete(f"/api/posts/{pid}", headers=h).status_code == 204
    pid2 = client.post("/api/posts", json={"side": "human", "body": "두 번째"}, headers=h).json()["id"]
    assert client.delete(f"/api/admin/posts/{pid2}").status_code == 403
    assert client.delete(f"/api/admin/posts/{pid2}", headers={"x-admin-token": "test-admin"}).status_code == 204
