"""
API Schemas - Pydantic models for request/response validation
"""
from app.schemas.common import BaseResponse, SuccessResponse, ErrorResponse, PaginatedResponse
from app.schemas.auth import (
    LoginRequest, LoginResponse, TokenData, TokenVerifyResponse
)
from app.schemas.users import (
    UserCreate, UserUpdate, UserResponse, UserStatsResponse, LoginInsightEntry,
    UserCreateResponse, UserUpdateResponse, UserStatusToggleResponse, UserDeleteResponse,
    PasswordExpiryResponse
)
from app.schemas.groups import (
    GroupCreate, GroupUpdate, GroupResponse, GroupMemberAdd, 
    GroupMemberRemove, GroupMemberResponse, GroupCreateResponse,
    GroupUpdateResponse, GroupDeleteResponse, GroupMemberAddResponse,
    GroupMemberRemoveResponse, CategorizedGroupsResponse
)
from app.schemas.ous import (
    OUCreate, OUUpdate, OUResponse, OUCreateResponse, OUUpdateResponse,
    OUDeleteResponse, UserOUResponse, SuggestedGroupsResponse, DefaultGroupsByOUResponse
)
from app.schemas.activity_logs import (
    EventLogData, ActivityLogResponse, ActivityLogListResponse, StatsResponse,
    EventLogResponse, ActionTypeResponse
)
from app.schemas.api_keys import (
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, APIKeyCreateResponse, APIKeyUsageStats
)

__all__ = [
    # Common
    "BaseResponse",
    "SuccessResponse", 
    "ErrorResponse",
    "PaginatedResponse",
    # Auth
    "LoginRequest",
    "LoginResponse",
    "TokenData",
    "TokenVerifyResponse",
    # Users
    "UserCreate",
    "UserUpdate",
    "UserResponse",
    "UserStatsResponse",
    "LoginInsightEntry",
    "UserCreateResponse",
    "UserUpdateResponse",
    "UserStatusToggleResponse",
    "UserDeleteResponse",
    "PasswordExpiryResponse",
    # Groups
    "GroupCreate",
    "GroupUpdate",
    "GroupResponse",
    "GroupMemberAdd",
    "GroupMemberRemove",
    "GroupMemberResponse",
    "GroupCreateResponse",
    "GroupUpdateResponse",
    "GroupDeleteResponse",
    "GroupMemberAddResponse",
    "GroupMemberRemoveResponse",
    "CategorizedGroupsResponse",
    # OUs
    "OUCreate",
    "OUUpdate",
    "OUResponse",
    "OUCreateResponse",
    "OUUpdateResponse",
    "OUDeleteResponse",
    "UserOUResponse",
    "SuggestedGroupsResponse",
    "DefaultGroupsByOUResponse",
    # Activity Logs
    "EventLogData",
    "ActivityLogResponse",
    "ActivityLogListResponse",
    "StatsResponse",
    "EventLogResponse",
    "ActionTypeResponse",
    # API Keys
    "APIKeyCreate",
    "APIKeyUpdate",
    "APIKeyResponse",
    "APIKeyCreateResponse",
    "APIKeyUsageStats",
]

