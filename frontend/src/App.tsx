import { useEffect, useState } from 'react';
import { ReactFlow, Controls, Background } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const API_BASE = 'http://localhost:8000';
const FAKE_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.KQhO83UnZWqvr7LYJBJrvCqHFEdQe0QRyFhsCWAaw-I';

function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);

  useEffect(() => {
    fetch(`${API_BASE}/nodes/`, {
      headers: {
        'Authorization': `Bearer ${FAKE_TOKEN}`
      }
    })
      .then(res => res.json())
      .then(data => {
        // Map backend nodes to reactflow nodes
        const rfNodes = (data.nodes || []).map((n: any, i: number) => ({
          id: String(n.id),
          position: { x: i * 150, y: 100 },
          data: { label: n.title },
          style: {
            borderRadius: '50%',
            width: 80,
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid #10b981',
            backgroundColor: '#ffffff',
            fontSize: '10px',
            textAlign: 'center',
            padding: '5px'
          }
        }));
        
        const rfEdges = (data.edges || []).map((e: any) => ({
          id: `e${e.source_id}-${e.target_id}`,
          source: String(e.source_id),
          target: String(e.target_id),
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      })
      .catch(err => console.error("Error fetching graph data", err));
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow nodes={nodes} edges={edges}>
          <Background />
          <Controls />
        </ReactFlow>
      </div>
      <div style={{ width: 300, borderLeft: '1px solid #ccc', padding: 20 }}>
        <h3>Graph2Do AI Agent</h3>
        <p>Conversational UI placeholder</p>
      </div>
    </div>
  );
}

export default App;
