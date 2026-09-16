from typing import Any, Optional
import jwt
from fastapi import APIRouter, HTTPException, Request, Security, Query, Depends
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from kinde_sdk import create_oauth_client
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import settings

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)
security = HTTPBearer()

kinde_client = create_oauth_client(
    host=settings.kinde_domain,
    client_id=settings.kinde_client_id,
    client_secret=settings.kinde_client_secret,
    redirect_uri=settings.kinde_callback_url,
    framework="fastapi",
    async_mode=False,
)

jwks_client = jwt.PyJWKClient(f"{settings.kinde_domain}/.well-known/jwks.json")

def get_current_user(credentials: HTTPAuthorizationCredentials = Security(security)):
    token = credentials.credentials
    try:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=settings.kinde_client_id,
        )
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.get("/login")
@limiter.limit("10/minute")
def login(request: Request, connection_id: Optional[str] = Query(None), provider: Optional[str] = Query(None)):
    params = {}
    conn = connection_id or provider
    if conn:
        if conn.lower() in ("google", "google-oauth2"):
            params["connection_id"] = "conn_google"
        elif conn.lower() in ("github", "github-oauth2"):
            params["connection_id"] = "conn_github"
        else:
            params["connection_id"] = conn
    return RedirectResponse(kinde_client.login(**params))

@router.get("/register")
@limiter.limit("10/minute")
def register(request: Request):
    return RedirectResponse(kinde_client.register())

@router.get("/callback")
@limiter.limit("20/minute")
def callback(request: Request):
    try:
        kinde_client.fetch_token(str(request.url))
        return RedirectResponse(settings.frontend_url)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/logout")
@limiter.limit("10/minute")
def logout(request: Request):
    try:
        return RedirectResponse(kinde_client.logout())
    except Exception:
        return RedirectResponse(settings.frontend_url)

@router.get("/me")
def me(current_user: Any = Depends(get_current_user)):
    return {
        "sub": current_user.get("sub"),
        "email": current_user.get("email"),
        "name": current_user.get("name") or current_user.get("given_name") or current_user.get("sub"),
        "picture": current_user.get("picture"),
        "social_provider": current_user.get("idp") or current_user.get("identity_provider"),
    }
