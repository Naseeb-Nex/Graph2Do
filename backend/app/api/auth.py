import jwt
from fastapi import APIRouter, HTTPException, Request, Security
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    async_mode=False
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
    except Exception as e:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

@router.get("/login")
@limiter.limit("10/minute")
def login(request: Request):
    return RedirectResponse(kinde_client.get_login_url())

@router.get("/register")
@limiter.limit("10/minute")
def register(request: Request):
    return RedirectResponse(kinde_client.get_register_url())

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
    return RedirectResponse(kinde_client.get_logout_url())
