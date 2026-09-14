from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.graph import Node, Edge
from typing import Any
from app.api.auth import verify_token

router = APIRouter()

@router.get("/", response_model=Any, dependencies=[Depends(verify_token)])
def get_graph(db: Session = Depends(get_db)):
    nodes = db.query(Node).all()
    edges = db.query(Edge).all()
    return {"nodes": nodes, "edges": edges}

@router.post("/", dependencies=[Depends(verify_token)])
def create_node(title: str, db: Session = Depends(get_db)):
    node = Node(title=title)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node

@router.post("/edge", dependencies=[Depends(verify_token)])
def create_edge(source_id: int, target_id: int, label: str = None, db: Session = Depends(get_db)):
    edge = Edge(source_id=source_id, target_id=target_id, label=label)
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return edge
