"""Share cards and the "AI vs 인간" board.

Share cards are rebuilt on the server from the engine, so a card always matches a
real calculation and never contains the raw answers (only a fixed projection).
Posts pick a side (AI / 인간), are anonymous, short, rate-limited, reportable and hidden after 3 reports.
"""
from __future__ import annotations

import datetime as dt
import hashlib
import os
import re
import secrets
from typing import Any

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import and_, delete, false, func, insert, or_, select, update

from . import engines
from .db import engine, post_votes, posts, shares
from .validation import InputError, validate_explorer, validate_worker

router = APIRouter()

SHARE_DAYS = 90
SIDES = ("ai", "human")
HIDE_AFTER_REPORTS = 3
RATE_WINDOW = dt.timedelta(minutes=10)
RATE_MAX = 3
BODY_MIN, BODY_MAX, NICK_MAX = 2, 200, 12
_BANNED = ("시발", "씨발", "ㅅㅂ", "병신", "ㅂㅅ", "좆", "개새끼", "fuck", "shit")
_LINK = re.compile(r"(https?://|www\.|\.com\b|\.kr\b|\.net\b)", re.I)
_CONTACT = re.compile(r"(\d{2,3}[- .]?\d{3,4}[- .]?\d{4})|([\w.+-]+@[\w-]+\.[\w.]+)")
_SALT = os.environ.get("HASH_SALT", "nexmi-dev-salt")


def _now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def _aware(t: dt.datetime) -> dt.datetime:
    return t if t.tzinfo else t.replace(tzinfo=dt.timezone.utc)


def _who(request: Request) -> str:
    """Anonymous visitor hash (IP + UA + salt). Never stored raw."""
    ip = request.client.host if request.client else "?"
    ua = request.headers.get("user-agent", "")[:200]
    return hashlib.sha256(f"{_SALT}|{ip}|{ua}".encode()).hexdigest()


def _err(request: Request, status: int, code: str, message: str, field_errors: dict[str, str] | None = None) -> JSONResponse:
    body: dict[str, Any] = {"code": code, "message": message, "request_id": getattr(request.state, "request_id", "")}
    if field_errors:
        body["field_errors"] = field_errors
    return JSONResponse({"error": body}, status_code=status)


# ---------------------------------------------------------------- shares
def _worker_card(profile: dict, quick: bool) -> dict:
    r = engines.worker.simulate(profile)
    occ = next(o for o in engines.OCCUPATIONS if o["occupation_id"] == profile["occupation_id"])
    base0 = r["paths"]["base"][0]["metrics"]
    return {
        "occupation_id": occ["occupation_id"],
        "occupation_name": occ["name_ko"],
        "crossings": r["crossings"],
        "automation_now": base0["automation"],
        "human_moat_now": base0["human_moat"],
        "quick": quick,
        "model_version": engines.WORKER_MODEL_VERSION,
    }


def _explorer_card(profile: dict) -> dict:
    r = engines.explorer.diagnose(profile)
    return {
        "stage": profile["stage"],
        "status": r["status"],
        "top": [{"occupation_id": c["occupation_id"], "name_ko": c["name_ko"], "exploration_index": c["exploration_index"]} for c in r["recommendations"][:3]],
        "model_version": engines.EXPLORER_MODEL_VERSION,
    }


@router.post("/api/shares")
async def create_share(request: Request):
    try:
        body = await request.json()
    except ValueError:
        return _err(request, 400, "INVALID_JSON", "요청 형식이 올바르지 않아요.")
    if not isinstance(body, dict) or body.get("mode") not in ("worker", "explorer"):
        return _err(request, 422, "INVALID_INPUT", "공유할 결과 종류가 올바르지 않아요.")
    profile = body.get("input")
    try:
        if body["mode"] == "worker":
            validate_worker(profile)
            payload = _worker_card(profile, bool(body.get("quick")))
        else:
            validate_explorer(profile)
            payload = _explorer_card(profile)
    except InputError as e:
        return _err(request, 422, "INVALID_INPUT", str(e), e.field_errors)
    token = secrets.token_urlsafe(9)
    delete_key = secrets.token_urlsafe(16)
    expires = _now() + dt.timedelta(days=SHARE_DAYS)
    with engine.begin() as c:
        c.execute(insert(shares).values(id=token, delete_key_hash=hashlib.sha256(delete_key.encode()).hexdigest(), mode=body["mode"], payload=payload, expires_at=expires, revoked=False))
    return {"id": token, "path": f"/s/{token}", "delete_key": delete_key, "expires_at": expires.isoformat(timespec="seconds"), "mode": body["mode"], "payload": payload}


def load_share(token: str) -> tuple[int, dict | None]:
    with engine.connect() as c:
        row = c.execute(select(shares).where(shares.c.id == token)).mappings().first()
    if not row:
        return 404, None
    if row["revoked"] or _aware(row["expires_at"]) < _now():
        return 410, None
    return 200, {"id": row["id"], "mode": row["mode"], "payload": row["payload"], "created_at": _aware(row["created_at"]).isoformat(timespec="seconds") if row["created_at"] else None}


