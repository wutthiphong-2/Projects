"""
API Key Management Router
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from typing import List, Optional
from datetime import datetime
import logging

from app.core.api_keys import api_key_manager
from app.routers.auth import verify_token, get_client_ip
from app.schemas.api_keys import (
    APIKeyCreate,
    APIKeyUpdate,
    APIKeyResponse,
    APIKeyCreateResponse,
    APIKeyUsageStats,
    APIRequestLogListResponse
)
from app.schemas.auth import TokenData

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Create a new API key"""
    try:
        result = api_key_manager.create_api_key(
            name=key_data.name,
            created_by=token_data.username,
            permissions=key_data.permissions,
            rate_limit=key_data.rate_limit,
            expires_at=key_data.expires_at,
            ip_whitelist=key_data.ip_whitelist,
            description=key_data.description
        )
        
        # Log activity
        from app.core.activity_log import activity_log_manager
        activity_log_manager.log_activity(
            user_id=token_data.username,
            user_display_name=token_data.username,
            action_type="api_key_create",
            target_type="api_key",
            target_id=result["id"],
            target_name=result["name"],
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return APIKeyCreateResponse(
            success=True,
            message="API Key created successfully. Save this key now - it won't be shown again!",
            api_key=result["api_key"],
            key=APIKeyResponse(
                id=result["id"],
                name=result["name"],
                key_prefix=result["key_prefix"],
                created_by=result["created_by"],
                created_at=result["created_at"],
                expires_at=result["expires_at"],
                permissions=result["permissions"],
                rate_limit=result["rate_limit"],
                is_active=True,
                last_used_at=None,
                usage_count=0,
                ip_whitelist=result["ip_whitelist"],
                description=result["description"]
            )
        )
    except Exception as e:
        logger.error(f"❌ Error creating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create API key: {str(e)}"
        )


@router.get("/", response_model=List[APIKeyResponse])
async def get_api_keys(
    token_data: TokenData = Depends(verify_token)
):
    """Get all API keys (created by current user or all if admin)"""
    try:
        # For now, show only keys created by current user
        # TODO: Add admin check to show all keys
        keys = api_key_manager.get_api_keys(created_by=token_data.username)
        return [APIKeyResponse(**key) for key in keys]
    except Exception as e:
        logger.error(f"❌ Error getting API keys: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get API keys: {str(e)}"
        )


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Get API key by ID"""
    try:
        key = api_key_manager.get_api_key(key_id)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Check if user owns this key (or is admin)
        if key["created_by"] != token_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to access this API key"
            )
        
        # Validate and convert to response model
        try:
            return APIKeyResponse(**key)
        except Exception as validation_error:
            logger.error(f"❌ Validation error for API key {key_id}: {validation_error}")
            logger.error(f"   Key data: {key}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Invalid API key data format: {str(validation_error)}"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting API key: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get API key: {str(e)}"
        )


@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: str,
    key_data: APIKeyUpdate,
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Update API key"""
    try:
        # Check if key exists and user owns it
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if existing_key["created_by"] != token_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this API key"
            )
        
        # Update key
        success = api_key_manager.update_api_key(
            key_id=key_id,
            name=key_data.name,
            permissions=key_data.permissions,
            rate_limit=key_data.rate_limit,
            expires_at=key_data.expires_at,
            is_active=key_data.is_active,
            ip_whitelist=key_data.ip_whitelist,
            description=key_data.description
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update API key"
            )
        
        # Log activity
        from app.core.activity_log import activity_log_manager
        activity_log_manager.log_activity(
            user_id=token_data.username,
            user_display_name=token_data.username,
            action_type="api_key_update",
            target_type="api_key",
            target_id=key_id,
            target_name=existing_key["name"],
            ip_address=get_client_ip(request),
            status="success"
        )
        
        # Return updated key
        updated_key = api_key_manager.get_api_key(key_id)
        return APIKeyResponse(**updated_key)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error updating API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update API key: {str(e)}"
        )


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str,
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Delete API key"""
    try:
        # Check if key exists and user owns it
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if existing_key["created_by"] != token_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this API key"
            )
        
        success = api_key_manager.delete_api_key(key_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete API key"
            )
        
        # Log activity
        from app.core.activity_log import activity_log_manager
        activity_log_manager.log_activity(
            user_id=token_data.username,
            user_display_name=token_data.username,
            action_type="api_key_delete",
            target_type="api_key",
            target_id=key_id,
            target_name=existing_key["name"],
            ip_address=get_client_ip(request),
            status="success"
        )
        
        return None
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error deleting API key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete API key: {str(e)}"
        )


@router.get("/{key_id}/usage", response_model=APIKeyUsageStats)
async def get_api_key_usage(
    key_id: str,
    days: int = 30,
    token_data: TokenData = Depends(verify_token)
):
    """Get API key usage statistics"""
    try:
        # Check if key exists and user owns it
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if existing_key["created_by"] != token_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this API key's usage"
            )
        
        stats = api_key_manager.get_usage_stats(key_id, days=days)
        return APIKeyUsageStats(**stats)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting API key usage: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get usage statistics: {str(e)}"
        )


@router.get("/{key_id}/logs", response_model=APIRequestLogListResponse)
async def get_api_key_logs(
    key_id: str,
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    status_code: Optional[int] = Query(None, description="Filter by status code"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    token_data: TokenData = Depends(verify_token)
):
    """Get detailed request/response logs for an API key"""
    try:
        # Verify key exists and user owns it
        key = api_key_manager.get_api_key(key_id)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        if key["created_by"] != token_data.username:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to view this API key's logs"
            )
        
        logs = api_key_manager.get_request_logs(
            api_key_id=key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size
        )
        
        return APIRequestLogListResponse(**logs)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error getting API key logs: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get request logs: {str(e)}"
        )

