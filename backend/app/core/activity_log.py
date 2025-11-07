import sqlite3
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Thailand timezone (UTC+7)
THAILAND_TZ = timezone(timedelta(hours=7))

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "activity_log.db"

class ActivityLogger:
    """Manage activity logging with SQLite database"""
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create tables if not exists"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS activity_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_id TEXT NOT NULL,
                    user_display_name TEXT,
                    action_type TEXT NOT NULL,
                    target_type TEXT NOT NULL,
                    target_id TEXT,
                    target_name TEXT,
                    details TEXT,
                    ip_address TEXT,
                    status TEXT NOT NULL DEFAULT 'success'
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON activity_logs(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user_id 
                ON activity_logs(user_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_action_type 
                ON activity_logs(action_type)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ Activity log database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing activity log database: {e}")
            raise
    
    def log_activity(
        self,
        user_id: str,
        action_type: str,
        target_type: str,
        target_id: Optional[str] = None,
        target_name: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
        user_display_name: Optional[str] = None,
        ip_address: Optional[str] = None,
        status: str = "success"
    ) -> bool:
        """
        Log an activity to the database
        
        Args:
            user_id: Username of the person performing the action
            action_type: Type of action (e.g., 'user_create', 'password_reset')
            target_type: Type of target (e.g., 'user', 'group', 'ou')
            target_id: ID/DN of the target
            target_name: Display name of the target
            details: Additional details as dictionary (will be stored as JSON)
            user_display_name: Display name of the user
            ip_address: IP address of the client
            status: Status of the action ('success' or 'failed')
        
        Returns:
            bool: True if logged successfully, False otherwise
        """
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Use Thailand timezone (UTC+7)
            timestamp = datetime.now(THAILAND_TZ).isoformat()
            details_json = json.dumps(details, ensure_ascii=False) if details else None
            
            cursor.execute("""
                INSERT INTO activity_logs 
                (timestamp, user_id, user_display_name, action_type, target_type, 
                 target_id, target_name, details, ip_address, status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp, user_id, user_display_name, action_type, target_type,
                target_id, target_name, details_json, ip_address, status
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"📝 Activity logged: {user_id} -> {action_type} on {target_type}/{target_name}")
            return True
        except Exception as e:
            logger.error(f"❌ Error logging activity: {e}")
            return False
    
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
        """
        Get activity logs with filtering and pagination
        
        Args:
            page: Page number (1-indexed)
            page_size: Number of items per page
            user_id: Filter by user ID
            action_type: Filter by action type
            target_type: Filter by target type
            date_from: Filter from date (ISO format)
            date_to: Filter to date (ISO format)
            search: Search in target_name and user_display_name
        
        Returns:
            Dict with 'items', 'total', 'page', 'page_size'
        """
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Build WHERE clause
            where_conditions = []
            params = []
            
            if user_id:
                where_conditions.append("user_id = ?")
                params.append(user_id)
            
            if action_type:
                where_conditions.append("action_type = ?")
                params.append(action_type)
            
            if target_type:
                where_conditions.append("target_type = ?")
                params.append(target_type)
            
            if date_from:
                where_conditions.append("timestamp >= ?")
                params.append(date_from)
            
            if date_to:
                where_conditions.append("timestamp <= ?")
                params.append(date_to)
            
            if search:
                where_conditions.append("(target_name LIKE ? OR user_display_name LIKE ?)")
                search_pattern = f"%{search}%"
                params.extend([search_pattern, search_pattern])
            
            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
            
            # Get total count
            cursor.execute(f"SELECT COUNT(*) FROM activity_logs WHERE {where_clause}", params)
            total = cursor.fetchone()[0]
            
            # Get paginated results
            offset = (page - 1) * page_size
            query = f"""
                SELECT * FROM activity_logs 
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """
            cursor.execute(query, params + [page_size, offset])
            
            rows = cursor.fetchall()
            items = []
            for row in rows:
                item = dict(row)
                # Parse JSON details if present
                if item['details']:
                    try:
                        item['details'] = json.loads(item['details'])
                    except:
                        pass
                items.append(item)
            
            conn.close()
            
            return {
                'items': items,
                'total': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size
            }
        except Exception as e:
            logger.error(f"❌ Error getting activities: {e}")
            return {'items': [], 'total': 0, 'page': page, 'page_size': page_size, 'total_pages': 0}
    
    def get_stats(self, days: int = 30) -> Dict[str, Any]:
        """
        Get activity statistics for the last N days
        
        Args:
            days: Number of days to look back
        
        Returns:
            Dict with statistics
        """
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Calculate date threshold (Thailand time)
            date_threshold = datetime.now(THAILAND_TZ) - timedelta(days=days)
            date_threshold = date_threshold.isoformat()
            
            # Total actions
            cursor.execute(
                "SELECT COUNT(*) FROM activity_logs WHERE timestamp >= ?",
                (date_threshold,)
            )
            total_actions = cursor.fetchone()[0]
            
            # Actions by type
            cursor.execute("""
                SELECT action_type, COUNT(*) as count 
                FROM activity_logs 
                WHERE timestamp >= ?
                GROUP BY action_type
                ORDER BY count DESC
            """, (date_threshold,))
            by_action_type = [dict(row) for row in cursor.fetchall()]
            
            # Actions by user
            cursor.execute("""
                SELECT user_id, user_display_name, COUNT(*) as count 
                FROM activity_logs 
                WHERE timestamp >= ?
                GROUP BY user_id
                ORDER BY count DESC
                LIMIT 10
            """, (date_threshold,))
            by_user = [dict(row) for row in cursor.fetchall()]
            
            # Recent activities
            cursor.execute("""
                SELECT * FROM activity_logs 
                WHERE timestamp >= ?
                ORDER BY timestamp DESC
                LIMIT 10
            """, (date_threshold,))
            recent = []
            for row in cursor.fetchall():
                item = dict(row)
                if item['details']:
                    try:
                        item['details'] = json.loads(item['details'])
                    except:
                        pass
                recent.append(item)
            
            conn.close()
            
            return {
                'total_actions': total_actions,
                'by_action_type': by_action_type,
                'by_user': by_user,
                'recent': recent,
                'period_days': days
            }
        except Exception as e:
            logger.error(f"❌ Error getting stats: {e}")
            return {
                'total_actions': 0,
                'by_action_type': [],
                'by_user': [],
                'recent': [],
                'period_days': days
            }

# Global instance
activity_logger = ActivityLogger()

