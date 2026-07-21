from fastapi import FastAPI

from app.api.router import router

app = FastAPI(title="py-file-platform")
app.include_router(router)


@app.get("/health")
def health():
    return {"status": "ok"}
