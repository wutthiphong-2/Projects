from fastapi import APIRouter, Depends, Query
from typing import List, Optional
import logging

from app.routers.auth import verify_token
from app.core.activity_log import activity_log_manager
from app.schemas.activity_logs import (
    EventLogData, ActivityLogResponse, ActivityLogListResponse, 
    StatsResponse, EventLogResponse, ActionTypeResponse
)

router = APIRouter()
logger = logging.getLogger(__name__)

# Routes
@router.get("/", response_model=ActivityLogListResponse)
async def get_activity_logs(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(50, ge=1, le=200, description="Items per page"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action_type: Optional[str] = Query(None, description="Filter by action type"),
    target_type: Optional[str] = Query(None, description="Filter by target type (user, group, ou)"),
    date_from: Optional[str] = Query(None, description="Filter from date (ISO format)"),
    date_to: Optional[str] = Query(None, description="Filter to date (ISO format)"),
    search: Optional[str] = Query(None, description="Search in target name and user name"),
    token_data = Depends(verify_token)
):
    """
    Get activity logs with filtering and pagination
    
    Query parameters:
    - page: Page number (default: 1)
    - page_size: Items per page (default: 50, max: 200)
    - user_id: Filter by user who performed the action
    - action_type: Filter by action type (e.g., 'user_create', 'password_reset')
    - target_type: Filter by target type (user, group, ou)
    - date_from: Filter activities from this date (ISO format)
    - date_to: Filter activities to this date (ISO format)
    - search: Search in target name and user display name
    """
    logger.info(f"📋 Fetching activity logs: page={page}, page_size={page_size}")
    
    result = activity_log_manager.get_activities(
        page=page,
        page_size=page_size,
        user_id=user_id,
        action_type=action_type,
        target_type=target_type,
        date_from=date_from,
        date_to=date_to,
        search=search
    )
    
    logger.info(f"✅ Returned {len(result['items'])} activities (total: {result['total']})")
    return result

@router.get("/recent", response_model=List[ActivityLogResponse])
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=50, description="Number of recent activities"),
    token_data = Depends(verify_token)
):
    """
    Get recent activities (for Dashboard display)
    
    Query parameters:
    - limit: Number of recent activities to return (default: 10, max: 50)
    """
    logger.info(f"📋 Fetching {limit} recent activities")
    
    result = activity_log_manager.get_activities(page=1, page_size=limit)
    
    return result['items']

@router.get("/stats", response_model=StatsResponse)
async def get_activity_stats(
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    token_data = Depends(verify_token)
):
    """
    Get activity statistics for the last N days
    
    Query parameters:
    - days: Number of days to look back (default: 30, max: 365)
    
    Returns:
    - total_actions: Total number of actions in the period
    - by_action_type: Breakdown by action type
    - by_user: Top 10 most active users
    - recent: 10 most recent activities
    - period_days: The period covered
    """
    logger.info(f"📊 Fetching activity stats for last {days} days")
    
    stats = activity_log_manager.get_stats(days=days)
    
    logger.info(f"✅ Stats: {stats['total_actions']} total actions")
    return stats

