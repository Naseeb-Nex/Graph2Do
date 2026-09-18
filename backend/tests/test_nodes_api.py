import pytest
from app.api.auth import get_current_user
from app.db.database import Base, get_db
from app.main import app
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine
)


def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


def override_get_current_user():
    return {"sub": "test_user_id"}


app.dependency_overrides[get_db] = override_get_db
app.dependency_overrides[get_current_user] = override_get_current_user


@pytest.fixture(autouse=True)
def setup_db():
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_current_user] = override_get_current_user
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    # Don.t clear since others rely on it (setting overrides any clear)


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
        json={
            "title": "Launch Project Alpha",
            "description": "Core release",
            "completed": False,
            "data": {"node_type": "project"},
        },
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

    # Verify node has user_id from auth
    assert single_resp.json()["user_id"] == "test_user_id"


def test_update_and_delete_node():
    create_resp = client.post(
        "/nodes/",
        json={"title": "Task 1", "description": "Initial description"},
        headers=AUTH_HEADERS,
    )
    assert create_resp.status_code == 201
    node_id = create_resp.json()["id"]

    # Update node
    patch_resp = client.patch(
        f"/nodes/{node_id}",
        json={"title": "Task 1 Updated", "completed": True},
        headers=AUTH_HEADERS,
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["title"] == "Task 1 Updated"
    assert patch_resp.json()["completed"] is True

    # Delete node
    del_resp = client.delete(f"/nodes/{node_id}", headers=AUTH_HEADERS)
    assert del_resp.status_code == 204

    # Verify deleted
    get_resp = client.get(f"/nodes/{node_id}", headers=AUTH_HEADERS)
    assert get_resp.status_code == 404


def test_edges_and_full_graph():
    # Create 2 nodes
    n1 = client.post(
        "/nodes/", json={"title": "Node 1"}, headers=AUTH_HEADERS
    ).json()
    n2 = client.post(
        "/nodes/", json={"title": "Node 2"}, headers=AUTH_HEADERS
    ).json()

    # Create edge
    edge_resp = client.post(
        "/nodes/edges",
        json={
            "source_id": n1["id"],
            "target_id": n2["id"],
            "label": "depends_on",
        },
        headers=AUTH_HEADERS,
    )
    assert edge_resp.status_code == 201
    assert edge_resp.json()["source_id"] == n1["id"]

    # Fetch full graph
    full_resp = client.get("/nodes/graph/full", headers=AUTH_HEADERS)
    assert full_resp.status_code == 200
    data = full_resp.json()
    assert len(data["nodes"]) == 2
    assert len(data["edges"]) == 1


def test_ai_action_decomposition():
    n1 = client.post(
        "/nodes/", json={"title": "Big Feature"}, headers=AUTH_HEADERS
    ).json()

    ai_resp = client.post(
        "/nodes/ai-action",
        json={"action": "decompose", "node_id": n1["id"]},
        headers=AUTH_HEADERS,
    )
    assert ai_resp.status_code == 200
    res = ai_resp.json()
    assert res["action"] == "decompose"
    assert len(res["created_nodes"]) == 3


def test_ai_action_decompose_layout():
    # Setup test node
    create_resp = client.post(
        "/nodes/",
        json={
            "title": "Root Task",
            "description": "",
            "completed": False,
            "data": {"position": {"x": 500, "y": 500}},
        },
        headers=AUTH_HEADERS,
    )
    assert create_resp.status_code == 201
    node_id = create_resp.json()["id"]

    # Run decompose action
    ai_resp = client.post(
        "/nodes/ai-action",
        json={"action": "decompose", "node_id": node_id},
        headers=AUTH_HEADERS,
    )
    assert ai_resp.status_code == 200

    # Check that created nodes have positions and no collisions
    created_nodes = ai_resp.json()["created_nodes"]
    assert len(created_nodes) == 3

    positions = []
    for comp in created_nodes:
        # Re-fetch from DB to check full data or check if returned securely
        # AI endpoint returns light node dict, so let.s hit GET /nodes
        pass

    get_resp = client.get("/nodes/", headers=AUTH_HEADERS)
    nodes = get_resp.json()
    new_nodes = [
        n
        for n in nodes
        if n["title"].startswith(("Research:", "Implement:", "Test & Verify:"))
        and n["id"] != node_id
    ]

    for n in new_nodes:
        pos = n.get("data", {}).get("position")
        assert pos is not None
        positions.append((pos["x"], pos["y"]))

    assert len(set(positions)) == 3
    # Check they do not overlap with parent
    assert (500, 500) not in positions


def test_bulk_node_generation_layout():
    nodes_payload = [
        {"title": "Bulk 1", "data": {}},
        {"title": "Bulk 2", "data": {}},
    ]
    resp = client.post("/nodes/bulk", json=nodes_payload, headers=AUTH_HEADERS)
    assert resp.status_code == 201
    created = resp.json()
    assert len(created) == 2

    pos1 = created[0]["data"]["position"]
    pos2 = created[1]["data"]["position"]
    assert pos1 is not None and pos2 is not None
    assert pos1 != pos2


def test_graph_import_layout():
    # First create a graph
    resp = client.post(
        "/graphs/", json={"name": "Import Target"}, headers=AUTH_HEADERS
    )
    assert resp.status_code == 201
    graph_id = resp.json()["id"]

    import_payload = {
        "nodes": [
            {"id": "temp1", "title": "Imp 1", "data": {}},
            {"id": "temp2", "title": "Imp 2", "data": {}},
        ],
        "edges": [
            {"source_id": "temp1", "target_id": "temp2", "label": "deps"}
        ],
    }

    resp = client.post(
        f"/graphs/{graph_id}/import", json=import_payload, headers=AUTH_HEADERS
    )
    assert resp.status_code == 201
    data = resp.json()
    assert "Imported 2 nodes" in data["message"]

    nodes = data["nodes"]
    assert nodes[0]["data"]["position"] != nodes[1]["data"]["position"]
