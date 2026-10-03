"""Loads the two handoff engines unchanged from backend/model.

The engine files and their JSON data are copied verbatim from the v1.5 handoff
package. Do not edit coefficients here; changes require a model version release.
"""
from __future__ import annotations

import importlib.util
import json
import pathlib
import sys

MODEL_DIR = pathlib.Path(__file__).resolve().parent.parent / "model" / "student_career_v1_3"
WORKER_DIR = MODEL_DIR / "career_engine_v1_2"
STUDENT_DIR = MODEL_DIR / "student"


def _load_module(name: str, path: pathlib.Path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


worker = _load_module("worker_engine", WORKER_DIR / "engine.py")
sys.path.insert(0, str(STUDENT_DIR))
explorer = _load_module("student_engine", STUDENT_DIR / "student_engine.py")


def _read(path: pathlib.Path):
    return json.loads(path.read_text(encoding="utf-8"))


WORKER_CONFIG = worker.CONFIG
WORKER_TASKS = worker.TASKS
WORKER_PROFILES = worker.PROFILES
OCCUPATIONS = _read(WORKER_DIR / "occupations.json")
SOURCES = _read(WORKER_DIR / "sources.json")
CARDS = explorer.CARDS
ACTIVITIES = explorer.ACTIVITIES
AXES = explorer.AXES
CAPABILITIES = explorer.CAPS

WORKER_MODEL_VERSION = WORKER_CONFIG["model_version"]
EXPLORER_MODEL_VERSION = "1.5.0-explorer-seed"
PACKAGE_VERSION = "1.5"

OCCUPATION_IDS = {o["occupation_id"] for o in OCCUPATIONS}
TASKS_BY_OCCUPATION: dict[str, set[str]] = {}
for _t in WORKER_TASKS:
    TASKS_BY_OCCUPATION.setdefault(_t["occupation_id"], set()).add(_t["task_id"])
ACTIVITY_IDS = {a["activity_id"] for a in ACTIVITIES}
