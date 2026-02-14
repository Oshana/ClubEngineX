from app.routers import (auth, club_settings, player_portal, players, sessions,
                         statistics)
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Badminton Club Manager",
    description="API for managing badminton club sessions and court assignments",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(players.router)
app.include_router(sessions.router)
app.include_router(player_portal.router)
app.include_router(club_settings.router)
app.include_router(statistics.router)


@app.get("/")
def root():
    return {
        "message": "Badminton Club Manager API",
        "version": "1.0.0",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}
