from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.models.graph import Node
from typing import Any

from app.api.auth import get_current_user

router = APIRouter()

@router.get("/")
def get_nodes(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    return db.query(Node).filter(Node.user_id == user_id).all()

@router.post("/")
def create_node(title: str, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = Node(title=title, user_id=user_id)
    db.add(node)
    db.commit()
    db.refresh(node)
    return node