@router.get("/api/shares/{token}")
def get_share(token: str, request: Request):
    status, share = load_share(token)
    if status == 404:
        return _err(request, 404, "NOT_FOUND", "공유된 결과를 찾을 수 없어요.")
    if status == 410:
        return _err(request, 410, "GONE", "공유가 끝났거나 삭제된 결과예요.")
    return share


@router.delete("/api/shares/{token}")
def delete_share(token: str, request: Request):
    key = request.headers.get("x-delete-key", "")
    with engine.begin() as c:
        res = c.execute(update(shares).where(and_(shares.c.id == token, shares.c.delete_key_hash == hashlib.sha256(key.encode()).hexdigest())).values(revoked=True))
    if res.rowcount == 0:
        return _err(request, 404, "NOT_FOUND", "삭제할 공유를 찾을 수 없어요.")
    return Response(status_code=204)


# ---------------------------------------------------------------- AI vs 인간 board
def _public(row: Any, me: str, liked: set[int]) -> dict:
    occ = engines_occ.get(row["occupation_id"]) if row["occupation_id"] else None
    return {
        "id": row["id"],
        "side": row["side"],
        "body": row["body"],
        "nickname": row["nickname"],
        "occupation_id": row["occupation_id"],
        "occupation_name": occ,
        "likes": row["likes"],
        "liked": row["id"] in liked,
        "mine": row["author_hash"] == me,
        "created_at": _aware(row["created_at"]).isoformat(timespec="seconds") if row["created_at"] else None,
    }


engines_occ = {o["occupation_id"]: o["name_ko"] for o in engines.OCCUPATIONS}


def _liked(c, ids: list[int], me: str) -> set[int]:
    if not ids:
        return set()
    return set(c.execute(select(post_votes.c.post_id).where(and_(post_votes.c.post_id.in_(ids), post_votes.c.voter_hash == me, post_votes.c.kind == "like"))).scalars())


@router.get("/api/posts")
def list_posts(request: Request, side: str = "", occupation_id: str = "", tag: str = "", sort: str = "new", before: int = 0, limit: int = 20, q: str = ""):
    """tag=job → 직업이 붙은 글만, tag=none → 직업 없는 글만. 편 비율은 같은 필터(편 제외) 기준."""
    limit = max(1, min(50, limit))
    me = _who(request)
    base = [posts.c.hidden.is_(False)]
    if occupation_id:
        if occupation_id not in engines.OCCUPATION_IDS:
            return _err(request, 404, "NOT_FOUND", "직군을 찾을 수 없어요.")
        base.append(posts.c.occupation_id == occupation_id)
    if tag == "job":
        base.append(posts.c.occupation_id.is_not(None))
    elif tag == "none":
        base.append(posts.c.occupation_id.is_(None))
    if q.strip():
        like = f"%{q.strip()[:30]}%"
        ids = [k for k, v in engines_occ.items() if q.strip() in v]
        base.append(or_(posts.c.body.like(like), posts.c.nickname.like(like), posts.c.occupation_id.in_(ids) if ids else false()))
    listed = list(base)
    if side in SIDES:
        listed.append(posts.c.side == side)
    if before > 0 and sort != "top":
        listed.append(posts.c.id < before)
    order = (posts.c.likes.desc(), posts.c.id.desc()) if sort == "top" else (posts.c.id.desc(),)
    with engine.connect() as c:
        rows = c.execute(select(posts).where(and_(*listed)).order_by(*order).limit(limit + 1)).mappings().all()
        counts = dict(c.execute(select(posts.c.side, func.count()).where(and_(*base)).group_by(posts.c.side)).all())
        more = len(rows) > limit
        rows = rows[:limit]
        liked = _liked(c, [r["id"] for r in rows], me)
    side_counts = {k: counts.get(k, 0) for k in SIDES}
    return {
        "items": [_public(r, me, liked) for r in rows],
        "side_counts": side_counts,
        "total": sum(side_counts.values()),
        "next_before": rows[-1]["id"] if more and sort != "top" else None,
    }


@router.get("/api/posts/{pid}")
def get_post(pid: int, request: Request):
    with engine.connect() as c:
        row = c.execute(select(posts).where(and_(posts.c.id == pid, posts.c.hidden.is_(False)))).mappings().first()
        if not row:
            return _err(request, 404, "NOT_FOUND", "글을 찾을 수 없어요.")
        return _public(row, _who(request), _liked(c, [pid], _who(request)))


