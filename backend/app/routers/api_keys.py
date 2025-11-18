from fastapi import APIRouter, HTTPException, Depends, status, Header
from pydantic import BaseModel
from typing import Optional, List
import logging

from app.core.api_keys import api_key_manager
from app.core.permissions import validate_scopes, get_all_scopes
from app.core.activity_log import activity_log_manager
from app.core.email import email_service
from app.core.config import settings
from app.routers.auth import verify_token, TokenData, get_client_ip
from fastapi import Request
from pydantic import EmailStr

router = APIRouter()
logger = logging.getLogger(__name__)


# Pydantic models
class SMTPConfig(BaseModel):
    """SMTP configuration for email sending"""
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None


class APIKeyCreate(BaseModel):
    name: str
    description: Optional[str] = None
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    permissions: Optional[List[str]] = None  # List of permission scopes
    expires_at: Optional[str] = None  # ISO format datetime string
    send_email: bool = False  # Send email notification on creation
    user_email: Optional[str] = None  # Email to send to (defaults to user's email)
    smtp_config: Optional[SMTPConfig] = None  # Optional SMTP settings override


class APIKeyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    rate_limit_per_minute: Optional[int] = None
    rate_limit_per_hour: Optional[int] = None
    is_active: Optional[bool] = None
    permissions: Optional[List[str]] = None  # List of permission scopes
    expires_at: Optional[str] = None  # ISO format datetime string


class APIKeyResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    created_by: str
    created_at: str
    last_used_at: Optional[str] = None
    expires_at: Optional[str] = None
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
    expires_at: Optional[str] = None
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


@router.get("/activity-log")
async def get_activity_log(
    action_type: Optional[str] = None,
    user: Optional[str] = None,
    api_key_id: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    token_data: TokenData = Depends(verify_token)
):
    """Get API key activity log"""
    try:
        result = activity_log_manager.get_activity_log(
            action_type=action_type,
            user=user,
            api_key_id=api_key_id,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset
        )
        return result
    except Exception as e:
        logger.error(f"Error getting activity log: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get activity log"
        )


