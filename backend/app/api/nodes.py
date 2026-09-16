from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Any, Optional, List, Dict
from app.db.database import get_db
from app.models.graph import Node, Edge
from app.api.auth import get_current_user

router = APIRouter()

class NodeCreate(BaseModel):
    title: str
    description: Optional[str] = None
    completed: Optional[bool] = False
    data: Optional[Dict[str, Any]] = None

class NodeUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    completed: Optional[bool] = None
    data: Optional[Dict[str, Any]] = None

class EdgeCreate(BaseModel):
    source_id: int
    target_id: int
    label: Optional[str] = None

class AIActionRequest(BaseModel):
    action: str = Field(..., description="'decompose', 'chat', 'schedule', or 'prioritize'")
    node_id: Optional[int] = None
    message: Optional[str] = None
    graph_context: Optional[Dict[str, Any]] = None

@router.get("/", response_model=List[Dict[str, Any]])
def get_nodes(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    nodes = db.query(Node).filter(Node.user_id == user_id).all()
    return [
        {
            "id": n.id,
            "title": n.title,
            "description": n.description,
            "completed": n.completed,
            "data": n.data or {},
            "user_id": n.user_id,
        }
        for n in nodes
    ]

@router.get("/graph/full")
def get_full_graph(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    nodes = db.query(Node).filter(Node.user_id == user_id).all()
    node_ids = {n.id for n in nodes}
    
    edges = db.query(Edge).join(Node, Node.id == Edge.source_id).filter(Node.user_id == user_id).all()
    
    return {
        "nodes": [
            {
                "id": n.id,
                "title": n.title,
                "description": n.description,
                "completed": n.completed,
                "data": n.data or {},
            }
            for n in nodes
        ],
        "edges": [
            {
                "id": e.id,
                "source_id": e.source_id,
                "target_id": e.target_id,
                "label": e.label,
            }
            for e in edges if e.target_id in node_ids
        ],
    }

@router.get("/{node_id}")
def get_node(node_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id, Node.user_id == user_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "completed": node.completed,
        "data": node.data or {},
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_node(node_in: NodeCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = Node(
        title=node_in.title,
        description=node_in.description,
        completed=node_in.completed or False,
        data=node_in.data or {},
        user_id=user_id,
    )
    db.add(node)
    db.commit()
    db.refresh(node)
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "completed": node.completed,
        "data": node.data or {},
    }

@router.patch("/{node_id}")
def update_node(node_id: int, update_in: NodeUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id, Node.user_id == user_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    if update_in.title is not None:
        node.title = update_in.title
    if update_in.description is not None:
        node.description = update_in.description
    if update_in.completed is not None:
        node.completed = update_in.completed
    if update_in.data is not None:
        current_data = dict(node.data or {})
        current_data.update(update_in.data)
        node.data = current_data

    db.commit()
    db.refresh(node)
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "completed": node.completed,
        "data": node.data or {},
    }

@router.delete("/{node_id}")
def delete_node(node_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id, Node.user_id == user_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")

    db.query(Edge).filter((Edge.source_id == node_id) | (Edge.target_id == node_id)).delete(
        synchronize_session=False
    )
    db.delete(node)
    db.commit()
    return {"message": f"Node {node_id} deleted successfully"}

@router.get("/edges/list")
def get_edges(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    edges = db.query(Edge).join(Node, Node.id == Edge.source_id).filter(Node.user_id == user_id).all()
    return [
        {
            "id": e.id,
            "source_id": e.source_id,
            "target_id": e.target_id,
            "label": e.label,
        }
        for e in edges
    ]

@router.post("/edges", status_code=status.HTTP_201_CREATED)
def create_edge(edge_in: EdgeCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    source = db.query(Node).filter(Node.id == edge_in.source_id, Node.user_id == user_id).first()
    target = db.query(Node).filter(Node.id == edge_in.target_id, Node.user_id == user_id).first()
    if not source or not target:
        raise HTTPException(status_code=400, detail="Source or target node does not exist or does not belong to user")

    edge = Edge(
        source_id=edge_in.source_id,
        target_id=edge_in.target_id,
        label=edge_in.label,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return {
        "id": edge.id,
        "source_id": edge.source_id,
        "target_id": edge.target_id,
        "label": edge.label,
    }

@router.delete("/edges/{edge_id}")
def delete_edge(edge_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    edge = db.query(Edge).join(Node, Node.id == Edge.source_id).filter(Edge.id == edge_id, Node.user_id == user_id).first()
    if not edge:
        raise HTTPException(status_code=404, detail=f"Edge {edge_id} not found")
    db.delete(edge)
    db.commit()
    return {"message": f"Edge {edge_id} deleted successfully"}

@router.post("/ai/action")
def handle_ai_action(req: AIActionRequest, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    if req.action == "decompose":
        node = None
        if req.node_id:
            node = db.query(Node).filter(Node.id == req.node_id, Node.user_id == user_id).first()
            if not node:
                raise HTTPException(status_code=404, detail="Node not found")
        title = node.title if node else (req.message or "Target Goal")

        subtasks_data = [
            {"title": f"Phase 1: Research & Scope {title}", "hours": 3, "step": 1},
            {"title": f"Phase 2: Core Implementation of {title}", "hours": 8, "step": 2},
            {"title": f"Phase 3: QA & Deployment for {title}", "hours": 4, "step": 3},
        ]
        created_subtasks = []
        prev_subtask_id = None
        for item in subtasks_data:
            st_node = Node(
                title=item["title"],
                description=f"Sequential step {item['step']} for '{title}'",
                completed=False,
                data={"estHours": item["hours"]},
                user_id=user_id,
            )
            db.add(st_node)
            db.commit()
            db.refresh(st_node)
            created_subtasks.append({
                "id": st_node.id,
                "title": st_node.title,
                "description": st_node.description,
                "data": st_node.data
            })
            if prev_subtask_id:
                edge = Edge(source_id=prev_subtask_id, target_id=st_node.id, label="next")
                db.add(edge)
                db.commit()
            prev_subtask_id = st_node.id
        
        reply = f"Decomposed '{title}' into {len(created_subtasks)} sequential steps and wired them up."
        return {"message": reply, "updates": {"nodes": created_subtasks}}

    elif req.action == "chat":
        reply = f"I am your Graph2Do AI. You said: {req.message}. I see you have a graph with {len(req.graph_context.get('nodes', []))} nodes."
        return {"message": reply}

    elif req.action == "schedule":
        reply = "Scheduling logic stubbed. I would move nodes sequentially and update their start/end dates in 'data'."
        return {"message": reply}

    elif req.action == "prioritize":
        reply = "Priority logic stubbed. I would label important paths in red."
        return {"message": reply}

    else:
        raise HTTPException(status_code=400, detail=f"Unknown AI action: {req.action}")
