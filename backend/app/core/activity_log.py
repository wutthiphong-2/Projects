import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Thailand timezone (UTC+7)
THAILAND_TZ = timezone(timedelta(hours=7))

# Database file paths
API_ACTIVITY_DB_PATH = Path(__file__).parent.parent.parent / "api_activity_log.db"
ACTIVITY_DB_PATH = Path(__file__).parent.parent.parent / "activity_log.db"


class ActivityLogManager:
    """Manage activity logging with SQLite database (supports both API key and general AD activities)"""
    
    def __init__(self):
        self.api_activity_db_path = API_ACTIVITY_DB_PATH
        self.activity_db_path = ACTIVITY_DB_PATH
        self._init_database()
        self._init_general_activity_database()
    
    def _init_database(self):
        """Initialize API activity log database"""
        try:
            conn = sqlite3.connect(str(self.api_activity_db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    action_type TEXT NOT NULL,
                    api_key_id TEXT,
                    api_key_name TEXT,
                    user TEXT NOT NULL,
                    details TEXT,
                    ip_address TEXT
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON api_activity_log(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_api_key_id 
                ON api_activity_log(api_key_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_action_type 
                ON api_activity_log(action_type)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user 
                ON api_activity_log(user)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ API activity log database initialized at {self.api_activity_db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing API activity log database: {e}")
            raise
    
    def _init_general_activity_database(self):
        """Initialize general activity log database for AD activities"""
        try:
            conn = sqlite3.connect(str(self.activity_db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS activity_log (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_display_name TEXT,
                    action_type TEXT NOT NULL,
                    target_type TEXT,
                    target_id TEXT,
                    target_name TEXT,
                    details TEXT,
                    ip_address TEXT,
                    status TEXT
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON activity_log(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_id 
                ON activity_log(user_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_action_type 
                ON activity_log(action_type)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_target_type 
                ON activity_log(target_type)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ General activity log database initialized at {self.activity_db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing general activity log database: {e}")
            raise
    
    def log_activity(
        self,
        action_type: str = None,
        user: str = None,
        api_key_id: Optional[str] = None,
        api_key_name: Optional[str] = None,
        details: Optional[str] = None,
        ip_address: Optional[str] = None,
        # For general AD activities
        user_id: Optional[str] = None,
        user_display_name: Optional[str] = None,
        target_type: Optional[str] = None,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        status: Optional[str] = None
    ) -> bool:
        """Log an activity - supports both API key activities and general AD activities"""
        try:
            timestamp = datetime.now(THAILAND_TZ).isoformat()
            
            # Determine if this is an API key activity or general AD activity
            if api_key_id is not None or api_key_name is not None:
                # API key activity
                conn = sqlite3.connect(str(self.api_activity_db_path))
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO api_activity_log 
                    (timestamp, action_type, api_key_id, api_key_name, user, details, ip_address)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    timestamp, action_type, api_key_id, api_key_name, user, details, ip_address
                ))
                
                conn.commit()
                conn.close()
            else:
                # General AD activity
                if not action_type:
                    action_type = "unknown"
                if not user_id:
                    user_id = user or "unknown"
                if not user_display_name:
                    user_display_name = user or user_id
                
                # Convert details to JSON string if it's a dict
                if isinstance(details, dict):
                    import json
                    details = json.dumps(details, ensure_ascii=False)
                
                conn = sqlite3.connect(str(self.activity_db_path))
                cursor = conn.cursor()
                
                cursor.execute("""
                    INSERT INTO activity_log 
                    (timestamp, user_id, user_display_name, action_type, target_type, target_id, target_name, details, ip_address, status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    timestamp, user_id, user_display_name, action_type, target_type, target_id, target_name, details, ip_address, status
                ))
                
                conn.commit()
                conn.close()
            
            return True
        except Exception as e:
            logger.error(f"❌ Error logging activity: {e}")
            import traceback
            logger.error(traceback.format_exc())
            return False
    
    def get_activity_log(
        self,
        action_type: Optional[str] = None,
        user: Optional[str] = None,
        api_key_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Dict[str, Any]:
        """Get API key activity log with filters"""
        try:
            conn = sqlite3.connect(str(self.api_activity_db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT id, timestamp, action_type, api_key_id, api_key_name, user, details, ip_address
                FROM api_activity_log
                WHERE 1=1
            """
            params = []
            
            if action_type:
                query += " AND action_type = ?"
                params.append(action_type)
            
            if user:
                query += " AND user = ?"
                params.append(user)
            
            if api_key_id:
                query += " AND api_key_id = ?"
                params.append(api_key_id)
            
            if start_date:
                query += " AND timestamp >= ?"
                params.append(start_date)
            
            if end_date:
                query += " AND timestamp <= ?"
                params.append(end_date)
            
            # Get total count
            count_query = query.replace(
                "SELECT id, timestamp, action_type, api_key_id, api_key_name, user, details, ip_address",
                "SELECT COUNT(*) as count"
            )
            cursor.execute(count_query, params)
            total = cursor.fetchone()["count"]
            
            # Get paginated results
            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()
            
            activities = []
            for row in rows:
                activities.append({
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "action_type": row["action_type"],
                    "api_key_id": row["api_key_id"],
                    "api_key_name": row["api_key_name"],
                    "user": row["user"],
                    "details": row["details"],
                    "ip_address": row["ip_address"]
                })
            
            return {
                "activities": activities,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        except Exception as e:
            logger.error(f"❌ Error getting activity log: {e}")
            raise
    
    def get_activities(
        self,
        page: int = 1,
        page_size: int = 50,
        user_id: Optional[str] = None,
        action_type: Optional[str] = None,
        target_type: Optional[str] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        search: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get general AD activities with pagination and filters"""
        try:
            conn = sqlite3.connect(str(self.activity_db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT id, timestamp, user_id, user_display_name, action_type, 
                       target_type, target_id, target_name, details, ip_address, status
                FROM activity_log
                WHERE 1=1
            """
            params = []
            
            if user_id:
                query += " AND user_id = ?"
                params.append(user_id)
            
            if action_type:
                query += " AND action_type = ?"
                params.append(action_type)
            
            if target_type:
                query += " AND target_type = ?"
                params.append(target_type)
            
            if date_from:
                query += " AND timestamp >= ?"
                params.append(date_from)
            
            if date_to:
                query += " AND timestamp <= ?"
                params.append(date_to)
            
            if search:
                query += " AND (target_name LIKE ? OR user_display_name LIKE ?)"
                params.extend([f"%{search}%", f"%{search}%"])
            
            # Get total count
            count_query = query.replace(
                "SELECT id, timestamp, user_id, user_display_name, action_type, target_type, target_id, target_name, details, ip_address, status",
                "SELECT COUNT(*) as count"
            )
            cursor.execute(count_query, params)
            count_result = cursor.fetchone()
            # Handle different SQLite row formats
            # sqlite3.Row can be accessed by index [0] or key ["count"]
            if count_result:
                # Try by index first (most reliable for COUNT queries)
                try:
                    total = int(count_result[0])
                except (IndexError, TypeError, ValueError):
                    # Fallback to key access
                    try:
                        total = int(count_result["count"])
                    except (KeyError, TypeError, ValueError):
                        # Last resort: try to get from dict conversion
                        try:
                            count_dict = dict(count_result) if hasattr(count_result, "keys") else {}
                            total = int(count_dict.get("count", count_dict.get("COUNT(*)", 0)))
                        except (ValueError, TypeError):
                            total = 0
            else:
                total = 0
            
            # Get paginated results
            offset = (page - 1) * page_size
            query += " ORDER BY timestamp DESC LIMIT ? OFFSET ?"
            params.extend([page_size, offset])
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()
            
            import json
            items = []
            for row in rows:
                details = row["details"]
                try:
                    if details:
                        details = json.loads(details)
                except (json.JSONDecodeError, TypeError):
                    pass
                
                items.append({
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "user_id": row["user_id"],
                    "user_display_name": row["user_display_name"],
                    "action_type": row["action_type"],
                    "target_type": row["target_type"],
                    "target_id": row["target_id"],
                    "target_name": row["target_name"],
                    "details": details,
                    "ip_address": row["ip_address"],
                    "status": row["status"]
                })
            
            total_pages = (total + page_size - 1) // page_size
            
            return {
                "items": items,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages
            }
        except Exception as e:
            logger.error(f"❌ Error getting activities: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise
    
    def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """Get activity statistics for the last N days"""
        try:
            conn = sqlite3.connect(str(self.activity_db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Calculate date threshold
            threshold_date = (datetime.now(THAILAND_TZ) - timedelta(days=days)).isoformat()
            
            # Total actions
            cursor.execute("""
                SELECT COUNT(*) as count
                FROM activity_log
                WHERE timestamp >= ?
            """, (threshold_date,))
            total_actions = cursor.fetchone()["count"]
            
            # By action type
            cursor.execute("""
                SELECT action_type, COUNT(*) as count
                FROM activity_log
                WHERE timestamp >= ?
                GROUP BY action_type
                ORDER BY count DESC
            """, (threshold_date,))
            by_action_type = [{"action_type": row["action_type"], "count": row["count"]} for row in cursor.fetchall()]
            
            # By user
            cursor.execute("""
                SELECT user_id, user_display_name, COUNT(*) as count
                FROM activity_log
                WHERE timestamp >= ?
                GROUP BY user_id, user_display_name
                ORDER BY count DESC
                LIMIT 10
            """, (threshold_date,))
            by_user = [{"user_id": row["user_id"], "user_display_name": row["user_display_name"], "count": row["count"]} for row in cursor.fetchall()]
            
            # Recent activities
            cursor.execute("""
                SELECT id, timestamp, user_id, user_display_name, action_type, target_type, target_name
                FROM activity_log
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT 10
            """, (threshold_date,))
            recent = []
            for row in cursor.fetchall():
                recent.append({
                    "id": row["id"],
                    "timestamp": row["timestamp"],
                    "user_id": row["user_id"],
                    "user_display_name": row["user_display_name"],
                    "action_type": row["action_type"],
                    "target_type": row["target_type"],
                    "target_name": row["target_name"]
                })
            
            conn.close()
            
            return {
                "total_actions": total_actions,
                "by_action_type": by_action_type,
                "by_user": by_user,
                "recent": recent,
                "period_days": days
            }
        except Exception as e:
            logger.error(f"❌ Error getting stats: {e}")
            import traceback
            logger.error(traceback.format_exc())
            raise


# Global instance
activity_log_manager = ActivityLogManager()
