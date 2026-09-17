import pytest
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
from app.main import app

def test_websocket():
    client = TestClient(app)
    
    mock_key = MagicMock()
    mock_key.key = "secret"
    
    with patch("app.api.ws.jwks_client.get_signing_key_from_jwt", return_value=mock_key), \
         patch("app.api.ws.jwt.decode", return_value={"sub": "user_a"}), \
         patch("app.api.ws.check_graph_access", return_value=True):
        
        with client.websocket_connect("/ws/1?token=dummy-token") as websocket:
            pass # just checking connection works
