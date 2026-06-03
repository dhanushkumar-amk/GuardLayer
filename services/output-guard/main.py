import os
from fastapi import FastAPI
from routers.guards import router as guards_router

app = FastAPI(
    title="GuardLayer Output Guard Service",
    description="Output validation pipeline for the GuardLayer Gateway",
    version="1.0.0"
)

# Register routes
app.include_router(guards_router)

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "output-guard"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8002, reload=True)
