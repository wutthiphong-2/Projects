"""
Activity log schemas
"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class EventLogData(BaseModel):
    """Data from PowerShell script (Windows Event Log)"""
    event_id: int
    time_generated: str
    subject_username: str
    target_username: str
    target_domain: Optional[str] = None
    action_type: str
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = "Event Log"

class ActivityLogResponse(BaseModel):
    """Activity log response model"""
    id: int
    timestamp: str
    user_id: str
    user_display_name: Optional[str]
    action_type: str
    target_type: str
    target_id: Optional[str]
    target_name: Optional[str]
    details: Optional[Dict[str, Any]]
    ip_address: Optional[str]
    status: str

class ActivityLogListResponse(BaseModel):
    """Activity log list response model"""
    items: List[ActivityLogResponse]
    total: int
    page: int
    page_size: int
    total_pages: int

class StatsResponse(BaseModel):
    """Activity statistics response model"""
    total_actions: int
    by_action_type: List[Dict[str, Any]]
    by_user: List[Dict[str, Any]]
    recent: List[Dict[str, Any]]
    period_days: int

class EventLogResponse(BaseModel):
    """Event log response model"""
    success: bool
    message: str
    event_id: int

class ActionTypeResponse(BaseModel):
    """Action type response model"""
    value: str
    label: str
    icon: str
    color: str

