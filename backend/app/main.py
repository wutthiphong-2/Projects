from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
import uvicorn
import asyncio
from dotenv import load_dotenv
from app.core.config import settings
from app.core.database import init_ldap_connection
from app.routers import auth as auth_router
from app.routers import users as users_router
from app.routers import groups as groups_router
from app.routers import ous as ous_router
from app.routers import activity_logs as activity_logs_router
from app.routers import api_keys as api_keys_router
from app.routers import api_usage as api_usage_router
from app.routers import api_endpoints as api_endpoints_router
from app.core.middleware import RateLimitMiddleware, PermissionMiddleware, APIUsageLoggingMiddleware
import logging

# Setup logging
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle application startup and shutdown"""
    # Startup
    try:
        # Try to initialize LDAP connection (non-blocking if it fails)
        # Server will still start even if LDAP connection fails
        try:
            init_ldap_connection()
            logger.info("🚀 Application started - Ready to receive AD events from PowerShell script")
        except Exception as e:
            logger.warning(f"⚠️ LDAP connection failed during startup (server will continue): {e}")
            logger.info("🚀 Application started (LDAP connection will be retried on first use)")
    except asyncio.CancelledError:
        # Startup cancelled - this is normal during shutdown
        logger.info("🛑 Startup cancelled (normal shutdown)")
        raise
    except Exception as e:
        logger.error(f"❌ Failed to initialize application: {e}")
    
    # Application running
    try:
        yield
    except asyncio.CancelledError:
        # Normal shutdown - don't log as error
        pass
    except Exception as e:
        logger.error(f"❌ Error during application runtime: {e}")
    
    # Shutdown cleanup
    try:
        logger.info("🛑 Application shutting down gracefully...")
    except asyncio.CancelledError:
        # Already cancelled, ignore
        pass
    except Exception as e:
        logger.warning(f"⚠️ Error during shutdown: {e}")

# Create FastAPI app with lifespan
app = FastAPI(
    title="AD Management API",
    description="API for managing Active Directory users, groups, and OUs",
    version="1.0.0",
    lifespan=lifespan
)

# Exception handler for validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Log and return validation errors in detail"""
    logger.error("❌ Validation Error:")
    logger.error(f"   URL: {request.url}")
    logger.error(f"   Method: {request.method}")
    
    # Log each validation error
    for error in exc.errors():
        logger.error(f"   Field: {' > '.join(str(loc) for loc in error['loc'])}")
        logger.error(f"   Message: {error['msg']}")
        logger.error(f"   Type: {error['type']}")
        if 'input' in error:
            logger.error(f"   Input: {error['input']}")
    
    # Return the default FastAPI validation error response
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": exc.errors()}
    )

# CORS middleware - Allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=False,  # Must be False when allow_origins is "*"
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add API key authentication and rate limiting middlewares
# Order matters: rate limit -> permission -> usage logging
app.add_middleware(RateLimitMiddleware)
app.add_middleware(PermissionMiddleware)
app.add_middleware(APIUsageLoggingMiddleware)

# Routers
app.include_router(auth_router.router, prefix="/api/auth", tags=["auth"])
app.include_router(users_router.router, prefix="/api/users", tags=["users"])
app.include_router(groups_router.router, prefix="/api/groups", tags=["groups"])
app.include_router(ous_router.router, prefix="/api/ous", tags=["ous"])
app.include_router(activity_logs_router.router, prefix="/api/activity-logs", tags=["activity-logs"])
app.include_router(api_keys_router.router, prefix="/api/api-keys", tags=["api-keys"])
app.include_router(api_usage_router.router, prefix="/api/api-usage", tags=["api-usage"])
app.include_router(api_endpoints_router.router, prefix="/api/api-endpoints", tags=["api-endpoints"])

@app.get("/")
async def root():
    return {
        "message": "AD Management API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z",
        "version": "1.0.0"
    }

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )