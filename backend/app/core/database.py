import sqlite3
from pathlib import Path

from .config import settings


def get_db() -> sqlite3.Connection:
    db_path = Path(settings.DB_PATH)
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    # WAL mode allows concurrent readers alongside writers; busy_timeout retries
    # instead of immediately raising "database is locked" under write contention.
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


def init_db() -> None:
    conn = get_db()
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS annotations (
            job_id      TEXT    NOT NULL,
            item_id     TEXT    NOT NULL,
            values_json TEXT    NOT NULL,
            updated_at  TEXT    NOT NULL,
            PRIMARY KEY (job_id, item_id)
        )
        """
    )
    conn.commit()
    conn.close()
