from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router as api_router
# 👇 Import the bucket tool
from app.services.storage_service import ensure_bucket 

app = FastAPI(title="Dataset Uploader")

# 👇 THE ROBOT INSTRUCTION
# This runs automatically when the backend starts.
# It builds the "raw-datasets" bucket if it is missing.
@app.on_event("startup")
def startup_event():
    ensure_bucket()

# Your existing CORS setup (Keep this!)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api")

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend is running"}