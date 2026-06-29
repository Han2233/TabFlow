from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import classify

app = FastAPI(title="TabFlow API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(classify.router)

@app.get("/health")
async def health():
    return {"status": "ok"}
