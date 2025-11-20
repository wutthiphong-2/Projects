"""
Group management schemas
"""
from pydantic import BaseModel
from typing import List, Optional

class GroupCreate(BaseModel):
    """Group creation request model"""
    cn: str
    sAMAccountName: Optional[str] = None  # Pre-Windows 2000 group name
    description: Optional[str] = None
    ou_dn: Optional[str] = None  # OU where group will be created
    groupType: Optional[str] = "Security"  # Security or Distribution
    groupScope: Optional[str] = "Global"  # Global, Domain Local, or Universal
    mail: Optional[str] = None  # Email address (for Distribution groups)
    info: Optional[str] = None  # Notes
    managedBy: Optional[str] = None  # DN of user who manages this group

class GroupResponse(BaseModel):
    """Group response model"""
    dn: str
    cn: str
    description: str
    member: List[str]
    memberCount: int = 0
    groupType: Optional[str] = None
    groupScope: Optional[str] = None
    managedBy: Optional[str] = None
    ouPath: Optional[str] = None  # OU path for tree structure
    parentOU: Optional[str] = None  # Parent OU name

class GroupUpdate(BaseModel):
    """Group update request model"""
    description: Optional[str] = None

class GroupMemberAdd(BaseModel):
    """Add member to group request model"""
    user_dn: str

class GroupMemberRemove(BaseModel):
    """Remove member from group request model"""
    user_dn: str

class GroupMemberResponse(BaseModel):
    """Group member response model"""
    dn: str
    cn: str
    sAMAccountName: Optional[str] = None
    mail: str
    department: Optional[str] = None
    isEnabled: bool

class GroupCreateResponse(BaseModel):
    """Group creation response model"""
    success: bool
    message: str
    group: dict

class GroupUpdateResponse(BaseModel):
    """Group update response model"""
    success: bool
    message: str

class GroupDeleteResponse(BaseModel):
    """Group delete response model"""
    success: bool
    message: str

class GroupMemberAddResponse(BaseModel):
    """Add member response model"""
    success: bool
    message: str
    user_dn: str
    user_cn: str
    groups_before: int
    groups_after: int
    already_member: Optional[bool] = False

class GroupMemberRemoveResponse(BaseModel):
    """Remove member response model"""
    success: bool
    message: str
    user_dn: str
    user_cn: str
    groups_before: int
    groups_after: int

class CategorizedGroupsResponse(BaseModel):
    """Categorized groups response model"""
    categories: dict
    totalGroups: int

