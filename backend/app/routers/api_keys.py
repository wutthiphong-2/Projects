from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.core.api_keys import api_key_manager
from app.core.permissions import validate_scopes, get_all_scopes
from app.routers.auth import verify_token, TokenData

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models
class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    permissions: Optional[List[str]] = None  # List of permission scopes


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_hour: Optional[int] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None  # List of permission scopes


class APIKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: str
    last_used_at: Optional[str] = None
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    is_active: bool
    permissions: List[str]  # List of permission scopes


class APIKeyCreateResponse(BaseModel):
    id: str
    api_key: str  # Only returned on creation
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: str
    rate_limit_per_minute: int
    rate_limit_per_hour: int
    is_active: bool
    permissions: List[str]  # List of permission scopes


# Routes
@router.get("/", response_model=List[APIKeyResponse])
async def list_api_keys(
    token_data: TokenData = Depends(verify_token)
):
    """List all API keys"""
    try:
        keys = api_key_manager.list_keys()
        return keys
    except Exception as e:
        logger.error(f"Error listing API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to list API keys"
        )


@router.get("/scopes")
async def get_available_scopes(
    token_data: TokenData = Depends(verify_token)
):
    """Get list of all available permission scopes"""
    try:
        scopes = get_all_scopes()
        return {"scopes": scopes}
    except Exception as e:
        logger.error(f"Error getting scopes: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get scopes"
        )


@router.post("/", response_model=APIKeyCreateResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    token_data: TokenData = Depends(verify_token)
):
    """Create a new API key"""
    try:
        # Validate permissions if provided
        if key_data.permissions is not None:
            is_valid, error_msg = validate_scopes(key_data.permissions)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
        
        result = api_key_manager.create_key(
            name=key_data.name,
            created_by=token_data.username,
            description=key_data.description,
            rate_limit_per_minute=key_data.rate_limit_per_minute,
            rate_limit_per_hour=key_data.rate_limit_per_hour,
            permissions=key_data.permissions
        )
        return result
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create API key"
        )


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Get API key by ID"""
    try:
        key = api_key_manager.get_key(key_id)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        return key
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get API key"
        )


@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: str,
    key_data: APIKeyUpdate,
    token_data: TokenData = Depends(verify_token)
):
    """Update API key"""
    try:
        # Validate permissions if provided
        if key_data.permissions is not None:
            is_valid, error_msg = validate_scopes(key_data.permissions)
            if not is_valid:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=error_msg
                )
        
        key = api_key_manager.update_key(
            key_id=key_id,
            name=key_data.name,
            description=key_data.description,
            rate_limit_per_minute=key_data.rate_limit_per_minute,
            rate_limit_per_hour=key_data.rate_limit_per_hour,
            is_active=key_data.is_active,
            permissions=key_data.permissions
        )
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        return key
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Error updating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        logger.error(f"Error updating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update API key"
        )


@router.delete("/{key_id}")
async def delete_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Delete API key"""
    try:
        deleted = api_key_manager.delete_key(key_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        return {"message": "API key deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete API key"
        )


@router.post("/{key_id}/regenerate", response_model=APIKeyCreateResponse)
async def regenerate_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Regenerate API key (returns new key)"""
    try:
        result = api_key_manager.regenerate_key(key_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        return result
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error regenerating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate API key"
        )


# Helper function for validating API key from header
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> Optional[dict]:
    """Verify API key from X-API-Key header"""
    if not x_api_key:
        return None
    
    return api_key_manager.validate_key(x_api_key)

