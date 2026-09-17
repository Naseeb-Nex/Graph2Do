from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.auth import get_current_user
from app.db.database import get_db
from app.models.graph import Edge, Graph, GraphMember, Node
from app.core.layout import assign_positions

router = APIRouter()

class NodeCreate(BaseModel):
    title: str
    description: str | None = None
    completed: bool | None = False
    data: dict[str, Any] | None = None
    graph_id: int | None = None

class NodeUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    completed: bool | None = None
    data: dict[str, Any] | None = None

class EdgeCreate(BaseModel):
    source_id: int
    target_id: int
    label: str | None = None
    graph_id: int | None = None

class AIActionRequest(BaseModel):
    action: str = Field(..., description="'decompose', 'chat', 'schedule', or 'prioritize'")
    node_id: int | None = None
    message: str | None = None
    graph_context: dict[str, Any] | None = None

def get_or_create_default_graph(db: Session, user_id: str) -> Graph:
    member = db.query(GraphMember).filter(GraphMember.user_id == user_id).first()
    if member:
        graph = db.query(Graph).filter(Graph.id == member.graph_id).first()
        if graph:
            return graph
    graph = db.query(Graph).filter(Graph.owner_id == user_id).first()
    if graph:
        return graph

    graph = Graph(name="Default Graph", owner_id=user_id)
    db.add(graph)
    db.commit()
    db.refresh(graph)
    member = GraphMember(graph_id=graph.id, user_id=user_id, role="owner")
    db.add(member)
    db.commit()
    return graph

def check_graph_access(db: Session, graph_id: int, user_id: str) -> Graph:
    graph = db.query(Graph).filter(Graph.id == graph_id).first()
    if not graph:
        raise HTTPException(status_code=404, detail=f"Graph {graph_id} not found")
    if graph.owner_id == user_id:
        return graph
    member = db.query(GraphMember).filter(GraphMember.graph_id == graph_id, GraphMember.user_id == user_id).first()
    if not member:
        raise HTTPException(status_code=403, detail="Graph not found or access denied")
    return graph

def get_user_graph_ids(db: Session, user_id: str) -> list[int]:
    owner_graphs = db.query(Graph.id).filter(Graph.owner_id == user_id).all()
    member_graphs = db.query(GraphMember.graph_id).filter(GraphMember.user_id == user_id).all()
    g_ids = set([g[0] for g in owner_graphs] + [m[0] for m in member_graphs])
    if not g_ids:
        def_graph = get_or_create_default_graph(db, user_id)
        g_ids = {def_graph.id}
    return list(g_ids)

@router.get("/", response_model=list[dict[str, Any]])
def get_nodes(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph_ids = get_user_graph_ids(db, user_id)
    nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()
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

@router.get("/graph/full")
def get_full_graph(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph_ids = get_user_graph_ids(db, user_id)
    nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()
    node_ids = {n.id for n in nodes}
    edges = db.query(Edge).filter(Edge.graph_id.in_(graph_ids)).all()
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
            for e in edges if e.target_id in node_ids and e.source_id in node_ids
        ],
    }

@router.get("/{node_id}")
def get_node(node_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    check_graph_access(db, node.graph_id, user_id)
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "completed": node.completed,
        "data": node.data or {},
        "user_id": node.user_id,
        "graph_id": node.graph_id,
    }

