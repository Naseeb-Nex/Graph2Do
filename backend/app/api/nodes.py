from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.graph import Node, Edge
from typing import Any

from app.api.auth import verify_token

router = APIRouter()

@router.get("/", response_model=Any, dependencies=[Depends(verify_token)])
def get_nodes(db: Session = Depends(get_db)):
    return db.query(Node).all()

@router.post("/", dependencies=[Depends(verify_token)])
def create_node(title: str, db: Session = Depends(get_db)):
    node = Node(title=title)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node
