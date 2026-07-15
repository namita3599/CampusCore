"""
╔══════════════════════════════════════════════════════════════════════════════╗
║           CampusCore – AI Facial Recognition Attendance Service              ║
║                         main.py  (FastAPI)                                   ║
╚══════════════════════════════════════════════════════════════════════════════╝

Architecture overview
─────────────────────
  ┌──────────────────────────────────────────┐
  │  Next.js Frontend (Teacher / Student UI) │
  └──────────────┬───────────────────────────┘
                 │ HTTP  (REST)
  ┌──────────────▼───────────────────────────┐
  │        THIS SERVICE  (FastAPI)           │
  │   • Redis rate-limiter (3 req/60 s/IP)   │
  │   • POST /process-student-photo          │
  │   • POST /mark-group-attendance          │
  └───────┬──────────────────────┬───────────┘
          │ asyncpg (raw SQL)    │ face_recognition (dlib)
  ┌───────▼───────┐     ┌────────▼────────────────────┐
  │  Supabase DB  │     │  In-memory numpy operations  │
  │  (PostgreSQL  │     │  128-D face embeddings       │
  │   + pgvector) │     └─────────────────────────────┘
  └───────────────┘

Key design decisions
────────────────────
  • Everything is processed IN MEMORY – no files are written to disk.
  • asyncpg is used for raw SQL so we can call pgvector operators (<=>)
    that Prisma cannot express natively.
  • Redis provides a fixed-window rate-limiter as a FastAPI dependency
    injected on every route via app-level dependency.
  • Python's face_recognition library wraps dlib HOG + deep-metric model
    to produce a deterministic 128-dimensional float64 embedding per face.

Run with:
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

import io
import os
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Annotated, Any

import asyncpg
import face_recognition
import httpx
import numpy as np
import redis.asyncio as aioredis
from PIL import Image, ImageOps
from dotenv import load_dotenv
from fastapi import (
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Request,
    UploadFile,
    status,
)
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl

# Load .env from the same directory as this file so DATABASE_URL and
# REDIS_URL are available even when the process is started from a
# different working directory (e.g. via `npm run dev` in the Next.js root).
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

# ─────────────────────────────────────────────────────────────────────────────
# Logging
# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s – %(message)s",
)
logger = logging.getLogger("campuscore.attendance")

# ─────────────────────────────────────────────────────────────────────────────
# Configuration  (read from environment; fall back to safe defaults for dev)
# ─────────────────────────────────────────────────────────────────────────────
DATABASE_URL: str = os.environ.get(
    "DATABASE_URL",
    "postgresql://postgres:password@localhost:5432/campuscore",
)
REDIS_URL: str = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

# Rate-limiter constants
RATE_LIMIT_MAX_REQUESTS: int = 3   # max requests per window
RATE_LIMIT_WINDOW_SECONDS: int = 60  # rolling window in seconds

# pgvector cosine-distance threshold – faces with distance < this are matched
# A threshold of 0.18 perfectly correlates to a standard Euclidean distance of 0.6.
VECTOR_DISTANCE_THRESHOLD: float = 0.18

# ─────────────────────────────────────────────────────────────────────────────
# App-level shared resources
# ─────────────────────────────────────────────────────────────────────────────
# These are populated during startup and torn down during shutdown so that
# every request reuses the same pool/connection instead of opening new ones.

_db_pool: asyncpg.Pool | None = None
_redis_client: aioredis.Redis | None = None


# ─────────────────────────────────────────────────────────────────────────────
# Lifespan context manager  (replaces deprecated @app.on_event)
# ─────────────────────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Code before `yield` runs at startup; code after `yield` runs at shutdown.
    We open the Postgres connection pool and the Redis connection here so
    they are shared across ALL incoming requests without reconnecting.
    """
    global _db_pool, _redis_client

    # ── Open Postgres connection pool ─────────────────────────────────────────
    logger.info("Connecting to PostgreSQL …")
    # ssl='require' is mandatory for Supabase (and most hosted Postgres).
    _db_pool = await asyncpg.create_pool(
        DATABASE_URL,
        min_size=2,   # keep at least 2 warm connections
        max_size=10,  # never open more than 10 simultaneous connections
        ssl="require",
    )
    logger.info("PostgreSQL pool ready ✔")

    # ── Open Redis connection (optional – degrades gracefully if unavailable) ──
    logger.info("Connecting to Redis …")
    try:
        _redis_client = await aioredis.from_url(
            REDIS_URL,
            decode_responses=True,
            socket_connect_timeout=3,  # fail fast if Redis is not running
        )
        # Verify the connection is actually alive with a PING
        await _redis_client.ping()
        logger.info("Redis connection ready ✔")
    except Exception as exc:
        logger.warning(
            "Redis unavailable (%s). Rate limiting is DISABLED for this session. "
            "Start Redis to enable it: `sudo service redis-server start` (WSL/Linux) "
            "or `docker run -d -p 6379:6379 redis:alpine` (Docker).",
            exc,
        )
        _redis_client = None  # service continues without rate limiting

    yield  # ←── application is live and serving requests here

    # ── Graceful shutdown ─────────────────────────────────────────────────────
    logger.info("Shutting down – closing connections …")
    await _db_pool.close()
    if _redis_client is not None:
        await _redis_client.aclose()
    logger.info("Connections closed. Goodbye.")


