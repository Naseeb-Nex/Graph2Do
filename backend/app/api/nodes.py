from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.graph import Node, Edge
from typing import Any

def require_auth():
    # Placeholder for JWT verification; keeps boundary explicit
    return True

router = APIRouter()

@router.get("/", response_model=Any, dependencies=[Depends(require_auth)])
def get_nodes(db: Session = Depends(get_db)):
    return db.query(Node).all()

@router.post("/", dependencies=[Depends(require_auth)])
def create_node(title: str, db: Session = Depends(get_db)):
    node = Node(title=title)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node
