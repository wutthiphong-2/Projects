from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi import Request as FastAPIRequest
from pydantic import BaseModel
from typing import Optional
from ldap3 import Server, Connection, ALL
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging

from app.core.config import settings
from app.core.database import get_ldap_connection
from app.core.token_storage import token_storage

router = APIRouter()
security = HTTPBearer(auto_error=False)  # Don't auto error, handle manually
logger = logging.getLogger(__name__)

# Pydantic models
class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict

class TokenData(BaseModel):
    username: Optional[str] = None

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

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    
    return token_data

def verify_token_or_api_key(
    request: FastAPIRequest,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)
):
    """
    Verify either JWT token or API key
    Priority: API Key > JWT Token
    """
    # Check for API key first
    api_key = request.headers.get("X-API-Key")
    if api_key:
        from app.core.api_keys import api_key_manager
        api_key_info = api_key_manager.validate_key(api_key)
        if api_key_info:
            # Return TokenData with API key info for compatibility
            return TokenData(username=f"api_key:{api_key_info['id']}")
    
    # Fall back to JWT token
    if credentials:
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(credentials.credentials, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise credentials_exception
            token_data = TokenData(username=username)
            return token_data
        except JWTError:
            raise credentials_exception
    
    # If neither is provided, raise error
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated. Please provide either Bearer token or X-API-Key header",
        headers={"WWW-Authenticate": "Bearer"},
    )

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
            raise Exception('LDAP authentication failed')
        
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

        # Store token information
        client_ip = get_client_ip(request)
        user_agent = request.headers.get("User-Agent")
        token_storage.store_token(
            token=access_token,
            user=login_data.username,
            expires_at=expires_at,
            ip_address=client_ip,
            user_agent=user_agent
        )

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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

@router.get("/verify")
async def verify_token_endpoint(
    token_data: TokenData = Depends(verify_token),
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Verify JWT token"""
    # Update token usage
    token_storage.update_token_usage(credentials.credentials)
    
    return {
        "valid": True,
        "user": {
            "username": token_data.username
        }
    }

@router.get("/tokens")
async def list_tokens(token_data: TokenData = Depends(verify_token)):
    """List all active tokens for the current user"""
    try:
        tokens = token_storage.list_user_tokens(token_data.username)
        return {"tokens": tokens}
    except Exception as e:
        logger.error(f"Error listing tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list tokens"
        )

class RevokeTokenRequest(BaseModel):
    token_hash: str

@router.post("/tokens/revoke")
async def revoke_token(
    revoke_data: RevokeTokenRequest,
    token_data: TokenData = Depends(verify_token)
):
    """Revoke a specific token"""
    try:
        # Verify token belongs to user
        tokens = token_storage.list_user_tokens(token_data.username)
        token_exists = any(t.get("full_token_hash") == revoke_data.token_hash for t in tokens)
        
        if not token_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Token not found or does not belong to user"
            )
        
        success = token_storage.revoke_token(revoke_data.token_hash)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Token not found"
            )
        
        return {"message": "Token revoked successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error revoking token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke token"
        )

@router.post("/tokens/revoke-all")
async def revoke_all_tokens(token_data: TokenData = Depends(verify_token)):
    """Revoke all tokens for the current user"""
    try:
        count = token_storage.revoke_all_user_tokens(token_data.username)
        return {
            "message": "All tokens revoked successfully",
            "revoked_count": count
        }
    except Exception as e:
        logger.error(f"Error revoking all tokens: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to revoke all tokens"
        )

@router.post("/logout")
async def logout():
    """Logout user (JWT tokens are stateless, so this is mainly for client-side cleanup)"""
    return {"message": "Logged out successfully"}
