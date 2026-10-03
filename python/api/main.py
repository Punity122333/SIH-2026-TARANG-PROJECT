import os

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from api.routers.reconstruct import router

app = FastAPI(title="STRATA API", version="0.1.0")
allowed = os.environ.get("STRATA_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
origins = [o.strip() for o in allowed.split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)
MAX_BYTES = 12 * 1024 * 1024
@app.middleware("http")
async def size_guard(request: Request, call_next):
    cl = request.headers.get("content-length")
    if cl is not None and cl.isdigit() and int(cl) > MAX_BYTES:
        return JSONResponse(status_code=413, content={"ok": False, "code": "payload_too_large", "message": "request exceeds 12MB limit"})
    return await call_next(request)
@app.exception_handler(StarletteHTTPException)
async def http_handler(request: Request, exc: StarletteHTTPException):
    detail = exc.detail
    if isinstance(detail, dict) and "code" in detail:
        return JSONResponse(status_code=exc.status_code, content=detail)
    code = "not_found" if exc.status_code == 404 else "http_error"
    return JSONResponse(status_code=exc.status_code, content={"ok": False, "code": code, "message": str(detail)})
@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(status_code=422, content={"ok": False, "code": "validation_error", "message": "invalid request: " + str(exc.errors()[:1])})
app.include_router(router, prefix="/api")
@app.get("/health")
def top_health():
    return {"ok": True, "service": "strata"}
DIST = os.environ.get("STRATA_DIST", "")
if not DIST:
    for cand in ["/app/web/dist", "web/dist"]:
        if os.path.isdir(cand):
            DIST = cand
            break
if not DIST:
    @app.get("/")
    def root():
        return {"name": "STRATA", "full": "Physics-Informed Subsurface Ocean Temperature Reconstruction"}
else:
    from fastapi.staticfiles import StaticFiles
    app.mount("/", StaticFiles(directory=DIST, html=True), name="web")