# ─────────────────────────────────────────────────────────────────────────────
# FastAPI application
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CampusCore Facial Recognition Service",
    description=(
        "AI-powered facial recognition microservice for the CampusCore ERP. "
        "Processes student photos and marks group attendance using dlib + pgvector."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# Allow the Next.js dev server (port 3000) and production domain to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://your-production-domain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─────────────────────────────────────────────────────────────────────────────
# Dependency helpers
# ─────────────────────────────────────────────────────────────────────────────

def get_db_pool() -> asyncpg.Pool:
    """FastAPI dependency: returns the shared asyncpg connection pool."""
    if _db_pool is None:
        raise RuntimeError("Database pool not initialised – lifespan not running?")
    return _db_pool


def get_redis() -> aioredis.Redis | None:
    """FastAPI dependency: returns the shared Redis client, or None if Redis
    is unavailable (graceful degradation – rate limiting is skipped)."""
    return _redis_client  # may be None if Redis was not reachable at startup


# ─────────────────────────────────────────────────────────────────────────────
# Global Rate Limiter  (Fixed-window algorithm)
# ─────────────────────────────────────────────────────────────────────────────
async def rate_limit(
    request: Request,
    redis: Annotated[aioredis.Redis | None, Depends(get_redis)],
) -> None:
    """
    Fixed-window rate limiter applied globally to ALL routes.
    If Redis is unavailable, the limiter is skipped with a warning log.
    """
    if redis is None:
        logger.debug("Rate limiter skipped – Redis not connected.")
        return

    client_ip: str = request.client.host if request.client else "unknown"

    import time
    window_slot = int(time.time()) // RATE_LIMIT_WINDOW_SECONDS
    redis_key = f"rate_limit:{client_ip}:{window_slot}"

    current_count: int = await redis.incr(redis_key)

    if current_count == 1:
        await redis.expire(redis_key, RATE_LIMIT_WINDOW_SECONDS)

    logger.debug("Rate-limit check – IP=%s count=%d/%d", client_ip, current_count, RATE_LIMIT_MAX_REQUESTS)

    if current_count > RATE_LIMIT_MAX_REQUESTS:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=(
                f"Rate limit exceeded. Maximum {RATE_LIMIT_MAX_REQUESTS} requests "
                f"per {RATE_LIMIT_WINDOW_SECONDS} seconds. Please wait and retry."
            ),
            headers={"Retry-After": str(RATE_LIMIT_WINDOW_SECONDS)},
        )


# Apply the rate limiter as a global dependency so EVERY route is protected.
app.dependency_overrides  # just referencing to show it exists


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────

class ProcessPhotoRequest(BaseModel):
    """
    Request body for POST /process-student-photo.

    Multi-tenant fields
    ───────────────────
    institutionId  The CUID of the tenant's Institution row (from the JWT session).
                   Used in the UPDATE WHERE clause to guarantee the student record
                   belongs to the correct institution before writing the embedding.
    """
    studentId: int
    photoUrl: HttpUrl
    institutionId: str


# ─────────────────────────────────────────────────────────────────────────────
# Helper utilities
# ─────────────────────────────────────────────────────────────────────────────

