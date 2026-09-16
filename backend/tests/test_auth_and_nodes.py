"""Tests for auth guards (audience verification) and node isolation."""

from unittest.mock import MagicMock, patch

import pytest
from app.api.auth import get_current_user
from app.db.database import Base, get_db
from app.main import app
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from starlette.testclient import TestClient

# In-memory SQLite for node isolation tests
engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSession = sessionmaker(bind=engine)


def override_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


# Dependency override that injects a specific user payload
def make_user_override(sub: str):
    def override():
        return {"sub": sub}

    return override


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture()
def client():
    app.dependency_overrides[get_db] = override_db
    yield TestClient(app)
    app.dependency_overrides.clear()


class TestAudienceVerification:
    """Verify that jwt.decode is called with the correct audience parameter."""

    @patch("app.api.auth.jwks_client")
    def test_valid_audience_accepted(self, mock_jwks):
        """A token with the correct audience claim is accepted."""
        mock_key = MagicMock()
        mock_jwks.get_signing_key_from_jwt.return_value = mock_key

        with patch("app.api.auth.jwt.decode") as mock_decode:
            mock_decode.return_value = {"sub": "user_123"}
            from app.api.auth import get_current_user
            from app.core.config import settings

            creds = MagicMock()
            creds.credentials = "valid.token.here"
            result = get_current_user(creds)

            # Verify audience is passed to jwt.decode
            mock_decode.assert_called_once_with(
                "valid.token.here",
                mock_key.key,
                algorithms=["RS256"],
                audience=settings.kinde_client_id,
            )
            assert result == {"sub": "user_123"}

    @patch("app.api.auth.jwks_client")
    def test_wrong_audience_rejected(self, mock_jwks):
        """A token with wrong audience raises 401 via jwt.decode audience check."""
        import jwt as pyjwt

        mock_key = MagicMock()
        mock_jwks.get_signing_key_from_jwt.return_value = mock_key

        with patch("app.api.auth.jwt.decode") as mock_decode:
            mock_decode.side_effect = pyjwt.InvalidAudienceError("Invalid audience")

            from app.api.auth import get_current_user
            from fastapi import HTTPException

            creds = MagicMock()
            creds.credentials = "wrong.audience.token"

            with pytest.raises(HTTPException) as exc_info:
                get_current_user(creds)
            assert exc_info.value.status_code == 401


class TestNodeIsolation:
    """Verify nodes are scoped to the authenticated user."""

    def test_user_only_sees_own_nodes(self, client):
        """User A cannot see nodes created by User B."""
        # Create nodes as user_a
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        client.post("/nodes/?title=A_task_1")
        client.post("/nodes/?title=A_task_2")

        # Create node as user_b
        app.dependency_overrides[get_current_user] = make_user_override("user_b")
        client.post("/nodes/?title=B_task_1")

        # user_b should only see their own node
        resp = client.get("/nodes/")
        assert resp.status_code == 200
        titles = [n["title"] for n in resp.json()]
        assert titles == ["B_task_1"]

        # Switch back to user_a - should only see their own
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        resp = client.get("/nodes/")
        assert resp.status_code == 200
        titles = [n["title"] for n in resp.json()]
        assert sorted(titles) == ["A_task_1", "A_task_2"]

    def test_created_node_has_user_id(self, client):
        """Created node is stamped with the authenticated user's sub."""
        app.dependency_overrides[get_current_user] = make_user_override("user_xyz")
        resp = client.post("/nodes/?title=my_task")
        assert resp.status_code == 200
        assert resp.json()["user_id"] == "user_xyz"


class TestLogoutEndpoint:
    """Verify the /auth/logout route exists and redirects to Kinde logout."""

    @patch("app.api.auth.kinde_client")
    def test_logout_redirects(self, mock_kinde):
        """GET /auth/logout returns a redirect to the Kinde logout URL."""
        mock_kinde.logout.return_value = "https://dummy.kinde.com/logout"
        c = TestClient(app, follow_redirects=False)
        resp = c.get("/auth/logout")
        assert resp.status_code in (302, 307)
        assert "dummy.kinde.com/logout" in resp.headers["location"]
