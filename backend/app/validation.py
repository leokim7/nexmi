"""Request validation in front of the engines.

The engines already reject bad input, but with English one-line messages. This
layer returns per-field Korean messages (API_DATA_CONTRACT: field_errors) so the
UI can show errors next to the input. It never changes values.
"""
from __future__ import annotations

import math
from typing import Any

from . import engines

CAREER_LEVELS = ("junior", "mid", "senior")
PERSONAL_KEYS = (
    "ai_fluency",
    "domain_expertise",
    "problem_definition",
    "learning_velocity",
    "cross_functional",
    "decision_authority",
)
STAGES = ("middle", "high", "university", "jobseeker")
# Collected for context only; the engines do not use them in any score.
WORKER_COLLECT_ONLY = ("company_size", "industry")
EXPLORER_COLLECT_ONLY = ("learning_preference", "values")
MAX_TEXT = 3000
MAX_EXPERIENCES = 20
MAX_EXPERIENCE_LEN = 300


class InputError(Exception):
    def __init__(self, field_errors: dict[str, str]):
        super().__init__("입력을 확인해주세요.")
        self.field_errors = field_errors


def _is_number(v: Any) -> bool:
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def _check_score(errors: dict[str, str], field: str, v: Any, lo: float = 0, hi: float = 100) -> None:
    if not _is_number(v) or not lo <= v <= hi:
        errors[field] = f"{lo:g}–{hi:g} 사이의 숫자여야 해요."


def validate_worker(p: Any) -> None:
    if not isinstance(p, dict):
        raise InputError({"_": "입력 형식이 올바르지 않아요."})
    errors: dict[str, str] = {}
    allowed = {"occupation_id", "career_level", "task_weights", "ai_maturity", "market_demand", *PERSONAL_KEYS, *WORKER_COLLECT_ONLY}
    for k in set(p) - allowed:
        errors[k] = "알 수 없는 항목이에요."

    occ = p.get("occupation_id")
    if occ not in engines.OCCUPATION_IDS:
        errors["occupation_id"] = "직군을 선택해주세요."
    if p.get("career_level") not in CAREER_LEVELS:
        errors["career_level"] = "역할 수준을 선택해주세요."
    if p.get("ai_maturity") not in engines.WORKER_CONFIG["adoption_levels"]:
        errors["ai_maturity"] = "회사의 AI 도입 단계를 선택해주세요."
    for k in PERSONAL_KEYS:
        if k not in p or p[k] is None:
            errors[k] = "응답해주세요."
        else:
            _check_score(errors, k, p[k])
    if p.get("market_demand") is not None:
        _check_score(errors, "market_demand", p["market_demand"], -100, 100)
    for k in WORKER_COLLECT_ONLY:
        if p.get(k) is not None and (not isinstance(p[k], str) or len(p[k]) > 100):
            errors[k] = "100자 이내 텍스트여야 해요."

    weights = p.get("task_weights")
    if not isinstance(weights, dict) or not weights:
        errors["task_weights"] = "업무 비중을 입력해주세요."
    elif occ in engines.OCCUPATION_IDS:
        valid = engines.TASKS_BY_OCCUPATION[occ]
        if set(weights) - valid:
            errors["task_weights"] = "선택한 직군에 없는 업무가 포함돼 있어요."
        elif not all(_is_number(v) and 0 <= v <= 1 for v in weights.values()):
            errors["task_weights"] = "각 업무 비중은 0–100% 사이여야 해요."
        elif abs(sum(weights.values()) - 1) > 1e-6:
            errors["task_weights"] = f"업무 비중 합계가 100%여야 해요. (현재 {sum(weights.values()) * 100:.1f}%)"
    if errors:
        raise InputError(errors)


def validate_explorer(p: Any) -> None:
    if not isinstance(p, dict):
        raise InputError({"_": "입력 형식이 올바르지 않아요."})
    errors: dict[str, str] = {}
    allowed = {"stage", "interests", "skills", "weekly_minutes", "experiences", "favorite_occupations", "activity_results", *EXPLORER_COLLECT_ONLY}
    for k in set(p) - allowed:
        errors[k] = "알 수 없는 항목이에요."

    if p.get("stage") not in STAGES:
        errors["stage"] = "학습 단계를 선택해주세요."

    for field, keys in (("interests", set(engines.AXES)), ("skills", set(engines.CAPABILITIES))):
        block = p.get(field, {})
        if not isinstance(block, dict):
            errors[field] = "형식이 올바르지 않아요."
            continue
        for k, v in block.items():
            if k not in keys:
                errors[f"{field}.{k}"] = "알 수 없는 항목이에요."
            elif v is not None:
                _check_score(errors, f"{field}.{k}", v)

    minutes = p.get("weekly_minutes")
    if isinstance(minutes, bool) or not isinstance(minutes, int) or not 1 <= minutes <= 10080:
        errors["weekly_minutes"] = "주당 시간은 1분–168시간 사이 정수(분)여야 해요."

    exp = p.get("experiences", [])
    if not isinstance(exp, list) or len(exp) > MAX_EXPERIENCES or not all(isinstance(x, str) and len(x) <= MAX_EXPERIENCE_LEN for x in exp):
        errors["experiences"] = f"경험은 {MAX_EXPERIENCES}개까지, 각 {MAX_EXPERIENCE_LEN}자 이내로 적어주세요."

    fav = p.get("favorite_occupations", [])
    if not isinstance(fav, list) or not all(isinstance(x, str) and x in engines.OCCUPATION_IDS for x in fav) or len(set(fav)) != len(fav):
        errors["favorite_occupations"] = "관심 직군 목록이 올바르지 않아요."

    results = p.get("activity_results", [])
    if not isinstance(results, list):
        errors["activity_results"] = "형식이 올바르지 않아요."
    else:
        seen: set[str] = set()
        for i, r in enumerate(results):
            key = f"activity_results.{i}"
            if not isinstance(r, dict) or r.get("activity_id") not in engines.ACTIVITY_IDS:
                errors[key] = "알 수 없는 체험이에요."
                continue
            if r["activity_id"] in seen:
                errors[key] = "같은 체험 결과가 중복됐어요."
            seen.add(r["activity_id"])
            if not isinstance(r.get("completed"), bool):
                errors[key] = "완료 여부가 필요해요."
            for k in ("enjoyment", "repeat_interest"):
                if r.get(k) is not None:
                    _check_score(errors, f"{key}.{k}", r[k])
            if r.get("reflection") is not None and (not isinstance(r["reflection"], str) or len(r["reflection"]) > MAX_TEXT):
                errors[f"{key}.reflection"] = f"{MAX_TEXT}자 이내로 적어주세요."

    if p.get("learning_preference") is not None and p["learning_preference"] not in ("read", "make", "discuss", "observe"):
        errors["learning_preference"] = "알 수 없는 학습 방식이에요."
    vals = p.get("values")
    if vals is not None and (not isinstance(vals, list) or not all(isinstance(x, str) and len(x) <= 100 for x in vals) or len(vals) > 20):
        errors["values"] = "가치관 항목이 올바르지 않아요."
    if errors:
        raise InputError(errors)
