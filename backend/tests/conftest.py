import os
import tempfile

# Tests never touch the dev DB. CI may point TEST_DATABASE_URL at a throwaway PostgreSQL;
# otherwise a temp SQLite file is used.
os.environ.pop("DATABASE_URL", None)
if os.environ.get("TEST_DATABASE_URL"):
    os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
else:
    os.environ["SQLITE_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
os.environ["ADMIN_TOKEN"] = "test-admin"
