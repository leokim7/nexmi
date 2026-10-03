"""Storage for the community features: share cards and the "AI vs 인간" board.

Only what the user chose to publish is stored. Diagnosis inputs are never saved.
DATABASE_URL (Railway PostgreSQL) in production; a local SQLite file otherwise.
"""
from __future__ import annotations

import logging
import os
import pathlib

from sqlalchemy import (
    JSON, Boolean, Column, DateTime, Integer, MetaData, String, Table, Text,
    UniqueConstraint, create_engine, func,
)

log = logging.getLogger("nexmi.db")


def _url() -> str:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        path = pathlib.Path(os.environ.get("SQLITE_PATH", pathlib.Path(__file__).resolve().parents[1] / "nexmi-local.db"))
        log.warning("DATABASE_URL not set; using SQLite at %s (not for production)", path)
        return f"sqlite:///{path}"
    # Railway gives postgres:// or postgresql:// — use the psycopg 3 driver.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


metadata = MetaData()

shares = Table(
    "shares", metadata,
    Column("id", String(24), primary_key=True),          # public token in the URL
    Column("delete_key_hash", String(64), nullable=False),
    Column("mode", String(16), nullable=False),
    Column("payload", JSON, nullable=False),              # server-built projection only
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
    Column("expires_at", DateTime(timezone=True), nullable=False),
    Column("revoked", Boolean, nullable=False, default=False),
)

posts = Table(
    "posts", metadata,                                    # AI vs 인간 게시판
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("side", String(8), nullable=False),            # ai | human
    Column("body", Text, nullable=False),
    Column("nickname", String(20)),
    Column("occupation_id", String(8), index=True),       # 선택: 내 직업 태그
    Column("author_hash", String(64), nullable=False),
    Column("likes", Integer, nullable=False, default=0),
    Column("reports", Integer, nullable=False, default=0),
    Column("hidden", Boolean, nullable=False, default=False),
    Column("created_at", DateTime(timezone=True), server_default=func.now(), nullable=False),
)

post_votes = Table(
    "post_votes", metadata,
    Column("post_id", Integer, nullable=False, index=True),
    Column("voter_hash", String(64), nullable=False),
    Column("kind", String(8), nullable=False),            # like | report
    UniqueConstraint("post_id", "voter_hash", "kind"),
)

engine = create_engine(_url(), pool_pre_ping=True, future=True)


def init_db() -> None:
    metadata.create_all(engine)


def backend_name() -> str:
    return engine.dialect.name
