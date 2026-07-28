"""Tiny JSON-file document store.

Emergent's original backend used a document database (Mongo-style). To keep
this reconstruction dependency-free and easy to own, collections are held in
memory and persisted to a single JSON file on every mutation. It is perfectly
fine for local dev, demos, and small production loads. To scale, swap this
module for Postgres/Mongo — the server only touches it through the helpers
below, so nothing else has to change.
"""

from __future__ import annotations

import json
import os
import threading
from typing import Any, Dict, List

_LOCK = threading.RLock()

DATA_DIR = os.environ.get("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
SEED_DIR = os.path.join(os.path.dirname(__file__), "seed")
DB_PATH = os.path.join(DATA_DIR, "db.json")

# Collections the app uses.
COLLECTIONS = [
    "cruises",
    "profiles",
    "deals",
    "messages",
    "dms",
    "confirmations",
    "elite_unlocks",
    "config",
]

_db: Dict[str, List[Dict[str, Any]]] = {}


def _seed() -> Dict[str, List[Dict[str, Any]]]:
    """Build the initial database from the harvested seed files."""

    def load(name: str, default: Any) -> Any:
        path = os.path.join(SEED_DIR, name)
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        return default

    booking_links = load("booking_links.json", {})
    return {
        "cruises": load("cruises.json", []),
        "profiles": load("profiles.json", []),
        "deals": load("deals.json", []),
        "messages": [],
        "dms": [],
        "confirmations": [],
        "elite_unlocks": [],
        # Single-row config collection (booking links, etc.).
        "config": [{"key": "booking_links", "value": booking_links}],
    }


def load_db() -> None:
    global _db
    with _LOCK:
        os.makedirs(DATA_DIR, exist_ok=True)
        if os.path.exists(DB_PATH):
            with open(DB_PATH, "r", encoding="utf-8") as f:
                _db = json.load(f)
            for c in COLLECTIONS:
                _db.setdefault(c, [])
        else:
            _db = _seed()
            save_db()


def save_db() -> None:
    with _LOCK:
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = DB_PATH + ".tmp"
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(_db, f, indent=2, default=str)
        os.replace(tmp, DB_PATH)


def col(name: str) -> List[Dict[str, Any]]:
    with _LOCK:
        return _db.setdefault(name, [])


def find(name: str, **filters: Any) -> List[Dict[str, Any]]:
    with _LOCK:
        rows = _db.get(name, [])
        if not filters:
            return list(rows)
        return [r for r in rows if all(r.get(k) == v for k, v in filters.items())]


def find_one(name: str, **filters: Any) -> Dict[str, Any] | None:
    rows = find(name, **filters)
    return rows[0] if rows else None


def insert(name: str, doc: Dict[str, Any]) -> Dict[str, Any]:
    with _LOCK:
        _db.setdefault(name, []).append(doc)
        save_db()
        return doc


def update_one(name: str, match: Dict[str, Any], changes: Dict[str, Any]) -> Dict[str, Any] | None:
    with _LOCK:
        for r in _db.get(name, []):
            if all(r.get(k) == v for k, v in match.items()):
                r.update(changes)
                save_db()
                return r
        return None


def delete(name: str, **filters: Any) -> int:
    with _LOCK:
        rows = _db.get(name, [])
        keep = [r for r in rows if not all(r.get(k) == v for k, v in filters.items())]
        removed = len(rows) - len(keep)
        _db[name] = keep
        if removed:
            save_db()
        return removed


def get_config(key: str, default: Any = None) -> Any:
    row = find_one("config", key=key)
    return row["value"] if row else default


def set_config(key: str, value: Any) -> None:
    with _LOCK:
        row = find_one("config", key=key)
        if row:
            row["value"] = value
        else:
            _db.setdefault("config", []).append({"key": key, "value": value})
        save_db()
