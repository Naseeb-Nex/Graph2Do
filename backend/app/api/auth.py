from fastapi import APIRouter, HTTPException, Request, Depends
from fastapi.responses import RedirectResponse
from kinde_sdk import create_oauth_client
from app.core.config import settings

router = APIRouter()

kinde_client = create_oauth_client(
    host=settings.kinde_domain,
    client_id=settings.kinde_client_id,
    client_secret=settings.kinde_client_secret,
    redirect_uri=settings.kinde_callback_url,
    framework="fastapi", 
    async_mode=False
)

@router.get("/login")
def login():
    try:
        url = kinde_client.get_login_url()
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/register")
def register():
    try:
        url = kinde_client.get_register_url()
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/callback")
def callback(request: Request):
    try:
        kinde_client.fetch_token(request.url._url)
        return {"message": "Successfully authenticated with Kinde"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/logout")
def logout():
    try:
        url = kinde_client.logout(redirect_to="http://localhost:8000")
        return RedirectResponse(url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
