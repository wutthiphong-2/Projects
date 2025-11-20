"""
Common response models for standardized API responses
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, Generic, TypeVar

T = TypeVar('T')

class BaseResponse(BaseModel):
    """Base response model for all API responses"""
    success: bool
    message: str

class SuccessResponse(BaseResponse, Generic[T]):
    """Standard success response with optional data"""
    success: bool = True
    data: Optional[T] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "message": "Operation completed successfully",
                "data": {}
            }
        }

class ErrorResponse(BaseResponse):
    """Standard error response"""
    success: bool = False
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        json_schema_extra = {
            "example": {
                "success": False,
                "message": "An error occurred",
                "error_code": "INTERNAL_ERROR",
                "details": {}
            }
        }

class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated response"""
    items: list[T]
    total: int
    page: int
    page_size: int
    total_pages: int
    
    class Config:
        json_schema_extra = {
            "example": {
                "items": [],
                "total": 0,
                "page": 1,
                "page_size": 50,
                "total_pages": 0
            }
        }

