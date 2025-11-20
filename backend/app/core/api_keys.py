"""
API Key Management System
Manages API keys for external API access
"""
import sqlite3
import secrets
import hashlib
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import json

logger = logging.getLogger(__name__)

# Database file path
API_KEYS_DB_PATH = Path(__file__).parent.parent.parent / "api_keys.db"


class APIKeyManager:
    """Manage API keys for external API access"""
    
    def __init__(self):
        self.db_path = API_KEYS_DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize API keys database"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # API Keys table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    key_hash TEXT NOT NULL UNIQUE,
                    key_prefix TEXT NOT NULL,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT,
                    permissions TEXT,
                    rate_limit INTEGER DEFAULT 100,
                    is_active INTEGER DEFAULT 1,
                    last_used_at TEXT,
                    usage_count INTEGER DEFAULT 0,
                    ip_whitelist TEXT,
                    description TEXT
                )
            """)
            
            # API Key Usage tracking table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_key_usage (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_key_id TEXT NOT NULL,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    status_code INTEGER,
                    response_time_ms INTEGER,
                    ip_address TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
                )
            """)
            
            # API Request/Response Logging table (detailed logs)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_request_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    api_key_id TEXT,
                    endpoint TEXT NOT NULL,
                    method TEXT NOT NULL,
                    request_headers TEXT,
                    request_body TEXT,
                    response_status INTEGER,
                    response_headers TEXT,
                    response_body TEXT,
                    response_time_ms INTEGER,
                    ip_address TEXT,
                    user_agent TEXT,
                    error_message TEXT,
                    timestamp TEXT NOT NULL,
                    FOREIGN KEY (api_key_id) REFERENCES api_keys(id)
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_api_key_hash 
                ON api_keys(key_hash)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_api_key_active 
                ON api_keys(is_active)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_usage_key 
                ON api_key_usage(api_key_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_usage_timestamp 
                ON api_key_usage(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_request_logs_key 
                ON api_request_logs(api_key_id)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_request_logs_timestamp 
                ON api_request_logs(timestamp DESC)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_request_logs_endpoint 
                ON api_request_logs(endpoint)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_usage_timestamp 
                ON api_key_usage(timestamp DESC)
            """)
            
            conn.commit()
            conn.close()
            logger.info("✅ API Keys database initialized")
        except Exception as e:
            logger.error(f"❌ Error initializing API keys database: {e}")
            raise
    
    def generate_api_key(self) -> tuple[str, str]:
        """
        Generate a new API key
        Returns: (api_key, key_hash)
        """
        # Generate random key: tbkk_ prefix + 32 random hex chars
        random_part = secrets.token_hex(32)
        api_key = f"tbkk_{random_part}"
        
        # Hash the key for storage
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        return api_key, key_hash
    
    def create_api_key(
        self,
        name: str,
        created_by: str,
        permissions: Optional[List[str]] = None,
        rate_limit: int = 100,
        expires_at: Optional[datetime] = None,
        ip_whitelist: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new API key"""
        try:
            key_id = str(uuid.uuid4())
            api_key, key_hash = self.generate_api_key()
            key_prefix = api_key[:12]  # tbkk_xxxxx for display
            
            now = datetime.now(timezone.utc).isoformat()
            expires_at_str = expires_at.isoformat() if expires_at else None
            
            permissions_json = json.dumps(permissions or [])
            ip_whitelist_json = json.dumps(ip_whitelist or [])
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO api_keys 
                (id, name, key_hash, key_prefix, created_by, created_at, expires_at, 
                 permissions, rate_limit, ip_whitelist, description)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                key_id, name, key_hash, key_prefix, created_by, now, expires_at_str,
                permissions_json, rate_limit, ip_whitelist_json, description
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ API Key created: {name} by {created_by}")
            
            return {
                "id": key_id,
                "name": name,
                "api_key": api_key,  # Only returned once!
                "key_prefix": key_prefix,
                "created_by": created_by,
                "created_at": now,
                "expires_at": expires_at_str,
                "permissions": permissions or [],
                "rate_limit": rate_limit,
                "ip_whitelist": ip_whitelist or [],
                "description": description
            }
        except Exception as e:
            logger.error(f"❌ Error creating API key: {e}")
            raise
    
    def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """
        Verify API key and return key info
        Returns dict with key info if valid, None if invalid, or raises exception if expired
        """
        try:
            key_hash = hashlib.sha256(api_key.encode()).hexdigest()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, key_prefix, created_by, created_at, expires_at,
                       permissions, rate_limit, is_active, ip_whitelist
                FROM api_keys
                WHERE key_hash = ? AND is_active = 1
            """, (key_hash,))
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return None
            
            # Check expiration
            if row[5]:  # expires_at
                expires_at = datetime.fromisoformat(row[5].replace('Z', '+00:00'))
                if datetime.now(timezone.utc) > expires_at:
                    logger.warning(f"API key expired: {row[1]} (expired at {expires_at})")
                    # Return special dict to indicate expiration
                    return {
                        "expired": True,
                        "name": row[1],
                        "expires_at": row[5]
                    }
            
            return {
                "id": row[0],
                "name": row[1],
                "key_prefix": row[2],
                "created_by": row[3],
                "created_at": row[4],
                "expires_at": row[5],
                "permissions": json.loads(row[6] or "[]"),
                "rate_limit": row[7],
                "is_active": bool(row[8]),
                "ip_whitelist": json.loads(row[9] or "[]")
            }
        except Exception as e:
            logger.error(f"❌ Error verifying API key: {e}")
            return None
    
    def get_api_keys(self, created_by: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get all API keys (optionally filtered by creator)"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            if created_by:
                cursor.execute("""
                    SELECT id, name, key_prefix, created_by, created_at, expires_at,
                           permissions, rate_limit, is_active, last_used_at, usage_count, ip_whitelist, description
                    FROM api_keys
                    WHERE created_by = ?
                    ORDER BY created_at DESC
                """, (created_by,))
            else:
                cursor.execute("""
                    SELECT id, name, key_prefix, created_by, created_at, expires_at,
                           permissions, rate_limit, is_active, last_used_at, usage_count, ip_whitelist, description
                    FROM api_keys
                    ORDER BY created_at DESC
                """)
            
            rows = cursor.fetchall()
            conn.close()
            
            keys = []
            for row in rows:
                # Parse JSON fields safely
                try:
                    permissions = json.loads(row[6] or "[]") if row[6] else []
                except:
                    permissions = []
                
                try:
                    ip_whitelist = json.loads(row[11] or "[]") if len(row) > 11 and row[11] else []
                except:
                    ip_whitelist = []
                
                keys.append({
                    "id": row[0],
                    "name": row[1],
                    "key_prefix": row[2],  # Only show prefix, not full key
                    "created_by": row[3],
                    "created_at": row[4],
                    "expires_at": row[5],
                    "permissions": permissions,
                    "rate_limit": row[7],
                    "is_active": bool(row[8]),
                    "last_used_at": row[9],
                    "usage_count": row[10] or 0,
                    "ip_whitelist": ip_whitelist,
                    "description": row[12] if len(row) > 12 else None
                })
            
            return keys
        except Exception as e:
            logger.error(f"❌ Error getting API keys: {e}")
            return []
    
    def get_api_key(self, key_id: str) -> Optional[Dict[str, Any]]:
        """Get API key by ID"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, key_prefix, created_by, created_at, expires_at,
                       permissions, rate_limit, is_active, last_used_at, usage_count,
                       ip_whitelist, description
                FROM api_keys
                WHERE id = ?
            """, (key_id,))
            
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return None
            
            # Parse JSON fields safely
            try:
                permissions = json.loads(row[6] or "[]") if row[6] else []
            except Exception as e:
                logger.warning(f"Failed to parse permissions for key {key_id}: {e}")
                permissions = []
            
            try:
                ip_whitelist = json.loads(row[11] or "[]") if len(row) > 11 and row[11] else []
            except Exception as e:
                logger.warning(f"Failed to parse ip_whitelist for key {key_id}: {e}")
                ip_whitelist = []
            
            result = {
                "id": row[0],
                "name": row[1],
                "key_prefix": row[2],
                "created_by": row[3],
                "created_at": row[4],
                "expires_at": row[5],
                "permissions": permissions,
                "rate_limit": row[7],
                "is_active": bool(row[8]),
                "last_used_at": row[9],
                "usage_count": row[10] or 0,
                "ip_whitelist": ip_whitelist,
                "description": row[12] if len(row) > 12 else None
            }
            
            conn.close()
            return result
        except Exception as e:
            logger.error(f"❌ Error getting API key: {e}")
            return None
    
    def update_api_key(
        self,
        key_id: str,
        name: Optional[str] = None,
        permissions: Optional[List[str]] = None,
        rate_limit: Optional[int] = None,
        expires_at: Optional[datetime] = None,
        is_active: Optional[bool] = None,
        ip_whitelist: Optional[List[str]] = None,
        description: Optional[str] = None
    ) -> bool:
        """Update API key"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if permissions is not None:
                updates.append("permissions = ?")
                params.append(json.dumps(permissions))
            if rate_limit is not None:
                updates.append("rate_limit = ?")
                params.append(rate_limit)
            if expires_at is not None:
                updates.append("expires_at = ?")
                params.append(expires_at.isoformat())
            if is_active is not None:
                updates.append("is_active = ?")
                params.append(1 if is_active else 0)
            if ip_whitelist is not None:
                updates.append("ip_whitelist = ?")
                params.append(json.dumps(ip_whitelist))
            if description is not None:
                updates.append("description = ?")
                params.append(description)
            
            if not updates:
                return False
            
            params.append(key_id)
            
            cursor.execute(f"""
                UPDATE api_keys
                SET {', '.join(updates)}
                WHERE id = ?
            """, params)
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ API Key updated: {key_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Error updating API key: {e}")
            return False
    
    def delete_api_key(self, key_id: str) -> bool:
        """Delete API key"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Delete usage records first
            cursor.execute("DELETE FROM api_key_usage WHERE api_key_id = ?", (key_id,))
            
            # Delete API key
            cursor.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ API Key deleted: {key_id}")
            return True
        except Exception as e:
            logger.error(f"❌ Error deleting API key: {e}")
            return False
    
    def record_usage(
        self,
        api_key_id: str,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: int,
        ip_address: Optional[str] = None
    ):
        """Record API key usage"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Insert usage record
            cursor.execute("""
                INSERT INTO api_key_usage 
                (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (api_key_id, endpoint, method, status_code, response_time_ms, ip_address, now))
            
            # Update last_used_at and usage_count
            cursor.execute("""
                UPDATE api_keys
                SET last_used_at = ?, usage_count = usage_count + 1
                WHERE id = ?
            """, (now, api_key_id))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error recording API key usage: {e}")
    
    def get_usage_stats(
        self,
        key_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """Get usage statistics for an API key"""
        try:
            since = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Total requests
            cursor.execute("""
                SELECT COUNT(*) FROM api_key_usage
                WHERE api_key_id = ? AND timestamp >= ?
            """, (key_id, since))
            total_requests = cursor.fetchone()[0]
            
            # Requests by endpoint
            cursor.execute("""
                SELECT endpoint, COUNT(*) as count
                FROM api_key_usage
                WHERE api_key_id = ? AND timestamp >= ?
                GROUP BY endpoint
                ORDER BY count DESC
                LIMIT 10
            """, (key_id, since))
            by_endpoint = [{"endpoint": row[0], "count": row[1]} for row in cursor.fetchall()]
            
            # Requests by status code
            cursor.execute("""
                SELECT status_code, COUNT(*) as count
                FROM api_key_usage
                WHERE api_key_id = ? AND timestamp >= ?
                GROUP BY status_code
                ORDER BY count DESC
            """, (key_id, since))
            by_status = [{"status_code": row[0], "count": row[1]} for row in cursor.fetchall()]
            
            # Average response time
            cursor.execute("""
                SELECT AVG(response_time_ms) FROM api_key_usage
                WHERE api_key_id = ? AND timestamp >= ?
            """, (key_id, since))
            avg_response_time = cursor.fetchone()[0] or 0
            
            # Requests per day
            cursor.execute("""
                SELECT DATE(timestamp) as date, COUNT(*) as count
                FROM api_key_usage
                WHERE api_key_id = ? AND timestamp >= ?
                GROUP BY DATE(timestamp)
                ORDER BY date DESC
            """, (key_id, since))
            per_day = [{"date": row[0], "count": row[1]} for row in cursor.fetchall()]
            
            conn.close()
            
            return {
                "total_requests": total_requests,
                "by_endpoint": by_endpoint,
                "by_status": by_status,
                "avg_response_time_ms": round(avg_response_time, 2),
                "requests_per_day": per_day,
                "period_days": days
            }
        except Exception as e:
            logger.error(f"❌ Error getting usage stats: {e}")
            return {
                "total_requests": 0,
                "by_endpoint": [],
                "by_status": [],
                "avg_response_time_ms": 0,
                "requests_per_day": [],
                "period_days": days
            }
    
    def log_request_response(
        self,
        api_key_id: Optional[str],
        endpoint: str,
        method: str,
        response_status: int,
        response_time_ms: int,
        request_headers: Optional[Dict[str, Any]] = None,
        request_body: Optional[str] = None,
        response_headers: Optional[Dict[str, Any]] = None,
        response_body: Optional[str] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_message: Optional[str] = None
    ):
        """Log detailed request/response for debugging and audit"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            # Truncate large bodies (keep first 10KB for debugging)
            max_body_size = 10240
            if request_body and len(request_body) > max_body_size:
                request_body = request_body[:max_body_size] + f"\n... (truncated, {len(request_body)} bytes total)"
            if response_body and len(response_body) > max_body_size:
                response_body = response_body[:max_body_size] + f"\n... (truncated, {len(response_body)} bytes total)"
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO api_request_logs 
                (api_key_id, endpoint, method, request_headers, request_body, 
                 response_status, response_headers, response_body, response_time_ms,
                 ip_address, user_agent, error_message, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                api_key_id,
                endpoint,
                method,
                json.dumps(request_headers) if request_headers else None,
                request_body,
                response_status,
                json.dumps(response_headers) if response_headers else None,
                response_body,
                response_time_ms,
                ip_address,
                user_agent,
                error_message,
                now
            ))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error logging request/response: {e}")
    
    def get_request_logs(
        self,
        api_key_id: Optional[str] = None,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        page: int = 1,
        page_size: int = 50
    ) -> Dict[str, Any]:
        """Get request logs with filtering and pagination"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Build WHERE clause
            conditions = []
            params = []
            
            if api_key_id:
                conditions.append("api_key_id = ?")
                params.append(api_key_id)
            if endpoint:
                conditions.append("endpoint LIKE ?")
                params.append(f"%{endpoint}%")
            if method:
                conditions.append("method = ?")
                params.append(method)
            if status_code:
                conditions.append("response_status = ?")
                params.append(status_code)
            if date_from:
                conditions.append("timestamp >= ?")
                params.append(date_from)
            if date_to:
                conditions.append("timestamp <= ?")
                params.append(date_to)
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            
            # Get total count
            cursor.execute(f"""
                SELECT COUNT(*) FROM api_request_logs
                WHERE {where_clause}
            """, params)
            total = cursor.fetchone()[0]
            
            # Get paginated results
            offset = (page - 1) * page_size
            cursor.execute(f"""
                SELECT id, api_key_id, endpoint, method, request_headers, request_body,
                       response_status, response_headers, response_body, response_time_ms,
                       ip_address, user_agent, error_message, timestamp
                FROM api_request_logs
                WHERE {where_clause}
                ORDER BY timestamp DESC
                LIMIT ? OFFSET ?
            """, params + [page_size, offset])
            
            rows = cursor.fetchall()
            conn.close()
            
            logs = []
            for row in rows:
                try:
                    logs.append({
                        "id": row[0],
                        "api_key_id": row[1],
                        "endpoint": row[2],
                        "method": row[3],
                        "request_headers": json.loads(row[4]) if row[4] else None,
                        "request_body": row[5],
                        "response_status": row[6],
                        "response_headers": json.loads(row[7]) if row[7] else None,
                        "response_body": row[8],
                        "response_time_ms": row[9],
                        "ip_address": row[10],
                        "user_agent": row[11],
                        "error_message": row[12],
                        "timestamp": row[13]
                    })
                except Exception as e:
                    logger.warning(f"Error parsing log row: {e}")
                    continue
            
            return {
                "items": logs,
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": (total + page_size - 1) // page_size
            }
        except Exception as e:
            logger.error(f"❌ Error getting request logs: {e}")
            return {"items": [], "total": 0, "page": 1, "page_size": page_size, "total_pages": 0}


# Global instance
api_key_manager = APIKeyManager()

