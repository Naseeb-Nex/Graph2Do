from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.graph import Edge, Graph, GraphMember, Node

router = APIRouter()

class GraphCreate(BaseModel):
    name: str

class GraphUpdate(BaseModel):
    name: Optional[str] = None

def check_graph_access(db: Session, graph_id: int, user_id: str) -> Graph:
    graph = db.query(Graph).filter(Graph.id == graph_id).first()
    if not graph:
        raise HTTPException(status_code=404, detail=f"Graph {graph_id} not found")
    if graph.owner_id == user_id:
        return graph
    member = db.query(GraphMember).filter(
        GraphMember.graph_id == graph_id,
        GraphMember.user_id == user_id
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Graph not found or access denied")
    return graph

def get_user_graph_ids(db: Session, user_id: str) -> List[int]:
    owner_graphs = db.query(Graph.id).filter(Graph.owner_id == user_id).all()
    member_graphs = db.query(GraphMember.graph_id).filter(GraphMember.user_id == user_id).all()
    g_ids = set([g[0] for g in owner_graphs] + [m[0] for m in member_graphs])
    return list(g_ids)

@router.get("/", response_model=List[Dict[str, Any]])
def list_graphs(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    g_ids = get_user_graph_ids(db, user_id)
    if not g_ids:
        default_graph = Graph(name="My Knowledge Graph", owner_id=user_id)
        db.add(default_graph)
        db.commit()
        db.refresh(default_graph)
        member = GraphMember(graph_id=default_graph.id, user_id=user_id, role="owner")
        db.add(member)
        db.commit()
        return [{"id": default_graph.id, "name": default_graph.name, "owner_id": default_graph.owner_id}]
    graphs = db.query(Graph).filter(Graph.id.in_(g_ids)).all()
    return [{"id": g.id, "name": g.name, "owner_id": g.owner_id} for g in graphs]

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_graph(graph_in: GraphCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph = Graph(name=graph_in.name, owner_id=user_id)
    db.add(graph)
    db.commit()
    db.refresh(graph)
    member = GraphMember(graph_id=graph.id, user_id=user_id, role="owner")
    db.add(member)
    db.commit()
    return {"id": graph.id, "name": graph.name, "owner_id": graph.owner_id}

@router.get("/{graph_id}")
def get_graph(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph = check_graph_access(db, graph_id, user_id)
    return {"id": graph.id, "name": graph.name, "owner_id": graph.owner_id}

@router.delete("/{graph_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_graph(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph = check_graph_access(db, graph_id, user_id)
    if graph.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Only the owner can delete this graph")
    db.query(Edge).filter(Edge.graph_id == graph_id).delete()
    db.query(Node).filter(Node.graph_id == graph_id).delete()
    db.query(GraphMember).filter(GraphMember.graph_id == graph_id).delete()
    db.delete(graph)
    db.commit()

@router.get("/{graph_id}/nodes")
def get_graph_nodes(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    check_graph_access(db, graph_id, user_id)
    nodes = db.query(Node).filter(Node.graph_id == graph_id).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "description": n.description,
            "completed": n.completed,
            "data": n.data or {},
            "user_id": n.user_id,
            "graph_id": n.graph_id,
        }
        for n in nodes
    ]

@router.get("/{graph_id}/edges")
def get_graph_edges(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    check_graph_access(db, graph_id, user_id)
    edges = db.query(Edge).filter(Edge.graph_id == graph_id).all()
    return [
        {
            "id": e.id,
            "source_id": e.source_id,
            "target_id": e.target_id,
            "label": e.label,
            "graph_id": e.graph_id,
        }
        for e in edges
    ]

@router.get("/{graph_id}/full")
def get_graph_full(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    check_graph_access(db, graph_id, user_id)
    nodes = db.query(Node).filter(Node.graph_id == graph_id).all()
    edges = db.query(Edge).filter(Edge.graph_id == graph_id).all()
    node_ids = {n.id for n in nodes}
    return {
        "nodes": [
            {
                "id": n.id,
                "title": n.title,
                "description": n.description,
                "completed": n.completed,
                "data": n.data or {},
                "graph_id": n.graph_id,
                "user_id": n.user_id,
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source_id": e.source_id,
                "target_id": e.target_id,
                "label": e.label,
                "graph_id": e.graph_id,
            }
            for e in edges if e.source_id in node_ids and e.target_id in node_ids
        ],
    }

@router.get("/{graph_id}/settings")
def get_graph_settings(graph_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph = check_graph_access(db, graph_id, user_id)
    members = db.query(GraphMember).filter(GraphMember.graph_id == graph_id).all()
    return {
        "id": graph.id,
        "name": graph.name,
        "owner_id": graph.owner_id,
        "members": [{"user_id": m.user_id, "role": m.role} for m in members],
    }

@router.patch("/{graph_id}/settings")
def update_graph_settings(graph_id: int, updates: GraphUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph = check_graph_access(db, graph_id, user_id)
    if updates.name:
        graph.name = updates.name
        db.commit()
        db.refresh(graph)
    return {"id": graph.id, "name": graph.name, "owner_id": graph.owner_id}

@router.post("/{graph_id}/copilot")
def graph_copilot_action(graph_id: int, req: Dict[str, Any], db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    check_graph_access(db, graph_id, user_id)
    nodes = db.query(Node).filter(Node.graph_id == graph_id).all()
    edges = db.query(Edge).filter(Edge.graph_id == graph_id).all()
    action = req.get("action", "chat")
    message = req.get("message", "Help me organize this graph.")
    return {
        "graph_id": graph_id,
        "action": action,
        "indexed_nodes_count": len(nodes),
        "indexed_edges_count": len(edges),
        "reply": f"AI Copilot indexed graph #{graph_id} ({len(nodes)} nodes, {len(edges)} edges). Message: '{message}'",
    }
