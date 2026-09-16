import re

with open("backend/app/api/nodes.py", "r") as f:
    text = f.read()

text = text.replace("from app.models.graph import Node, Edge", "from app.models.graph import Node, Edge, Graph, GraphMember")

# get_nodes
text = re.sub(
    r'def get_nodes.*?user_id = current_user\["sub"\]\n    nodes = db\.query\(Node\)\.filter\(Node\.user_id == user_id\)\.all\(\)',
    'def get_nodes(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):\n    user_id = current_user["sub"]\n    user_graphs = db.query(GraphMember.graph_id).filter(GraphMember.user_id == user_id).all()\n    graph_ids = [r[0] for r in user_graphs]\n    nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()',
    text,
    flags=re.DOTALL
)

# get_full_graph
text = re.sub(
    r'def get_full_graph.*?user_id = current_user\["sub"\]\n    nodes = db\.query\(Node\)\.filter\(Node\.user_id == user_id\)\.all\(\)\n    node_ids = {n\.id for n in nodes}\n\n    edges = db\.query\(Edge\)\.join\(Node, Node\.id == Edge\.source_id\)\.filter\(Node\.user_id == user_id\)\.all\(\)',
    'def get_full_graph(db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):\n    user_id = current_user["sub"]\n    user_graphs = db.query(GraphMember.graph_id).filter(GraphMember.user_id == user_id).all()\n    graph_ids = [r[0] for r in user_graphs]\n    nodes = db.query(Node).filter(Node.graph_id.in_(graph_ids)).all()\n    node_ids = {n.id for n in nodes}\n    edges = db.query(Edge).filter(Edge.graph_id.in_(graph_ids)).all()',
    text,
    flags=re.DOTALL
)

# get_node
text = re.sub(
    r'def get_node\(node_id: int, db: Session = Depends\(get_db\), current_user: Any = Depends\(get_current_user\)\):\n    user_id = current_user\["sub"\]\n    node = db\.query\(Node\)\.filter\(Node\.id == node_id, Node\.user_id == user_id\)\.first\(\)',
    'def get_node(node_id: int, db: Session = Depends(get_db), current_user: Any = Depends(get_current_user)):\n    user_id = current_user["sub"]\n    user_graphs = db.query(GraphMember.graph_id).filter(GraphMember.user_id == user_id).all()\n    graph_ids = [r[0] for r in user_graphs]\n    node = db.query(Node).filter(Node.id == node_id, Node.graph_id.in_(graph_ids)).first()',
    text,
    flags=re.DOTALL
)


with open("backend/app/api/nodes.py", "w") as f:
    f.write(text)

