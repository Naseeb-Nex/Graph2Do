# Graph2Do - PRD & Architecture

## 1. Vision & Goals
* **Core Concept**: A web-based task management interface that structures tasks as a sequential knowledge graph rather than a flat list.
* **Primary Goal**: Ensure tasks are never forgotten, break big goals down into atomic steps, visually communicate the goal behind each task, and proactively keep the user motivated.

## 2. Interface Layout & Navigation
* **Left Panel - Knowledge Graph Visualization**:
  * **Circular Nodes**: All nodes (projects, goals, tasks) are consistently represented as circles.
  * **Progress Rings**: High-level project nodes feature a circular progress bar (e.g., a green stroke around the perimeter) indicating completion percentage.
  * **Sequential Trees**: To prevent visual clutter, sequential subtasks are grouped and hidden from the highest-level view by default.
  * **Expand/Collapse Controls**: Global or per-project toggles for "always collapse" (showing only main projects) or "always expand" (revealing the full sequential flow, process position, and deadlines).
  * **Hover States**: Hovering reveals non-intrusive metadata: expected hours to complete and a list of underlying tasks that currently block progress based on the timeline.
* **Right Panel - AI Agent Chat UI**:
  * A conversational AI assistant fully aware of the user's graph, deadlines, and UI selection context.

## 3. User Interaction & Data Entry
* **Dual-Mode Control**: Tasks can be managed manually via standard UI inputs or entirely through conversational commands with the AI.
* **Contextual Selection for AI**: Clicking or highlighting a specific project/task node on the graph instantly injects that node into the AI agent's current context context, allowing intuitive commands like "break this down further."

## 4. Core AI Agent Capabilities
* **Task Decomposition**: The AI automatically breaks a high-level goal down into connected atomic subtasks.
* **Intelligent Scheduling & Prioritization**: Analyzes deadlines and dependencies to determine the exact next task required to keep the graph unblocked.
* **Motivation & Alignment**: Reminds the user of the overarching goals for their active tasks and acts as a motivator to drive execution.

## 5. Architecture & Tech Stack
* **Frontend**: Next.js (React) + Tailwind CSS.
* **Graph Visualization Engine**: React Flow (`@xyflow/react`) for managing circular nodes, progressive rings, and complex graph layouts securely in the DOM.
* **Backend**: Python + FastAPI. Uses REST for standard CRUD and WebSockets for streaming LLM chat responses and real-time graph updates.
* **Database**: Serverless PostgreSQL hosted on Neon.
* **Authentication**: Kinde Auth, implemented behind a backend Plug-and-Play adapter pattern so the auth provider can be cleanly swapped in the future if needed.
* **AI Orchestration**: LangGraph. Manages the agent's state machine, orchestrates tool execution (e.g., `create_task`, `update_node`), and uses a PostgreSQL checkpointer to persist long-term chat memory automatically.
* **Hosting (Hobby/Free Tier Target)**: Vercel (Frontend) + Render/Railway (Backend) + Neon (DB).

## 6. Future Scope
* **MCP (Model Context Protocol)**: Expose the Graph2Do knowledge base so external AI agents can read and write task data seamlessly.
