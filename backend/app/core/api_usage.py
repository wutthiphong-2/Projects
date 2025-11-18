import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging

logger = logging.getLogger(__name__)

# Thailand timezone (UTC+7)
THAILAND_TZ = timezone(timedelta(hours=7))

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "api_usage.db"


class APIUsageLogger:
    """Manage API usage logging with SQLite database"""
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create tables if not exists"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    api_key_id TEXT,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    status_code INTEGER,
                    response_time REAL,
                    ip_address TEXT
                )
            """)
            
            # Create indexes for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_timestamp 
                ON api_usage(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_api_key_id 
                ON api_usage(api_key_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_endpoint 
                ON api_usage(endpoint)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ API usage database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing API usage database: {e}")
            raise
    
    def log_usage(
        self,
        endpoint: str,
        method: str,
        status_code: int,
        response_time: float,
        api_key_id: Optional[str] = None,
        ip_address: Optional[str] = None
    ) -> bool:
        """Log API usage"""
        try:
            timestamp = datetime.now(THAILAND_TZ).isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO api_usage 
                (timestamp, api_key_id, endpoint, method, status_code, response_time, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                timestamp, api_key_id, endpoint, method, status_code, response_time, ip_address
            ))
            
            conn.commit()
            conn.close()
            
            return True
        except Exception as e:
            logger.error(f"❌ Error logging API usage: {e}")
            return False
    
    def get_statistics(
        self,
        days: int = 7,
        api_key_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get API usage statistics"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Calculate date range
            end_date = datetime.now(THAILAND_TZ)
            start_date = end_date - timedelta(days=days)
            start_date_str = start_date.isoformat()
            
            # Base query
            query = """
                SELECT 
                    COUNT(*) as total_requests,
                    COUNT(DISTINCT api_key_id) as unique_keys,
                    AVG(response_time) as avg_response_time,
                    MAX(response_time) as max_response_time,
                    MIN(response_time) as min_response_time,
                    SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
                FROM api_usage
                WHERE timestamp >= ?
            """
            params = [start_date_str]
            
            if api_key_id:
                query += " AND api_key_id = ?"
                params.append(api_key_id)
            
            cursor.execute(query, params)
            row = cursor.fetchone()
            
            # Get requests by endpoint
            endpoint_query = """
                SELECT 
                    endpoint,
                    method,
                    COUNT(*) as count,
                    AVG(response_time) as avg_response_time
                FROM api_usage
                WHERE timestamp >= ?
            """
            endpoint_params = [start_date_str]
            
            if api_key_id:
                endpoint_query += " AND api_key_id = ?"
                endpoint_params.append(api_key_id)
            
            endpoint_query += " GROUP BY endpoint, method ORDER BY count DESC LIMIT 10"
            
            cursor.execute(endpoint_query, endpoint_params)
            top_endpoints = [
                {
                    "endpoint": row["endpoint"],
                    "method": row["method"],
                    "count": row["count"],
                    "avg_response_time": round(row["avg_response_time"] or 0, 2)
                }
                for row in cursor.fetchall()
            ]
            
            # Get requests by day
            daily_query = """
                SELECT 
                    DATE(timestamp) as date,
                    COUNT(*) as count
                FROM api_usage
                WHERE timestamp >= ?
            """
            daily_params = [start_date_str]
            
            if api_key_id:
                daily_query += " AND api_key_id = ?"
                daily_params.append(api_key_id)
            
            daily_query += " GROUP BY DATE(timestamp) ORDER BY date ASC"
            
            cursor.execute(daily_query, daily_params)
            daily_stats = [
                {
                    "date": row["date"],
                    "count": row["count"]
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
            
            return {
                "period_days": days,
                "total_requests": row["total_requests"] or 0,
                "unique_keys": row["unique_keys"] or 0,
                "avg_response_time": round(row["avg_response_time"] or 0, 2),
                "max_response_time": round(row["max_response_time"] or 0, 2),
                "min_response_time": round(row["min_response_time"] or 0, 2),
                "success_count": row["success_count"] or 0,
                "error_count": row["error_count"] or 0,
                "top_endpoints": top_endpoints,
                "daily_stats": daily_stats
            }
        except Exception as e:
            logger.error(f"❌ Error getting statistics: {e}")
            raise
    
    def get_usage_by_key(
        self,
        api_key_id: str,
        days: int = 7
    ) -> Dict[str, Any]:
        """Get usage statistics for a specific API key"""
        return self.get_statistics(days=days, api_key_id=api_key_id)
    
    def get_endpoint_stats(
        self,
        endpoint: Optional[str] = None,
        days: int = 7
    ) -> List[Dict[str, Any]]:
        """Get statistics by endpoint"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            end_date = datetime.now(THAILAND_TZ)
            start_date = end_date - timedelta(days=days)
            start_date_str = start_date.isoformat()
            
            query = """
                SELECT 
                    endpoint,
                    method,
                    COUNT(*) as total_requests,
                    AVG(response_time) as avg_response_time,
                    MAX(response_time) as max_response_time,
                    MIN(response_time) as min_response_time,
                    SUM(CASE WHEN status_code >= 200 AND status_code < 300 THEN 1 ELSE 0 END) as success_count,
                    SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) as error_count
                FROM api_usage
                WHERE timestamp >= ?
            """
            params = [start_date_str]
            
            if endpoint:
                query += " AND endpoint = ?"
                params.append(endpoint)
            
            query += " GROUP BY endpoint, method ORDER BY total_requests DESC"
            
            cursor.execute(query, params)
            results = [
                {
                    "endpoint": row["endpoint"],
                    "method": row["method"],
                    "total_requests": row["total_requests"],
                    "avg_response_time": round(row["avg_response_time"] or 0, 2),
                    "max_response_time": round(row["max_response_time"] or 0, 2),
                    "min_response_time": round(row["min_response_time"] or 0, 2),
                    "success_count": row["success_count"],
                    "error_count": row["error_count"]
                }
                for row in cursor.fetchall()
            ]
            
            conn.close()
            return results
        except Exception as e:
            logger.error(f"❌ Error getting endpoint stats: {e}")
            raise


# Global instance
api_usage_logger = APIUsageLogger()

