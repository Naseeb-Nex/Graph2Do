from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.graph import Node, Edge
from typing import Any

router = APIRouter()

# Note: Add Auth dependency when frontend holds JWT bearer auth

@router.get("/", response_model=Any)
def get_nodes(db: Session = Depends(get_db)):
    return db.query(Node).all()

@router.post("/")
def create_node(title: str, db: Session = Depends(get_db)):
    node = Node(title=title)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node