@router.post("/api/posts")
async def add_post(request: Request):
    try:
        body = await request.json()
    except ValueError:
        return _err(request, 400, "INVALID_JSON", "요청 형식이 올바르지 않아요.")
    if not isinstance(body, dict):
        return _err(request, 400, "INVALID_JSON", "요청 형식이 올바르지 않아요.")
    errors: dict[str, str] = {}
    side = body.get("side")
    text = body.get("body")
    nick = body.get("nickname")
    oid = body.get("occupation_id") or None
    if side not in SIDES:
        errors["side"] = "AI편인지 인간편인지 골라주세요."
    if oid is not None and oid not in engines.OCCUPATION_IDS:
        errors["occupation_id"] = "직군을 찾을 수 없어요."
    if not isinstance(text, str) or not BODY_MIN <= len(text.strip()) <= BODY_MAX:
        errors["body"] = f"{BODY_MIN}~{BODY_MAX}자로 적어주세요."
    else:
        text = text.strip()
        low = text.lower().replace(" ", "")
        if any(b in low for b in _BANNED):
            errors["body"] = "다른 사람을 불편하게 하는 표현은 쓸 수 없어요."
        elif _LINK.search(text):
            errors["body"] = "링크는 넣을 수 없어요."
        elif _CONTACT.search(text):
            errors["body"] = "전화번호·이메일 같은 개인정보는 적지 말아주세요."
    if nick is not None and nick != "":
        if not isinstance(nick, str) or len(nick.strip()) > NICK_MAX:
            errors["nickname"] = f"별명은 {NICK_MAX}자까지예요."
        elif any(b in nick.lower().replace(" ", "") for b in _BANNED):
            errors["nickname"] = "다른 별명을 써주세요."
    if errors:
        return _err(request, 422, "INVALID_INPUT", "입력을 확인해주세요.", errors)
    me = _who(request)
    with engine.begin() as c:
        recent = c.execute(select(func.count()).select_from(posts).where(and_(posts.c.author_hash == me, posts.c.created_at >= _now() - RATE_WINDOW))).scalar_one()
        if recent >= RATE_MAX:
            return _err(request, 429, "RATE_LIMITED", "잠시 후에 다시 남겨주세요. (10분에 3개까지)")
        new_id = c.execute(insert(posts).values(side=side, body=text, nickname=(nick or "").strip() or None, occupation_id=oid, author_hash=me, likes=0, reports=0, hidden=False)).inserted_primary_key[0]
        row = c.execute(select(posts).where(posts.c.id == new_id)).mappings().one()
    return JSONResponse(_public(row, me, set()), status_code=201)


def _vote(pid: int, request: Request, kind: str):
    me = _who(request)
    with engine.begin() as c:
        row = c.execute(select(posts).where(posts.c.id == pid)).mappings().first()
        if not row or row["hidden"]:
            return _err(request, 404, "NOT_FOUND", "글을 찾을 수 없어요.")
        if kind == "like" and row["author_hash"] == me:
            return _err(request, 409, "OWN_POST", "내 글에는 공감할 수 없어요.")
        mine = and_(post_votes.c.post_id == pid, post_votes.c.voter_hash == me, post_votes.c.kind == kind)
        if c.execute(select(func.count()).select_from(post_votes).where(mine)).scalar_one():
            if kind == "like":  # toggle off
                c.execute(delete(post_votes).where(mine))
                c.execute(update(posts).where(posts.c.id == pid).values(likes=posts.c.likes - 1))
                return {"id": pid, "likes": row["likes"] - 1, "liked": False}
            return {"id": pid, "reported": True}
        c.execute(insert(post_votes).values(post_id=pid, voter_hash=me, kind=kind))
        if kind == "like":
            c.execute(update(posts).where(posts.c.id == pid).values(likes=posts.c.likes + 1))
            return {"id": pid, "likes": row["likes"] + 1, "liked": True}
        c.execute(update(posts).where(posts.c.id == pid).values(reports=posts.c.reports + 1, hidden=posts.c.reports + 1 >= HIDE_AFTER_REPORTS))
        return {"id": pid, "reported": True}


@router.post("/api/posts/{pid}/like")
def like_post(pid: int, request: Request):
    return _vote(pid, request, "like")


@router.post("/api/posts/{pid}/report")
def report_post(pid: int, request: Request):
    return _vote(pid, request, "report")


@router.delete("/api/posts/{pid}")
def delete_own_post(pid: int, request: Request):
    me = _who(request)
    with engine.begin() as c:
        res = c.execute(delete(posts).where(and_(posts.c.id == pid, posts.c.author_hash == me)))
        if res.rowcount:
            c.execute(delete(post_votes).where(post_votes.c.post_id == pid))
    if res.rowcount == 0:
        return _err(request, 404, "NOT_FOUND", "지울 수 있는 글이 없어요.")
    return Response(status_code=204)


@router.delete("/api/admin/posts/{pid}")
def admin_delete_post(pid: int, request: Request):
    token = os.environ.get("ADMIN_TOKEN", "")
    if not token or not secrets.compare_digest(request.headers.get("x-admin-token", ""), token):
        return _err(request, 403, "FORBIDDEN", "권한이 없어요.")
    with engine.begin() as c:
        c.execute(delete(post_votes).where(post_votes.c.post_id == pid))
        c.execute(delete(posts).where(posts.c.id == pid))
    return Response(status_code=204)
