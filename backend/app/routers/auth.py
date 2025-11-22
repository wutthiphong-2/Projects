from fastapi import APIRouter, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request as FastAPIRequest
from typing import Optional
from ldap3 import Server, Connection, ALL
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging

from app.core.config import settings
from app.core.database import get_ldap_connection
from app.core.exceptions import UnauthorizedError
from app.schemas.auth import LoginRequest, LoginResponse, TokenData, TokenVerifyResponse

router = APIRouter()
security = HTTPBearer(auto_error=False)  # Don't auto error, handle manually
logger = logging.getLogger(__name__)

# JWT functions
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
    return encoded_jwt

def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Verify JWT token and return token data"""
    if not credentials:
        raise UnauthorizedError("Could not validate credentials")
    
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise UnauthorizedError("Could not validate credentials")
        token_data = TokenData(username=username)
    except JWTError:
        raise UnauthorizedError("Could not validate credentials")
    
    return token_data


def verify_token_or_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    request: Request = None
):
    """
    Verify either JWT token or API key
    Tries JWT first, then falls back to API key
    """
    if not credentials:
        raise UnauthorizedError("Authentication required. Provide JWT token or API key in Authorization header")
    
    token = credentials.credentials
    
    # Try JWT token first
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username:
            return TokenData(username=username)
    except JWTError:
        # Not a JWT token, try API key
        pass
    
    # Try API key
    try:
        from app.core.api_key_auth import api_key_auth
        from app.core.exceptions import UnauthorizedError as APIUnauthorizedError
        key_info = api_key_auth.verify_api_key(credentials, request)
        if key_info:
            # Return TokenData with API key info
            return TokenData(username=f"api_key:{key_info['id']}")
    except APIUnauthorizedError as e:
        # Re-raise with original message (includes expired info)
        raise UnauthorizedError(str(e))
    except Exception as e:
        logger.debug(f"API key verification failed: {e}")
    
    raise UnauthorizedError("Invalid authentication token or API key")


def get_client_ip(request: Request) -> Optional[str]:
    """Extract client IP address from request"""
    # Try X-Forwarded-For header first (for proxies)
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    # Try X-Real-IP header
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fall back to direct client
    if request.client:
        return request.client.host
    
    return None


# Routes
@router.post("/login", response_model=LoginResponse)
async def login(login_data: LoginRequest, request: Request):
    """Authenticate user with LDAP"""
    try:
        # Create LDAP connection for user authentication
        server = Server(settings.LDAP_URL, get_info=ALL)
        # Try binding with UPN (username@domain) first, then fallback to CN=username,... format
        user_dn_candidates = [
            f"{login_data.username}@{settings.LDAP_BASE_DN.replace('DC=', '').replace(',DC=', '.')}",
            f"CN={login_data.username},CN=Users,{settings.LDAP_BASE_DN}"
        ]

        user_conn = None
        last_error = None
        for user_dn in user_dn_candidates:
            try:
                user_conn = Connection(server, user=user_dn, password=login_data.password, auto_bind=True)
                break
            except Exception as e:
                last_error = e

        if not user_conn:
            logger.error(f"LDAP bind failed for user {login_data.username}: {last_error}")
            from app.core.exceptions import UnauthorizedError
            raise UnauthorizedError("Invalid username or password")
        
        # If successful, create JWT token
        access_token_expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        expires_at = datetime.utcnow() + access_token_expires_delta
        access_token = create_access_token(
            data={"sub": login_data.username}, expires_delta=access_token_expires_delta
        )

        # Return the DN used for the authenticated user
        user_dn = None
        try:
            # Connection.user may be a tuple or string depending on ldap3; fallback to candidate DN
            if hasattr(user_conn, 'user') and user_conn.user:
                user_dn = user_conn.user
            else:
                user_dn = f"CN={login_data.username},CN=Users,{settings.LDAP_BASE_DN}"
        except Exception:
            user_dn = f"CN={login_data.username},CN=Users,{settings.LDAP_BASE_DN}"

        try:
            user_conn.unbind()
        except Exception:
            pass

        return LoginResponse(
            access_token=access_token,
            token_type="bearer",
            user={
                "username": login_data.username,
                "dn": user_dn
            }
        )
    except Exception as e:
        logger.error(f"LDAP authentication failed for user {login_data.username}: {e}")
        raise UnauthorizedError("Invalid username or password")

@router.get("/verify", response_model=TokenVerifyResponse)
async def verify_token_endpoint(
    token_data: TokenData = Depends(verify_token)
):
    """Verify JWT token"""
    return TokenVerifyResponse(
        valid=True,
        user={"username": token_data.username}
    )

@router.post("/logout")
async def logout():
    """Logout user (JWT tokens are stateless, so this is mainly for client-side cleanup)"""
    from app.schemas.common import SuccessResponse
    return SuccessResponse(message="Logged out successfully")
