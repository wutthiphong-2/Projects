from fastapi import APIRouter, HTTPException, Depends, status, Query
from typing import Optional
import logging

from app.core.api_usage import api_usage_logger
from app.routers.auth import verify_token, TokenData

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/stats")
async def get_usage_stats(
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    api_key_id: Optional[str] = Query(None, description="Filter by API key ID"),
    token_data: TokenData = Depends(verify_token)
):
    """Get API usage statistics"""
    try:
        stats = api_usage_logger.get_statistics(days=days, api_key_id=api_key_id)
        return stats
    except Exception as e:
        logger.error(f"Error getting usage stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )


@router.get("/by-key/{key_id}")
async def get_usage_by_key(
    key_id: str,
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    token_data: TokenData = Depends(verify_token)
):
    """Get usage statistics for a specific API key"""
    try:
        stats = api_usage_logger.get_usage_by_key(api_key_id=key_id, days=days)
        return stats
    except Exception as e:
        logger.error(f"Error getting usage by key: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get usage statistics"
        )


@router.get("/endpoints")
async def get_endpoint_stats(
    endpoint: Optional[str] = Query(None, description="Filter by endpoint"),
    days: int = Query(7, ge=1, le=30, description="Number of days to include"),
    token_data: TokenData = Depends(verify_token)
):
    """Get statistics by endpoint"""
    try:
        stats = api_usage_logger.get_endpoint_stats(endpoint=endpoint, days=days)
        return stats
    except Exception as e:
        logger.error(f"Error getting endpoint stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get endpoint statistics"
        )

