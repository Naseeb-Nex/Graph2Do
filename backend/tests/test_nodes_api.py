import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.database import Base, get_db
from app.models.graph import Node, Edge

# In-memory SQLite for fast, isolated testing
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

app.dependency_overrides[get_db] = override_get_db

@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)
AUTH_HEADERS = {"Authorization": "Bearer test-token"}

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert "Graph2Do" in response.json()["message"]

def test_create_and_get_nodes():
    # Create node
    create_resp = client.post(
        "/nodes/",
        json={"title": "Launch Project Alpha", "description": "Core release", "completed": False, "data": {"node_type": "project"}},
        headers=AUTH_HEADERS,
    )
    assert create_resp.status_code == 201
    node_data = create_resp.json()
    assert node_data["title"] == "Launch Project Alpha"
    node_id = node_data["id"]

    # Get nodes
    get_resp = client.get("/nodes/", headers=AUTH_HEADERS)
    assert get_resp.status_code == 200
    nodes = get_resp.json()
    assert len(nodes) == 1
    assert nodes[0]["id"] == node_id

    # Get single node
    single_resp = client.get(f"/nodes/{node_id}", headers=AUTH_HEADERS)
    assert single_resp.status_code == 200
    assert single_resp.json()["title"] == "Launch Project Alpha"

def test_update_and_delete_node():
    create_resp = client.post(
        "/nodes/",
        json={"title": "Initial Title", "completed": False},
        headers=AUTH_HEADERS,
    )
    node_id = create_resp.json()["id"]

    # Patch node
    patch_resp = client.patch(
        f"/nodes/{node_id}",
        json={"title": "Updated Title", "completed": True},
        headers=AUTH_HEADERS,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Updated Title"
    assert patch_resp.json()["completed"] is True

    # Delete node
    del_resp = client.delete(f"/nodes/{node_id}", headers=AUTH_HEADERS)
    assert del_resp.status_code == 200

    # Verify not found
    get_resp = client.get(f"/nodes/{node_id}", headers=AUTH_HEADERS)
    assert get_resp.status_code == 404

def test_edges_and_full_graph():
    n1 = client.post("/nodes/", json={"title": "Step 1"}, headers=AUTH_HEADERS).json()
    n2 = client.post("/nodes/", json={"title": "Step 2"}, headers=AUTH_HEADERS).json()

    edge_resp = client.post(
        "/nodes/edges",
        json={"source_id": n1["id"], "target_id": n2["id"], "label": "sequence"},
        headers=AUTH_HEADERS,
    )
    assert edge_resp.status_code == 201
    edge_id = edge_resp.json()["id"]

    graph_resp = client.get("/nodes/graph/full", headers=AUTH_HEADERS)
    assert graph_resp.status_code == 200
    graph_data = graph_resp.json()
    assert len(graph_data["nodes"]) == 2
    assert len(graph_data["edges"]) == 1

    del_edge = client.delete(f"/nodes/edges/{edge_id}", headers=AUTH_HEADERS)
    assert del_edge.status_code == 200

def test_ai_action_decomposition():
    parent = client.post("/nodes/", json={"title": "Design System"}, headers=AUTH_HEADERS).json()
    ai_resp = client.post(
        "/nodes/ai/action",
        json={"action": "decompose", "node_id": parent["id"]},
        headers=AUTH_HEADERS,
    )
    assert ai_resp.status_code == 200
    ai_data = ai_resp.json()
    assert "Decomposed" in ai_data["message"]
    assert len(ai_data["created_nodes"]) == 3
