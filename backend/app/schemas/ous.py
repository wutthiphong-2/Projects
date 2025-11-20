"""
Organizational Unit (OU) management schemas
"""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class OUCreate(BaseModel):
    """OU creation request model"""
    name: str
    description: Optional[str] = None

class OUResponse(BaseModel):
    """OU response model"""
    dn: str
    name: str
    description: str

class OUUpdate(BaseModel):
    """OU update request model"""
    description: Optional[str] = None

class OUCreateResponse(BaseModel):
    """OU creation response model"""
    success: bool
    message: str
    ou: dict

class OUUpdateResponse(BaseModel):
    """OU update response model"""
    success: bool
    message: str

class OUDeleteResponse(BaseModel):
    """OU delete response model"""
    success: bool
    message: str

class UserOUResponse(BaseModel):
    """User OU response model (for user creation)"""
    dn: str
    name: str
    fullPath: str
    description: Optional[str] = None

class SuggestedGroupsResponse(BaseModel):
    """Suggested groups for OU response model"""
    ou: str
    totalUsers: int
    threshold: float
    suggestedGroups: List[Dict[str, Any]]
    message: Optional[str] = None

class DefaultGroupsByOUResponse(BaseModel):
    """Default groups by OU response model"""
    department: Optional[str] = None
    group_names: List[str]
    total_users: int

