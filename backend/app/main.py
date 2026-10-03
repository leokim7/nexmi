"""NEXMI API + static frontend.

P0 scope: stateless calculation and catalog. Nothing a user enters is stored on
the server; results go back to the browser, which keeps them in memory unless
the user explicitly opts in to device storage.
"""
from __future__ import annotations

import datetime as dt
import logging
import os
import pathlib
import uuid
from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import engines
from .validation import InputError, validate_explorer, validate_worker

log = logging.getLogger("nexmi")
MAX_BODY = 100_000
DIST = pathlib.Path(os.environ.get("FRONTEND_DIST", pathlib.Path(__file__).resolve().parents[2] / "frontend" / "dist"))

app = FastAPI(title="NEXMI API", version=engines.PACKAGE_VERSION, docs_url="/api/docs", openapi_url="/api/openapi.json")
app.add_middleware(GZipMiddleware, minimum_size=1000)


def error(status: int, code: str, message: str, request: Request, field_errors: dict[str, str] | None = None) -> JSONResponse:
    body: dict[str, Any] = {"code": code, "message": message, "request_id": request.state.request_id}
    if field_errors:
        body["field_errors"] = field_errors
    return JSONResponse({"error": body}, status_code=status)


@app.middleware("http")
async def guard(request: Request, call_next):
    request.state.request_id = uuid.uuid4().hex[:12]
    if request.method in ("POST", "PUT", "PATCH"):
        length = request.headers.get("content-length")
        if length is None or not length.isdigit() or int(length) > MAX_BODY:
            return error(400, "INVALID_REQUEST_SIZE", "요청 크기가 올바르지 않아요.", request)
    response = await call_next(request)
    response.headers["X-Request-Id"] = request.state.request_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    if request.url.path.startswith("/api/") and request.url.path != "/api/catalog":
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(StarletteHTTPException)
async def http_error(request: Request, exc: StarletteHTTPException):
    code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
    return error(exc.status_code, code, "요청한 항목을 찾을 수 없어요." if exc.status_code == 404 else "요청을 처리할 수 없어요.", request)


@app.exception_handler(RequestValidationError)
async def body_error(request: Request, exc: RequestValidationError):
    return error(400, "INVALID_JSON", "요청 형식이 올바르지 않아요.", request)


@app.exception_handler(Exception)
async def server_error(request: Request, exc: Exception):
    log.exception("unhandled error request_id=%s", request.state.request_id)
    return error(500, "SERVER_ERROR", "계산 중 문제가 생겼어요. 입력은 유지했어요. 다시 시도해주세요.", request)


async def read_json(request: Request) -> Any:
    try:
        return await request.json()
    except ValueError:
        raise RequestValidationError([])


def envelope(mode: str, model_version: str, profile: dict, result: dict) -> dict:
    return {
        "diagnosis_id": str(uuid.uuid4()),
        "created_at": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "mode": mode,
        "model_version": model_version,
        "stored": False,
        "input_snapshot": profile,
        "result": result,
    }


@app.get("/api/health")
def health():
    return {"status": "ok", "package_version": engines.PACKAGE_VERSION}


@app.get("/api/catalog")
def catalog():
    cards = {c["occupation_id"]: c for c in engines.CARDS}
    occupations = []
    for o in engines.OCCUPATIONS:
        c = cards[o["occupation_id"]]
        occupations.append({
            "occupation_id": o["occupation_id"],
            "name_ko": o["name_ko"],
            "family": o["family"],
            "classification_status": o["classification_status"],
            "evidence_status": o["evidence_status"],
            "interest_tags": [k for k, v in c["interest_tags"].items() if v],
            "illustrative_subjects": c["illustrative_subjects"],
            "exploratory_paths": c["exploratory_paths"],
            "entry_requirement_status": c["entry_requirement_status"],
            "path_note": c["path_note"],
            "project_idea": c["project_idea"],
        })
    task_keys = ("task_id", "occupation_id", "name_ko", "task_weight", "evidence_status", "review_status")
    return JSONResponse(
        {
            "package_version": engines.PACKAGE_VERSION,
            "worker_model_version": engines.WORKER_MODEL_VERSION,
            "explorer_model_version": engines.EXPLORER_MODEL_VERSION,
            "base_year": engines.WORKER_CONFIG["base_year"],
            "horizon_year": engines.WORKER_CONFIG["horizon_year"],
            "thresholds": engines.WORKER_CONFIG["thresholds"],
            "adoption_levels": list(engines.WORKER_CONFIG["adoption_levels"]),
            "axes": engines.AXES,
            "capabilities": engines.CAPABILITIES,
            "occupations": occupations,
            "tasks": [{k: t[k] for k in task_keys} for t in engines.WORKER_TASKS],
            "profiles": engines.WORKER_PROFILES,
            "activities": engines.ACTIVITIES,
            "sources": engines.SOURCES,
        },
        headers={"Cache-Control": "public, max-age=300"},
    )


@app.post("/api/worker/diagnoses")
async def worker_diagnosis(request: Request):
    profile = await read_json(request)
    try:
        validate_worker(profile)
        result = engines.worker.simulate(profile)
    except InputError as e:
        return error(422, "INVALID_INPUT", str(e), request, e.field_errors)
    except ValueError as e:  # engine-level rejection that slipped past validation
        return error(422, "INVALID_INPUT", "입력을 확인해주세요.", request, {"_": str(e)})
    return envelope("worker", engines.WORKER_MODEL_VERSION, profile, result)


@app.post("/api/explorer/diagnoses")
async def explorer_diagnosis(request: Request):
    profile = await read_json(request)
    try:
        validate_explorer(profile)
        result = engines.explorer.diagnose(profile)
    except InputError as e:
        return error(422, "INVALID_INPUT", str(e), request, e.field_errors)
    except ValueError as e:
        return error(422, "INVALID_INPUT", "입력을 확인해주세요.", request, {"_": str(e)})
    return envelope("explorer", engines.EXPLORER_MODEL_VERSION, profile, result)


@app.api_route("/api/{rest:path}", methods=["GET", "POST", "PUT", "PATCH", "DELETE"])
def api_not_found(rest: str):
    raise StarletteHTTPException(404)


# ---- Frontend (built by Vite into frontend/dist) -------------------------------
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/{path:path}", include_in_schema=False)
def spa(path: str):
    candidate = (DIST / path).resolve()
    if path and candidate.is_file() and DIST.resolve() in candidate.parents:
        return FileResponse(candidate)
    index = DIST / "index.html"
    if index.is_file():
        return FileResponse(index, headers={"Cache-Control": "no-cache"})
    return JSONResponse({"error": {"code": "FRONTEND_NOT_BUILT", "message": "frontend/dist 가 없습니다. npm run build 를 먼저 실행하세요."}}, status_code=503)
