from typing import Any


def assign_positions(new_nodes: list[Any], existing_nodes: list[Any], base_x: float = 0, base_y: float = 0, spacing_x: float = 250, spacing_y: float = 150):
    occupied = set()
    for n in existing_nodes:
        pos = (n.data or {}).get("position")
        if pos and isinstance(pos, dict):
            occupied.add((int(pos.get("x", 0) // spacing_x), int(pos.get("y", 0) // spacing_y)))
            
    cx, cy = int(base_x // spacing_x), int(base_y // spacing_y)
    
    for n in new_nodes:
        r = 0
        placed = False
        while not placed:
            for dx in range(-r, r+1):
                for dy in range(-r, r+1):
                    if r == 0 or abs(dx) == r or abs(dy) == r:
                        if (cx + dx, cy + dy) not in occupied:
                            occupied.add((cx + dx, cy + dy))
                            data = dict(n.data or {})
                            data["position"] = {"x": (cx + dx) * spacing_x, "y": (cy + dy) * spacing_y}
                            n.data = data
                            placed = True
                            break
                if placed: break
            r += 1
