from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.auth import router as auth_router
from app.api.graphs import router as graphs_router
from app.api.nodes import router as nodes_router
from app.api.ws import router as ws_router

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Graph2Do API")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": exc.detail},
    )


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "An unexpected error occurred."},
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/auth", tags=["Auth"])
app.include_router(auth_router, prefix="/api/auth", tags=["Auth"])
app.include_router(nodes_router, prefix="/nodes", tags=["Nodes"])
app.include_router(nodes_router, prefix="/api/nodes", tags=["Nodes"])
app.include_router(graphs_router, prefix="/graphs", tags=["Graphs"])
app.include_router(graphs_router, prefix="/api/graphs", tags=["Graphs"])
app.include_router(ws_router, tags=["Websockets"])


@app.get("/")
@limiter.limit("10/minute")
def read_root(request: Request):
    return {"message": "Welcome to Graph2Do API. Check /docs for more info."}
