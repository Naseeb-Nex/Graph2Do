"""Tests for auth guards, tenant isolation, and HTTP 403 cross-tenant enforcement."""

from unittest.mock import MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.api.auth import get_current_user
from app.models.graph import Graph, GraphMember

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
        mock_key = MagicMock()
        mock_jwks.get_signing_key_from_jwt.return_value = mock_key

        with patch("app.api.auth.jwt.decode") as mock_decode:
            mock_decode.return_value = {"sub": "user_123"}
            from app.api.auth import get_current_user
            from app.core.config import settings

            creds = MagicMock()
            creds.credentials = "valid.token.here"
            result = get_current_user(creds)

            mock_decode.assert_called_once_with(
                "valid.token.here",
                mock_key.key,
                algorithms=["RS256"],
                audience=settings.kinde_client_id,
            )
            assert result == {"sub": "user_123"}

    @patch("app.api.auth.jwks_client")
    def test_wrong_audience_rejected(self, mock_jwks):
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
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        client.post("/nodes/", json={"title": "A_task_1"})
        client.post("/nodes/", json={"title": "A_task_2"})

        app.dependency_overrides[get_current_user] = make_user_override("user_b")
        client.post("/nodes/", json={"title": "B_task_1"})

        # user_b should only see their own node
        resp = client.get("/nodes/")
        assert resp.status_code == 200
        titles = [n["title"] for n in resp.json()]
        assert titles == ["B_task_1"]

        # Switch back to user_a
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        resp = client.get("/nodes/")
        assert resp.status_code == 200
        titles = [n["title"] for n in resp.json()]
        assert sorted(titles) == ["A_task_1", "A_task_2"]

    def test_created_node_has_user_id(self, client):
        app.dependency_overrides[get_current_user] = make_user_override("user_xyz")
        resp = client.post("/nodes/", json={"title": "my_task"})
        assert resp.status_code in (200, 201)
        assert resp.json()["user_id"] == "user_xyz"

class TestLogoutEndpoint:
    """Verify logout redirect endpoint."""

    @patch("app.api.auth.kinde_client")
    def test_logout_redirects(self, mock_kinde, client):
        mock_kinde.logout.return_value = "https://example.kinde.com/logout"
        resp = client.get("/auth/logout", follow_redirects=False)
        assert resp.status_code == 307
        assert resp.headers["location"] == "https://example.kinde.com/logout"

class TestCrossTenantEnforcement:
    """Verify 403 Forbidden enforcement on cross-tenant access."""

    def test_cross_tenant_node_access_denied(self, client):
        # User A creates a graph and node
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        node_a = client.post("/nodes/", json={"title": "User A Secret Node"}).json()
        node_id_a = node_a["id"]

        # User B attempts to access, modify, or delete User A's node -> 403
        app.dependency_overrides[get_current_user] = make_user_override("user_b")
        
        get_resp = client.get(f"/nodes/{node_id_a}")
        assert get_resp.status_code == 403

        patch_resp = client.patch(f"/nodes/{node_id_a}", json={"title": "Hacked Title"})
        assert patch_resp.status_code == 403

        del_resp = client.delete(f"/nodes/{node_id_a}")
        assert del_resp.status_code == 403

    def test_cross_tenant_graph_access_denied(self, client):
        # User A creates a graph
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        graph_a = client.post("/graphs/", json={"name": "User A Private Graph"}).json()
        graph_id_a = graph_a["id"]

        # User B attempts to get or delete User A's graph -> 403
        app.dependency_overrides[get_current_user] = make_user_override("user_b")
        
        get_graph_resp = client.get(f"/graphs/{graph_id_a}")
        assert get_graph_resp.status_code == 403

        get_nodes_resp = client.get(f"/graphs/{graph_id_a}/nodes")
        assert get_nodes_resp.status_code == 403

        get_full_resp = client.get(f"/graphs/{graph_id_a}/full")
        assert get_full_resp.status_code == 403

        del_graph_resp = client.delete(f"/graphs/{graph_id_a}")
        assert del_graph_resp.status_code == 403

        # User B attempts to create node inside User A's graph -> 403
        post_node_resp = client.post("/nodes/", json={"title": "Unauthorized Node", "graph_id": graph_id_a})
        assert post_node_resp.status_code == 403

    def test_invited_member_can_access_graph(self, client):
        # User A creates a graph
        app.dependency_overrides[get_current_user] = make_user_override("user_a")
        graph_a = client.post("/graphs/", json={"name": "Shared Graph"}).json()
        graph_id_a = graph_a["id"]

        # Manually invite User B as GraphMember
        db = TestingSession()
        member = GraphMember(graph_id=graph_id_a, user_id="user_b", role="editor")
        db.add(member)
        db.commit()
        db.close()

        # User B can now access User A's graph
        app.dependency_overrides[get_current_user] = make_user_override("user_b")
        get_graph_resp = client.get(f"/graphs/{graph_id_a}")
        assert get_graph_resp.status_code == 200
        assert get_graph_resp.json()["name"] == "Shared Graph"