@router.post("/", response_model=APIKeyCreateResponse)
async def create_api_key(
    key_data: APIKeyCreate,
    request: Request,
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
            permissions=key_data.permissions,
            expires_at=key_data.expires_at
        )
        
        # Log activity
        activity_log_manager.log_activity(
            action_type="CREATE_KEY",
            user=token_data.username,
            api_key_id=result["id"],
            api_key_name=result["name"],
            details=f"Created API key: {result['name']}",
            ip_address=get_client_ip(request)
        )
        
        # Send email if requested
        if key_data.send_email:
            email_address = key_data.user_email or f"{token_data.username}@example.com"  # Default email
            
            # Prepare SMTP override if provided
            smtp_override = None
            if key_data.smtp_config:
                smtp_override = key_data.smtp_config.model_dump(exclude_none=True)
            
            email_service.send_api_key_created(
                to_email=email_address,
                api_key_name=result["name"],
                api_key=result["api_key"],  # This is only available on creation
                created_by=token_data.username,
                expires_at=result.get("expires_at"),
                smtp_override=smtp_override
            )
            activity_log_manager.log_activity(
                action_type="SEND_EMAIL",
                user=token_data.username,
                api_key_id=result["id"],
                api_key_name=result["name"],
                details=f"Sent creation email to: {email_address}",
                ip_address=get_client_ip(request)
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
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Update API key"""
    try:
        # Get existing key for logging
        existing_key = api_key_manager.get_key(key_id)
        
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
            permissions=key_data.permissions,
            expires_at=key_data.expires_at
        )
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Log activity
        activity_log_manager.log_activity(
            action_type="UPDATE_KEY",
            user=token_data.username,
            api_key_id=key_id,
            api_key_name=key["name"],
            details=f"Updated API key: {key['name']}",
            ip_address=get_client_ip(request)
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
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Delete API key"""
    try:
        # Get key info before deletion for logging
        key = api_key_manager.get_key(key_id)
        
        deleted = api_key_manager.delete_key(key_id)
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Log activity
        if key:
            activity_log_manager.log_activity(
                action_type="DELETE_KEY",
                user=token_data.username,
                api_key_id=key_id,
                api_key_name=key.get("name"),
                details=f"Deleted API key: {key.get('name', key_id)}",
                ip_address=get_client_ip(request)
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
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Regenerate API key (returns new key)"""
    try:
        # Get key info before regeneration for logging
        key = api_key_manager.get_key(key_id)
        
        result = api_key_manager.regenerate_key(key_id)
        if not result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Log activity
        activity_log_manager.log_activity(
            action_type="REGENERATE_KEY",
            user=token_data.username,
            api_key_id=key_id,
            api_key_name=result.get("name"),
            details=f"Regenerated API key: {result.get('name', key_id)}",
            ip_address=get_client_ip(request)
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


class SendEmailRequest(BaseModel):
    emails: List[str]  # List of email addresses
    message: Optional[str] = None


class SendToSelfRequest(BaseModel):
    message: Optional[str] = None
    user_email: Optional[str] = None


@router.post("/{key_id}/send-email")
async def send_share_email(
    key_id: str,
    email_data: SendEmailRequest,
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Send share email for API key"""
    try:
        # Get API key info
        key = api_key_manager.get_key(key_id)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Send email (don't send actual API key, just invitation)
        api_base_url = f"{request.url.scheme}://{request.url.netloc}"
        success = email_service.send_api_key_shared(
            to_emails=email_data.emails,
            api_key_name=key["name"],
            shared_by=token_data.username,
            message=email_data.message,
            api_base_url=api_base_url
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email"
            )
        
        # Log activity
        activity_log_manager.log_activity(
            action_type="SEND_EMAIL",
            user=token_data.username,
            api_key_id=key_id,
            api_key_name=key["name"],
            details=f"Sent share email to: {', '.join(email_data.emails)}",
            ip_address=get_client_ip(request)
        )
        
        return {"message": "Email sent successfully", "recipients": email_data.emails}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending share email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )


@router.post("/{key_id}/send-to-self")
async def send_to_self_email(
    key_id: str,
    email_data: SendToSelfRequest,
    request: Request,
    token_data: TokenData = Depends(verify_token)
):
    """Send API key to user's own email"""
    try:
        # Get API key info
        key = api_key_manager.get_key(key_id)
        if not key:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="API key not found"
            )
        
        # Try to get temporarily stored API key (only available right after creation/regeneration)
        api_key = api_key_manager.get_temp_key(key_id)
        if not api_key:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="API key cannot be retrieved. This endpoint only works within 1 hour after creating or regenerating the key. Please regenerate the key to get a new one."
            )
        
        # Get user email (default to username@domain)
        user_email = email_data.user_email if email_data.user_email else f"{token_data.username}@example.com"
        
        # Send email with actual API key
        try:
            success = email_service.send_api_key_to_self(
                to_email=user_email,
                api_key_name=key["name"],
                api_key=api_key,
                message=email_data.message
            )
            
            if not success:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to send email. Please check SMTP configuration."
                )
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to send email: {str(e)}"
            )
        
        # Log activity
        activity_log_manager.log_activity(
            action_type="SEND_EMAIL",
            user=token_data.username,
            api_key_id=key_id,
            api_key_name=key["name"],
            details=f"Sent API key to self email: {user_email}",
            ip_address=get_client_ip(request)
        )
        
        return {"message": "Email sent successfully", "recipient": user_email}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error sending to self email: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send email"
        )


# Helper function for validating API key from header
async def verify_api_key(x_api_key: Optional[str] = Header(None)) -> Optional[dict]:
    """Verify API key from X-API-Key header"""
    if not x_api_key:
        return None
    
    return api_key_manager.validate_key(x_api_key)