@router.post("/", status_code=status.HTTP_201_CREATED)
def create_node(node_in: NodeCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph_id = node_in.graph_id
    if not graph_id:
        default_graph = get_or_create_default_graph(db, user_id)
        graph_id = default_graph.id
    else:
        check_graph_access(db, graph_id, user_id)

    node = Node(
        title=node_in.title,
        description=node_in.description,
        completed=node_in.completed or False,
        data=node_in.data or {},
        user_id=user_id,
        graph_id=graph_id,
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
        "user_id": node.user_id,
        "graph_id": node.graph_id,
    }

@router.patch("/{node_id}")
def update_node(node_id: int, update_in: NodeUpdate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    check_graph_access(db, node.graph_id, user_id)

    update_data = update_in.dict(exclude_unset=True)
    if "data" in update_data and update_data["data"] and node.data:
        merged_data = dict(node.data)
        merged_data.update(update_data["data"])
        update_data["data"] = merged_data

    for field, val in update_data.items():
        setattr(node, field, val)
    db.commit()
    db.refresh(node)
    return {
        "id": node.id,
        "title": node.title,
        "description": node.description,
        "completed": node.completed,
        "data": node.data or {},
        "user_id": node.user_id,
        "graph_id": node.graph_id,
    }

@router.delete("/{node_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_node(node_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    node = db.query(Node).filter(Node.id == node_id).first()
    if not node:
        raise HTTPException(status_code=404, detail=f"Node {node_id} not found")
    check_graph_access(db, node.graph_id, user_id)

    # Delete edges associated with this node
    db.query(Edge).filter((Edge.source_id == node_id) | (Edge.target_id == node_id)).delete()
    db.delete(node)
    db.commit()

@router.post("/edges", status_code=status.HTTP_201_CREATED)
def create_edge(edge_in: EdgeCreate, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    source_node = db.query(Node).filter(Node.id == edge_in.source_id).first()
    target_node = db.query(Node).filter(Node.id == edge_in.target_id).first()

    if not source_node or not target_node:
        raise HTTPException(status_code=404, detail="Source or Target node not found")

    check_graph_access(db, source_node.graph_id, user_id)
    check_graph_access(db, target_node.graph_id, user_id)

    if source_node.graph_id != target_node.graph_id:
        raise HTTPException(status_code=400, detail="Cannot link nodes across different graphs")

    graph_id = edge_in.graph_id or source_node.graph_id
    edge = Edge(
        source_id=edge_in.source_id,
        target_id=edge_in.target_id,
        label=edge_in.label or "relates_to",
        graph_id=graph_id,
    )
    db.add(edge)
    db.commit()
    db.refresh(edge)
    return {
        "id": edge.id,
        "source_id": edge.source_id,
        "target_id": edge.target_id,
        "label": edge.label,
        "graph_id": edge.graph_id,
    }

@router.post("/ai-action")
def ai_action(req: AIActionRequest, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    graph_ids = get_user_graph_ids(db, user_id)

    target_node = None
    if req.node_id:
        target_node = db.query(Node).filter(Node.id == req.node_id).first()
        if not target_node:
            raise HTTPException(status_code=404, detail=f"Node {req.node_id} not found")
        check_graph_access(db, target_node.graph_id, user_id)

    action = req.action.lower()

    if action == "decompose":
        if not target_node:
            raise HTTPException(status_code=400, detail="node_id is required for decompose action")

        subtask_titles = [
            f"Research: {target_node.title}",
            f"Implement: {target_node.title}",
            f"Test & Verify: {target_node.title}",
        ]
        
        subs = []
        for title in subtask_titles:
            sub = Node(
                title=title,
                completed=False,
                data={"node_type": "task", "estimated_hours": 2, "parent_id": target_node.id},
                user_id=user_id,
                graph_id=target_node.graph_id,
            )
            subs.append(sub)

        existing_nodes = db.query(Node).filter(Node.graph_id == target_node.graph_id).all()
        base_pos = (target_node.data or {}).get("position", {})
        assign_positions(subs, existing_nodes, base_pos.get("x", 0), base_pos.get("y", 0))

        created = []
        for sub in subs:
            db.add(sub)
            db.commit()
            db.refresh(sub)
            edge = Edge(source_id=target_node.id, target_id=sub.id, label="subtask", graph_id=target_node.graph_id)
            db.add(edge)
            db.commit()
            created.append({"id": sub.id, "title": sub.title, "hours": 2})

        return {
            "action": "decompose",
            "message": f"Decomposed '{target_node.title}' into {len(created)} subtasks.",
            "created_nodes": created,
        }

    elif action == "chat":
        node_name = f"'{target_node.title}'" if target_node else "the graph"
        user_msg = req.message or "Help me organize this."
        return {
            "action": "chat",
            "reply": f"Regarding {node_name}: I processed your request: '{user_msg}'. You're in good shape!",
        }

    elif action == "schedule":
        nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()
        return {
            "action": "schedule",
            "recommendations": [
                f"Schedule '{n.title}' for upcoming focus slot" for n in nodes[:3]
            ],
        }

    elif action == "prioritize":
        nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()
        return {
            "action": "prioritize",
            "recommendations": [
                f"High priority: '{n.title}'" for n in nodes if not n.completed
            ][:3],
        }

    else:
        raise HTTPException(status_code=400, detail=f"Unknown AI action: {req.action}")

@router.post("/bulk", status_code=status.HTTP_201_CREATED)
def create_nodes_bulk(nodes_in: list[NodeCreate], db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):
    user_id = current_user["sub"]
    
    if not nodes_in:
        return []
        
    created = []
    # group by graph_id
    graph_map = {}
    for nin in nodes_in:
        gid = nin.graph_id
        if not gid:
            g = get_or_create_default_graph(db, user_id)
            gid = g.id
        else:
            check_graph_access(db, gid, user_id)
        
        node = Node(
            title=nin.title,
            description=nin.description,
            completed=nin.completed or False,
            data=nin.data or {},
            user_id=user_id,
            graph_id=gid,
        )
        graph_map.setdefault(gid, []).append(node)
        created.append(node)
        
    for gid, new_nodes in graph_map.items():
        existing = db.query(Node).filter(Node.graph_id == gid).all()
        # assign position for nodes without it
        nodes_to_position = [n for n in new_nodes if "position" not in (n.data or {})]
        if nodes_to_position:
            assign_positions(nodes_to_position, existing)
            
    for node in created:
        db.add(node)
    db.commit()
    
    for node in created:
        db.refresh(node)
        
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
        for n in created
    ]
