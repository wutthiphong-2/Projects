"""
API Key Management Router
Provides CRUD operations for API keys
"""
from fastapi import APIRouter, Depends, status, Query
from typing import Optional, List
import logging

from app.core.api_keys import api_key_manager
from app.routers.auth import verify_token, TokenData
from app.core.exceptions import NotFoundError, InternalServerError, ValidationError
from app.schemas.api_keys import (
    APIKeyCreate, APIKeyUpdate, APIKeyResponse, APIKeyCreateResponse,
    APIKeyUsageStats, APIRequestLogListResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("", response_model=APIKeyCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    key_data: APIKeyCreate,
    token_data: TokenData = Depends(verify_token)
):
    """
    Create a new API key
    
    The API key will be returned only once. Make sure to save it securely.
    """
    try:
        # Get username from token
        username = token_data.username
        
        # Create API key
        result = api_key_manager.create_api_key(
            name=key_data.name,
            created_by=username,
            permissions=key_data.permissions,
            rate_limit=key_data.rate_limit,
            expires_at=key_data.expires_at,
            ip_whitelist=key_data.ip_whitelist,
            description=key_data.description
        )
        
        # Build response
        key_response = APIKeyResponse(
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
        
        return APIKeyCreateResponse(
            success=True,
            message="API key created successfully. Save this key securely - it will not be shown again.",
            api_key=result["api_key"],  # Full key shown only once!
            key=key_response
        )
    except Exception as e:
        logger.error(f"Error creating API key: {e}")
        raise InternalServerError("Failed to create API key")


@router.get("", response_model=List[APIKeyResponse])
async def list_api_keys(
    token_data: TokenData = Depends(verify_token)
):
    """Get all API keys (created by current user or all if admin)"""
    try:
        username = token_data.username
        
        # For now, return all keys (can add admin check later)
        keys = api_key_manager.get_api_keys()
        
        # Convert to response models
        return [
            APIKeyResponse(
                id=key["id"],
                name=key["name"],
                key_prefix=key["key_prefix"],
                created_by=key["created_by"],
                created_at=key["created_at"],
                expires_at=key["expires_at"],
                permissions=key["permissions"],
                rate_limit=key["rate_limit"],
                is_active=key["is_active"],
                last_used_at=key["last_used_at"],
                usage_count=key["usage_count"],
                ip_whitelist=key["ip_whitelist"],
                description=key["description"]
            )
            for key in keys
        ]
    except Exception as e:
        logger.error(f"Error listing API keys: {e}")
        raise InternalServerError("Failed to list API keys")


@router.get("/{key_id}", response_model=APIKeyResponse)
async def get_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Get API key by ID"""
    try:
        key = api_key_manager.get_api_key(key_id)
        
        if not key:
            raise NotFoundError(f"API key not found: {key_id}")
        
        return APIKeyResponse(
            id=key["id"],
            name=key["name"],
            key_prefix=key["key_prefix"],
            created_by=key["created_by"],
            created_at=key["created_at"],
            expires_at=key["expires_at"],
            permissions=key["permissions"],
            rate_limit=key["rate_limit"],
            is_active=key["is_active"],
            last_used_at=key["last_used_at"],
            usage_count=key["usage_count"],
            ip_whitelist=key["ip_whitelist"],
            description=key["description"]
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting API key: {e}")
        raise InternalServerError("Failed to get API key")


@router.put("/{key_id}", response_model=APIKeyResponse)
async def update_api_key(
    key_id: str,
    key_data: APIKeyUpdate,
    token_data: TokenData = Depends(verify_token)
):
    """Update API key"""
    try:
        # Check if key exists
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise NotFoundError(f"API key not found: {key_id}")
        
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
            raise InternalServerError("Failed to update API key")
        
        # Get updated key
        updated_key = api_key_manager.get_api_key(key_id)
        
        return APIKeyResponse(
            id=updated_key["id"],
            name=updated_key["name"],
            key_prefix=updated_key["key_prefix"],
            created_by=updated_key["created_by"],
            created_at=updated_key["created_at"],
            expires_at=updated_key["expires_at"],
            permissions=updated_key["permissions"],
            rate_limit=updated_key["rate_limit"],
            is_active=updated_key["is_active"],
            last_used_at=updated_key["last_used_at"],
            usage_count=updated_key["usage_count"],
            ip_whitelist=updated_key["ip_whitelist"],
            description=updated_key["description"]
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error updating API key: {e}")
        raise InternalServerError("Failed to update API key")


@router.delete("/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_api_key(
    key_id: str,
    token_data: TokenData = Depends(verify_token)
):
    """Delete API key"""
    try:
        # Check if key exists
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise NotFoundError(f"API key not found: {key_id}")
        
        # Delete key
        success = api_key_manager.delete_api_key(key_id)
        
        if not success:
            raise InternalServerError("Failed to delete API key")
        
        return None
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error deleting API key: {e}")
        raise InternalServerError("Failed to delete API key")


@router.post("/{key_id}/rotate", response_model=APIKeyCreateResponse)
async def rotate_api_key(
    key_id: str,
    grace_period_days: int = Query(7, ge=0, le=30, description="Grace period in days (old key remains valid)"),
    token_data: TokenData = Depends(verify_token)
):
    """
    Rotate (regenerate) an API key
    
    Updates the existing API key with a new key value, keeping the same ID and metadata.
    Note: The old key will immediately stop working when rotated.
    """
    try:
        # Check if key exists
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise NotFoundError(f"API key not found: {key_id}")
        
        # Regenerate the key (updates key_hash and key_prefix in place)
        new_api_key, new_key_hash = api_key_manager.regenerate_api_key(key_id)
        
        # Update description to note the rotation
        from datetime import datetime, timezone
        rotation_time = datetime.now(timezone.utc).isoformat()
        rotation_description = f"Rotated on {rotation_time}"
        if existing_key.get('description'):
            rotation_description = f"{existing_key['description']} | {rotation_description}"
        
        # Update the key metadata (reset expiration, update description)
        api_key_manager.update_api_key(
            key_id=key_id,
            expires_at=None,  # Reset expiration
            description=rotation_description,
            is_active=True  # Ensure it's active
        )
        
        # Get updated key info
        updated_key = api_key_manager.get_api_key(key_id)
        
        # Build response
        key_response = APIKeyResponse(
            id=updated_key["id"],
            name=updated_key["name"],
            key_prefix=updated_key["key_prefix"],
            created_by=updated_key["created_by"],
            created_at=updated_key["created_at"],
            expires_at=updated_key["expires_at"],
            permissions=updated_key["permissions"],
            rate_limit=updated_key["rate_limit"],
            is_active=updated_key["is_active"],
            last_used_at=updated_key["last_used_at"],
            usage_count=updated_key["usage_count"],
            ip_whitelist=updated_key["ip_whitelist"],
            description=updated_key["description"]
        )
        
        logger.info(f"API key {key_id} rotated successfully (in-place update)")
        
        return APIKeyCreateResponse(
            success=True,
            message="API key rotated successfully. The old key has been replaced and will no longer work.",
            api_key=new_api_key,  # New key shown only once!
            key=key_response
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error rotating API key: {e}")
        raise InternalServerError("Failed to rotate API key")


@router.get("/{key_id}/stats", response_model=APIKeyUsageStats)
async def get_api_key_stats(
    key_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    token_data: TokenData = Depends(verify_token)
):
    """Get usage statistics for an API key"""
    try:
        # Check if key exists
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise NotFoundError(f"API key not found: {key_id}")
        
        # Get stats
        stats = api_key_manager.get_usage_stats(key_id, days=days)
        
        return APIKeyUsageStats(
            total_requests=stats["total_requests"],
            by_endpoint=stats["by_endpoint"],
            by_status=stats["by_status"],
            avg_response_time_ms=stats["avg_response_time_ms"],
            requests_per_day=stats["requests_per_day"],
            period_days=stats["period_days"]
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting API key stats: {e}")
        raise InternalServerError("Failed to get API key statistics")


@router.get("/{key_id}/logs", response_model=APIRequestLogListResponse)
async def get_api_key_logs(
    key_id: str,
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    status_code: Optional[int] = Query(None, description="Filter by status code"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    token_data: TokenData = Depends(verify_token)
):
    """Get request logs for an API key"""
    try:
        # Check if key exists
        existing_key = api_key_manager.get_api_key(key_id)
        if not existing_key:
            raise NotFoundError(f"API key not found: {key_id}")
        
        # Get logs
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
        
        from app.schemas.api_keys import APIRequestLog
        
        return APIRequestLogListResponse(
            items=[
                APIRequestLog(
                    id=log["id"],
                    api_key_id=log["api_key_id"],
                    endpoint=log["endpoint"],
                    method=log["method"],
                    request_headers=log["request_headers"],
                    request_body=log["request_body"],
                    response_status=log["response_status"],
                    response_headers=log["response_headers"],
                    response_body=log["response_body"],
                    response_time_ms=log["response_time_ms"],
                    ip_address=log["ip_address"],
                    user_agent=log["user_agent"],
                    error_message=log["error_message"],
                    timestamp=log["timestamp"]
                )
                for log in logs["items"]
            ],
            total=logs["total"],
            page=logs["page"],
            page_size=logs["page_size"],
            total_pages=logs["total_pages"]
        )
    except NotFoundError:
        raise
    except Exception as e:
        logger.error(f"Error getting API key logs: {e}")
        raise InternalServerError("Failed to get API key logs")


@router.get("/logs/all", response_model=APIRequestLogListResponse)
async def get_all_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    api_key_id: Optional[str] = Query(None, description="Filter by API key ID"),
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    method: Optional[str] = Query(None, description="Filter by HTTP method"),
    status_code: Optional[int] = Query(None, description="Filter by status code"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    token_data: TokenData = Depends(verify_token)
):
    """Get all request logs (across all API keys)"""
    try:
        # Get logs without api_key_id filter
        logs = api_key_manager.get_request_logs(
            api_key_id=api_key_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            date_from=date_from,
            date_to=date_to,
            page=page,
            page_size=page_size
        )
        
        from app.schemas.api_keys import APIRequestLog
        
        return APIRequestLogListResponse(
            items=[
                APIRequestLog(
                    id=log["id"],
                    api_key_id=log["api_key_id"],
                    endpoint=log["endpoint"],
                    method=log["method"],
                    request_headers=log["request_headers"],
                    request_body=log["request_body"],
                    response_status=log["response_status"],
                    response_headers=log["response_headers"],
                    response_body=log["response_body"],
                    response_time_ms=log["response_time_ms"],
                    ip_address=log["ip_address"],
                    user_agent=log["user_agent"],
                    error_message=log["error_message"],
                    timestamp=log["timestamp"]
                )
                for log in logs["items"]
            ],
            total=logs["total"],
            page=logs["page"],
            page_size=logs["page_size"],
            total_pages=logs["total_pages"]
        )
    except Exception as e:
        logger.error(f"Error getting all logs: {e}")
        raise InternalServerError("Failed to get logs")
