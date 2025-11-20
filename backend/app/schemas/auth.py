"""
Authentication schemas
"""
from pydantic import BaseModel
from typing import Optional, Dict

class LoginRequest(BaseModel):
    """Login request model"""
    username: str
    password: str
    
    class Config:
        json_schema_extra = {
            "example": {
                "username": "john.doe",
                "password": "SecurePassword123!"
            }
        }

class LoginResponse(BaseModel):
    """Login response model"""
    access_token: str
    token_type: str
    user: Dict[str, str]
    
    class Config:
        json_schema_extra = {
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "username": "john.doe",
                    "dn": "CN=john.doe,CN=Users,DC=example,DC=com"
                }
            }
        }

class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None

class TokenVerifyResponse(BaseModel):
    """Token verification response"""
    valid: bool
    user: Dict[str, Optional[str]]
    
    class Config:
        json_schema_extra = {
            "example": {
                "valid": True,
                "user": {
                    "username": "john.doe"
                }
            }
        }

