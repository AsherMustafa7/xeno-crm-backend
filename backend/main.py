from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine
from models import Base
from seed import seed
from routers import customers, segments, campaigns, receipts, analytics, ai

Base.metadata.create_all(bind=engine)
seed()

app = FastAPI(title="Xeno Mini CRM", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(customers.router)
app.include_router(segments.router)
app.include_router(campaigns.router)
app.include_router(receipts.router)
app.include_router(analytics.router)
app.include_router(ai.router)


@app.get("/")
def root():
    return {"service": "Xeno Mini CRM", "status": "ok"}


@app.get("/health")
def health():
    return {"status": "ok"}