async def _download_image_bytes(url: str) -> bytes:
    """Downloads an image from `url` asynchronously using httpx."""
    async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
        try:
            response = await client.get(url)
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Failed to download image from URL (HTTP {exc.response.status_code}): {url}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Network error while downloading image: {exc}",
            ) from exc

    return response.content


def _load_robust_rgb_image(image_bytes: bytes) -> np.ndarray:
    """
    CRITICAL FIX: Loads an image directly into a numpy array while respecting 
    smartphone EXIF orientation. This prevents portrait photos from being 
    scanned sideways, which causes "0 faces detected" errors.
    """
    image_buffer = io.BytesIO(image_bytes)
    img = Image.open(image_buffer)
    img = ImageOps.exif_transpose(img)  # Mathematically fixes sideways EXIF rotations
    img = img.convert("RGB")
    return np.array(img)


def _bytes_to_face_embedding(image_bytes: bytes) -> list[float]:
    """
    Decodes raw image bytes and returns a single 128-dimensional face embedding.
    """
    rgb_image = _load_robust_rgb_image(image_bytes)
    encodings: list[np.ndarray] = face_recognition.face_encodings(rgb_image, num_jitters=1, model="large")

    if len(encodings) == 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No face detected in the provided image. Please ensure the photo is clear and well-lit.",
        )

    if len(encodings) > 1:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{len(encodings)} faces detected. Profile photo must contain exactly one face.",
        )

    return encodings[0].tolist()


def _extract_all_encodings_from_bytes(image_bytes: bytes) -> list[np.ndarray]:
    """
    Decodes group classroom image bytes and returns embeddings for ALL detected faces.
    """
    rgb_image = _load_robust_rgb_image(image_bytes)

    # CRITICAL FIX: upsample=2 mathematically doubles the resolution of the image 
    # before the HOG model scans it. This allows the AI to catch faces that are 
    # seated far back in the classroom.
    face_locations = face_recognition.face_locations(rgb_image, number_of_times_to_upsample=2, model="hog")
    
    # Generate the 128D mathematical vectors for the boxed locations
    encodings = face_recognition.face_encodings(rgb_image, known_face_locations=face_locations, num_jitters=1, model="large")

    return encodings


# ─────────────────────────────────────────────────────────────────────────────
# Route 1 – POST /process-student-photo
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/process-student-photo",
    summary="Generate and store a student's 128-D face embedding",
    dependencies=[Depends(rate_limit)],
)
async def process_student_photo(
    body: ProcessPhotoRequest,
    pool: Annotated[asyncpg.Pool, Depends(get_db_pool)],
) -> dict[str, Any]:
    """Extracts a face vector and saves it directly into the student's pgvector row."""
    logger.info("Processing photo for studentId=%d url=%s", body.studentId, body.photoUrl)

    image_bytes: bytes = await _download_image_bytes(str(body.photoUrl))

    loop = asyncio.get_running_loop()
    embedding: list[float] = await loop.run_in_executor(
        None,
        _bytes_to_face_embedding,
        image_bytes,
    )

    vector_literal: str = "[" + ",".join(str(v) for v in embedding) + "]"

    # ── Tenant-scoped UPDATE ──────────────────────────────────────────────────
    # The AND "institutionId" = $3 clause ensures we can only write an embedding
    # to a StudentProfile that actually belongs to this institution.  If the
    # institutionId is wrong or missing, rows_updated will be 0 → 404 response.
    sql = """
        UPDATE "StudentProfile"
        SET    "faceEmbedding" = $1::vector
        WHERE  "id" = $2
          AND  "institutionId" = $3
    """

    async with pool.acquire() as conn:
        result: str = await conn.execute(sql, vector_literal, body.studentId, body.institutionId)

    rows_updated = int(result.split()[-1])

    if rows_updated == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No StudentProfile found with id={body.studentId}.",
        )

    logger.info(
        "Embedding saved for studentId=%d institutionId=%s (%d dims)",
        body.studentId,
        body.institutionId,
        len(embedding),
    )
    return {"success": True, "message": "Embedding saved", "dimensions": len(embedding)}


# ─────────────────────────────────────────────────────────────────────────────
# Route 2 – POST /mark-group-attendance
# ─────────────────────────────────────────────────────────────────────────────

