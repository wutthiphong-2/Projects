"""
Standardized API Response Helpers
Utility functions for creating consistent API responses
"""
from typing import List, Optional, TypeVar, Generic, Any, Dict
from fastapi import status
from fastapi.responses import JSONResponse
from app.schemas.common import PaginatedResponse, SuccessResponse, ErrorResponse

T = TypeVar('T')


def create_paginated_response(
    items: List[T],
    total: int,
    page: int,
    page_size: int,
    model_class: Optional[type] = None
) -> PaginatedResponse:
    """
    Create a standardized paginated response
    
    Args:
        items: List of items for current page
        total: Total number of items
        page: Current page number
        page_size: Items per page
        model_class: Optional Pydantic model class for validation
    
    Returns:
        PaginatedResponse with calculated total_pages
    """
    total_pages = (total + page_size - 1) // page_size if page_size > 0 else 0
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


def create_success_response(
    message: str = "Operation completed successfully",
    data: Optional[Any] = None
) -> SuccessResponse:
    """
    Create a standardized success response
    
    Args:
        message: Success message
        data: Optional data to include
    
    Returns:
        SuccessResponse
    """
    return SuccessResponse(
        success=True,
        message=message,
        data=data
    )


def create_error_response(
    message: str,
    error_code: str = "INTERNAL_ERROR",
    details: Optional[Dict[str, Any]] = None,
    status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
) -> JSONResponse:
    """
    Create a standardized error response
    
    Args:
        message: Error message
        error_code: Error code
        details: Optional error details
        status_code: HTTP status code
    
    Returns:
        JSONResponse with error format
    """
    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error_code": error_code,
            "message": message,
            "details": details or {}
        }
    )

