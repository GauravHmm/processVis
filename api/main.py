"""FastAPI application entry point."""

from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.routes import router as api_router


app = FastAPI(
    title="Process Creation and State Transition Visualizer API",
    description="REST API for the OS process management simulation",
    version="1.0.0",
)

# CORS configuration for Next.js development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API routes
app.include_router(api_router, prefix="/api")


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Process Creation and State Transition Visualizer API",
        "version": "1.0.0",
        "docs": "/docs",
        "redoc": "/redoc",
    }