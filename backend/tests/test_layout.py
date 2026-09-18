from app.core.layout import assign_positions


class MockNode:
    def __init__(self, x=None, y=None):
        if x is not None and y is not None:
            self.data = {"position": {"x": x, "y": y}}
        else:
            self.data = {}
def test_assign_positions_empty():
    existing = []
    # Two nodes, space should increment coordinates or something
    new_nodes = [MockNode(), MockNode()]
    assign_positions(new_nodes, existing, base_x=0, base_y=0, spacing_x=100, spacing_y=100)
    
    pos1 = new_nodes[0].data["position"]
    pos2 = new_nodes[1].data["position"]
    
    # One of them is likely at 0, 0
    assert pos1["x"] == 0 and pos1["y"] == 0
    # The other shouldn't overlap
    assert not (pos1["x"] == pos2["x"] and pos1["y"] == pos2["y"])
def test_assign_positions_collision():
    existing = [MockNode(x=100, y=100)] # Occupies 1,1
    new_nodes = [MockNode()]
    
    assign_positions(new_nodes, existing, base_x=100, base_y=100, spacing_x=100, spacing_y=100)
    
    pos1 = new_nodes[0].data["position"]
    
    # Must NOT overlap with existing 100, 100
    assert not (pos1["x"] == 100 and pos1["y"] == 100)

