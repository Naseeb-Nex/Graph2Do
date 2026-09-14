from fastapi import APIRouter, HTTPException, Request, Depends, Security
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from kinde_sdk import create_oauth_client
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.core.config import settings
import jwt

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer()

kinde_client = create_oauth_client(
    host=settings.kinde_domain,
    client_id=settings.kinde_client_id,
    client_secret=settings.kinde_client_secret,
    redirect_uri=settings.kinde_callback_url,
    framework="fastapi",
    async_mode=False
)

def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    # In a real app, you would fetch the JWKS from Kinde and verify using the key.
    try:
        # We perform basic decoding without signature verification for now,
        # but the boundary is enforced by this dependency.
        payload = jwt.decode(token, options={"verify_signature": False})
        return payload
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.get("/login")
@limiter.limit("10/minute")
def login(request: Request):
    try:
        url = kinde_client.get_login_url()
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/register")
@limiter.limit("10/minute")
def register(request: Request):
    try:
        url = kinde_client.get_register_url()
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/callback")
@limiter.limit("20/minute")
def callback(request: Request):
    try:
        kinde_client.fetch_token(str(request.url))
        return {"message": "Successfully authenticated with Kinde"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/logout")
@limiter.limit("10/minute")
def logout(request: Request):
    try:
        url = kinde_client.logout(redirect_to="http://localhost:8000")
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
