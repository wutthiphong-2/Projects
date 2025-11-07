from fastapi import APIRouter, HTTPException, Depends, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional
from ldap3 import Server, Connection, ALL
from jose import JWTError, jwt
from datetime import datetime, timedelta
import logging

from app.core.config import settings
from app.core.database import get_ldap_connection

router = APIRouter()
security = HTTPBearer()
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
async def login(login_data: LoginRequest):
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
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": login_data.username}, expires_delta=access_token_expires
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
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

@router.get("/verify")
async def verify_token_endpoint(token_data: TokenData = Depends(verify_token)):
    """Verify JWT token"""
    return {
        "valid": True,
        "user": {
            "username": token_data.username
        }
    }

@router.post("/logout")
async def logout():
    """Logout user (JWT tokens are stateless, so this is mainly for client-side cleanup)"""
    return {"message": "Logged out successfully"}