@router.get("/action-types", response_model=List[ActionTypeResponse])
async def get_action_types(token_data = Depends(verify_token)):
    """
    Get list of all available action types for filtering
    """
    action_types = [
        # Web-based actions
        ActionTypeResponse(value="user_create", label="สร้างผู้ใช้ (Web)", icon="UserAddOutlined", color="#10b981"),
        ActionTypeResponse(value="user_update", label="แก้ไขผู้ใช้ (Web)", icon="EditOutlined", color="#3b82f6"),
        ActionTypeResponse(value="user_delete", label="ลบผู้ใช้ (Web)", icon="DeleteOutlined", color="#ef4444"),
        ActionTypeResponse(value="password_reset", label="รีเซ็ตรหัสผ่าน (Web)", icon="KeyOutlined", color="#f59e0b"),
        ActionTypeResponse(value="user_status_change", label="เปลี่ยนสถานะ (Web)", icon="SwitchOutlined", color="#8b5cf6"),
        ActionTypeResponse(value="group_member_add", label="เพิ่มสมาชิกกลุ่ม (Web)", icon="UsergroupAddOutlined", color="#10b981"),
        ActionTypeResponse(value="group_member_remove", label="ลบสมาชิกกลุ่ม (Web)", icon="UsergroupDeleteOutlined", color="#ef4444"),
        ActionTypeResponse(value="ou_create", label="สร้าง OU (Web)", icon="FolderAddOutlined", color="#10b981"),
        ActionTypeResponse(value="ou_update", label="แก้ไข OU (Web)", icon="EditOutlined", color="#3b82f6"),
        ActionTypeResponse(value="ou_delete", label="ลบ OU (Web)", icon="FolderOutlined", color="#ef4444"),
        # AD Event Log actions (from Windows Event Log)
        ActionTypeResponse(value="user_enable", label="เปิดใช้งานผู้ใช้ (AD)", icon="CheckCircleOutlined", color="#10b981"),
        ActionTypeResponse(value="user_disable", label="ปิดใช้งานผู้ใช้ (AD)", icon="StopOutlined", color="#ef4444"),
        ActionTypeResponse(value="password_change_attempt", label="เปลี่ยนรหัสผ่าน (AD)", icon="KeyOutlined", color="#8b5cf6"),
        ActionTypeResponse(value="user_lockout", label="ล็อคบัญชี (AD)", icon="LockOutlined", color="#dc2626"),
        ActionTypeResponse(value="user_unlock", label="ปลดล็อคบัญชี (AD)", icon="UnlockOutlined", color="#10b981"),
        ActionTypeResponse(value="group_member_add_local", label="เพิ่มสมาชิก Local Group (AD)", icon="UsergroupAddOutlined", color="#f59e0b"),
        ActionTypeResponse(value="group_member_remove_local", label="ลบสมาชิก Local Group (AD)", icon="UsergroupDeleteOutlined", color="#f59e0b"),
    ]
    return action_types

@router.post("/from-event", response_model=EventLogResponse)
async def log_from_event(event_data: EventLogData, token_data = Depends(verify_token)):
    """
    Receive and log AD events from PowerShell script running on Domain Controller
    
    This endpoint allows PowerShell script to send Windows Event Log data
    for centralized activity logging.
    
    Expected data from PowerShell:
    - event_id: Windows Event ID (4720, 4738, etc.)
    - time_generated: Event timestamp
    - subject_username: User who performed the action
    - target_username: Target user affected
    - action_type: Mapped action type
    - details: Additional details including field changes
    """
    try:
        logger.info(f"📨 Received event from PowerShell: Event {event_data.event_id}")
        logger.info(f"   Subject: {event_data.subject_username}")
        logger.info(f"   Target: {event_data.target_username}")
        logger.info(f"   Action: {event_data.action_type}")
        
        # Log to activity database
        result = activity_log_manager.log_activity(
            user_id=event_data.subject_username,
            user_display_name=event_data.subject_username,
            action_type=event_data.action_type,
            target_type="user",
            target_id=f"CN={event_data.target_username},{event_data.target_domain or 'DC=TBKK,DC=CO,DC=TH'}",
            target_name=event_data.target_username,
            details=event_data.details or {},
            ip_address=event_data.ip_address,
            status="success"
        )
        
        if result:
            logger.info(f"✅ Event logged successfully")
            return EventLogResponse(
                success=True,
                message=f"Event {event_data.event_id} logged successfully",
                event_id=event_data.event_id
            )
        else:
            logger.error(f"❌ Failed to log event")
            return EventLogResponse(
                success=False,
                message="Failed to log event",
                event_id=event_data.event_id
            )
            
    except Exception as e:
        logger.error(f"❌ Error processing event from PowerShell: {e}")
        import traceback
        logger.error(traceback.format_exc())
        return EventLogResponse(
            success=False,
            message=f"Error: {str(e)}",
            event_id=event_data.event_id if hasattr(event_data, 'event_id') else 0
        )

