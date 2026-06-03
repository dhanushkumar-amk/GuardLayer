import os
from fastapi import FastAPI
from routers.guards import router as guards_router

# Set testing environment variable for internal guards initialization if needed
# os.environ["TESTING"] = "true"

app = FastAPI(
    title="GuardLayer Input Guard Service",
    description="Input safety pipeline for the GuardLayer Gateway",
    version="1.0.0"
)

# Register routes
app.include_router(guards_router)

# Health check endpoint
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "input-guard"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
