from sqlalchemy import JSON, Boolean, Column, ForeignKey, Integer, String

from app.db.database import Base


class Graph(Base):
    __tablename__ = "graphs"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    # The creator/owner of the graph
    owner_id = Column(String, index=True, nullable=False)

class GraphMember(Base):
    __tablename__ = "graph_members"

    id = Column(Integer, primary_key=True, index=True)
    graph_id = Column(Integer, ForeignKey("graphs.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String, index=True, nullable=False)
    role = Column(String, default="member")

class Node(Base):
    __tablename__ = "nodes"

    id = Column(Integer, primary_key=True, index=True)
    graph_id = Column(Integer, ForeignKey("graphs.id", ondelete="CASCADE"), nullable=False, index=True)
    # user_id kept for legacy frontend matching or backward compat
    user_id = Column(String, index=True)
    title = Column(String, index=True)
    description = Column(String, nullable=True)
    completed = Column(Boolean, default=False)
    data = Column(JSON, nullable=True)


class Edge(Base):
    __tablename__ = "edges"

    id = Column(Integer, primary_key=True, index=True)
    graph_id = Column(Integer, ForeignKey("graphs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_id = Column(Integer, ForeignKey("nodes.id"))
    target_id = Column(Integer, ForeignKey("nodes.id"))
    label = Column(String, nullable=True)