@app.post(
    "/mark-group-attendance",
    summary="Detect all faces in a group photo and match to known students",
    dependencies=[Depends(rate_limit)],
)
async def mark_group_attendance(
    photo: Annotated[UploadFile, File(description="Group photo (JPEG/PNG)")],
    pool: Annotated[asyncpg.Pool, Depends(get_db_pool)],
    institutionId: str = Form(
        ...,
        description=(
            "CUID of the tenant Institution row (from the caller's JWT session). "
            "Restricts the pgvector nearest-neighbour search to embeddings that "
            "belong to this institution only, preventing cross-tenant face matches."
        ),
    ),
) -> dict[str, Any]:
    """Matches detected faces against the PostgreSQL database (tenant-scoped)."""
    logger.info(
        "Group attendance request – filename=%s content_type=%s institutionId=%s",
        photo.filename,
        photo.content_type,
        institutionId,
    )

    image_bytes: bytes = await photo.read()
    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    loop = asyncio.get_running_loop()
    group_encodings: list[np.ndarray] = await loop.run_in_executor(
        None,
        _extract_all_encodings_from_bytes,
        image_bytes,
    )

    if not group_encodings:
        logger.info("No faces detected in the group photo.")
        return {"presentStudentIds": [], "facesDetected": 0}

    logger.info("Detected %d face(s) in group photo.", len(group_encodings))

    # ── Tenant-scoped SELECT ──────────────────────────────────────────────────
    # $1 = institutionId: restricts the embedding pool to students who belong
    # to this institution only.  Without this filter every institution's face
    # embeddings would participate in the nearest-neighbour search, causing
    # false-positive matches across colleges.
    fetch_sql = """
        SELECT id, "faceEmbedding"::text AS embedding_text
        FROM   "StudentProfile"
        WHERE  "faceEmbedding" IS NOT NULL
          AND  "institutionId" = $1
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(fetch_sql, institutionId)

    if not rows:
        logger.info("No student embeddings are stored in the database yet.")
        return {"presentStudentIds": [], "facesDetected": len(group_encodings)}

    db_student_ids: list[int] = []
    db_embeddings: list[np.ndarray] = []

    for row in rows:
        student_id: int = row["id"]
        raw_text: str = row["embedding_text"]

        values = [float(v) for v in raw_text.strip("[]").split(",")]
        embedding_array = np.array(values, dtype=np.float64)

        db_student_ids.append(student_id)
        db_embeddings.append(embedding_array)

    matched_student_ids: set[int] = set()
    known_encodings_array = np.array(db_embeddings)

    for face_encoding in group_encodings:
        distances: np.ndarray = face_recognition.face_distance(
            known_encodings_array,
            face_encoding,
        )

        best_match_idx: int = int(np.argmin(distances))
        best_euclidean_distance: float = float(distances[best_match_idx])

        # Convert Euclidean distance to Cosine distance to match pgvector's scale
        best_cosine_distance: float = 0.5 * (best_euclidean_distance ** 2)

        logger.debug(
            "Face match – best_cosine_distance=%.4f threshold=%.2f → %s",
            best_cosine_distance,
            VECTOR_DISTANCE_THRESHOLD,
            "MATCH" if best_cosine_distance < VECTOR_DISTANCE_THRESHOLD else "NO MATCH",
        )

        if best_cosine_distance < VECTOR_DISTANCE_THRESHOLD:
            matched_student_ids.add(db_student_ids[best_match_idx])

    present_ids = sorted(matched_student_ids)
    logger.info(
        "Attendance result – %d face(s) detected, %d student(s) matched: %s",
        len(group_encodings),
        len(present_ids),
        present_ids,
    )

    return {
        "presentStudentIds": present_ids,
        "facesDetected": len(group_encodings),
        "studentsMatched": len(present_ids),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Health check  (not rate-limited – used by load balancers and monitoring)
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/health", include_in_schema=False)
async def health_check() -> dict[str, str]:
    """Simple liveness probe.  Returns 200 OK if the service is running."""
    return {"status": "ok", "service": "campuscore-facial-recognition"}


# ─────────────────────────────────────────────────────────────────────────────
# Entry point
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )