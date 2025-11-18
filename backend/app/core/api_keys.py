import sqlite3
import secrets
import hashlib
import json
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, Any, List
import logging

from app.core.permissions import DEFAULT_PERMISSIONS, validate_scopes
from app.core.cache import SimpleCache

logger = logging.getLogger(__name__)

# Thailand timezone (UTC+7)
THAILAND_TZ = timezone(timedelta(hours=7))

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "api_keys.db"


class APIKeyManager:
    """Manage API keys with SQLite database"""
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_database()
        # Temporary storage for API keys (for email sending after creation/regeneration)
        self._temp_key_storage = SimpleCache()
    
    def _init_database(self):
        """Initialize database and create tables if not exists"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS api_keys (
                    id TEXT PRIMARY KEY,
                    key_hash TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    description TEXT,
                    created_by TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    last_used_at TEXT,
                    expires_at TEXT,
                    rate_limit_per_minute INTEGER DEFAULT 60,
                    rate_limit_per_hour INTEGER DEFAULT 1000,
                    is_active INTEGER DEFAULT 1,
                    permissions TEXT DEFAULT '[]'
                )
            """)
            
            # Migration: Add permissions column if it doesn't exist
            try:
                cursor.execute("ALTER TABLE api_keys ADD COLUMN permissions TEXT DEFAULT '[]'")
                # Migrate existing keys to have default permissions
                default_perms_json = json.dumps(DEFAULT_PERMISSIONS)
                cursor.execute("""
                    UPDATE api_keys 
                    SET permissions = ? 
                    WHERE permissions IS NULL OR permissions = ''
                """, (default_perms_json,))
                conn.commit()
                logger.info("✅ Migrated existing API keys to include permissions")
            except sqlite3.OperationalError:
                # Column already exists, skip migration
                pass
            
            # Migration: Add expires_at column if it doesn't exist
            try:
                cursor.execute("ALTER TABLE api_keys ADD COLUMN expires_at TEXT")
                conn.commit()
                logger.info("✅ Migrated existing API keys to include expires_at")
            except sqlite3.OperationalError:
                # Column already exists, skip migration
                pass
            
            # Create indexes for better query performance
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_key_hash 
                ON api_keys(key_hash)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_created_by 
                ON api_keys(created_by)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_is_active 
                ON api_keys(is_active)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ API keys database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing API keys database: {e}")
            raise
    
    def _hash_key(self, key: str) -> str:
        """Hash API key using SHA-256"""
        return hashlib.sha256(key.encode()).hexdigest()
    
    def _generate_key_id(self) -> str:
        """Generate unique key ID"""
        return secrets.token_urlsafe(16)
    
    def _generate_api_key(self) -> str:
        """Generate a new API key"""
        # Generate a secure random key (64 characters)
        return f"ak_{secrets.token_urlsafe(48)}"
    
    def create_key(
        self,
        name: str,
        created_by: str,
        description: Optional[str] = None,
        rate_limit_per_minute: int = 60,
        rate_limit_per_hour: int = 1000,
        permissions: Optional[List[str]] = None,
        expires_at: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new API key"""
        try:
            # Validate permissions
            if permissions is None:
                permissions = DEFAULT_PERMISSIONS.copy()
            
            is_valid, error_msg = validate_scopes(permissions)
            if not is_valid:
                raise ValueError(error_msg)
            
            key_id = self._generate_key_id()
            api_key = self._generate_api_key()
            key_hash = self._hash_key(api_key)
            created_at = datetime.now(THAILAND_TZ).isoformat()
            permissions_json = json.dumps(permissions)
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT INTO api_keys 
                (id, key_hash, name, description, created_by, created_at, expires_at,
                 rate_limit_per_minute, rate_limit_per_hour, is_active, permissions)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                key_id, key_hash, name, description, created_by, created_at, expires_at,
                rate_limit_per_minute, rate_limit_per_hour, 1, permissions_json
            ))
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ API key created: {key_id} by {created_by} with permissions: {permissions}")
            
            # Store API key temporarily for email sending (expires in 1 hour)
            self._temp_key_storage.set(f"api_key_{key_id}", api_key, ttl_seconds=3600)
            
            return {
                "id": key_id,
                "api_key": api_key,  # Return plain key only once
                "name": name,
                "description": description,
                "created_by": created_by,
                "created_at": created_at,
                "rate_limit_per_minute": rate_limit_per_minute,
                "rate_limit_per_hour": rate_limit_per_hour,
                "is_active": True,
                "permissions": permissions,
                "expires_at": expires_at
            }
        except Exception as e:
            logger.error(f"❌ Error creating API key: {e}")
            raise
    
    def get_key(self, key_id: str) -> Optional[Dict[str, Any]]:
        """Get API key by ID (without the actual key)"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, description, created_by, created_at, last_used_at, expires_at,
                       rate_limit_per_minute, rate_limit_per_hour, is_active, permissions
                FROM api_keys
                WHERE id = ?
            """, (key_id,))
            
            row = cursor.fetchone()
            conn.close()
            
            if row:
                # Parse permissions JSON
                # sqlite3.Row uses indexing, not .get() method
                permissions_json = row["permissions"] if "permissions" in row.keys() else "[]"
                if not permissions_json:
                    permissions_json = "[]"
                try:
                    permissions = json.loads(permissions_json)
                except (json.JSONDecodeError, TypeError):
                    permissions = DEFAULT_PERMISSIONS.copy()
                
                expires_at = row["expires_at"] if "expires_at" in row.keys() else None
                
                return {
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "created_by": row["created_by"],
                    "created_at": row["created_at"],
                    "last_used_at": row["last_used_at"],
                    "expires_at": expires_at,
                    "rate_limit_per_minute": row["rate_limit_per_minute"],
                    "rate_limit_per_hour": row["rate_limit_per_hour"],
                    "is_active": bool(row["is_active"]),
                    "permissions": permissions
                }
            return None
        except Exception as e:
            logger.error(f"❌ Error getting API key: {e}")
            raise
    
    def list_keys(
        self,
        created_by: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> List[Dict[str, Any]]:
        """List all API keys"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            query = """
                SELECT id, name, description, created_by, created_at, last_used_at, expires_at,
                       rate_limit_per_minute, rate_limit_per_hour, is_active, permissions
                FROM api_keys
                WHERE 1=1
            """
            params = []
            
            if created_by:
                query += " AND created_by = ?"
                params.append(created_by)
            
            if is_active is not None:
                query += " AND is_active = ?"
                params.append(1 if is_active else 0)
            
            query += " ORDER BY created_at DESC"
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            conn.close()
            
            result = []
            for row in rows:
                # Parse permissions JSON
                # sqlite3.Row uses indexing, not .get() method
                permissions_json = row["permissions"] if "permissions" in row.keys() else "[]"
                if not permissions_json:
                    permissions_json = "[]"
                try:
                    permissions = json.loads(permissions_json)
                except (json.JSONDecodeError, TypeError):
                    permissions = DEFAULT_PERMISSIONS.copy()
                
                expires_at = row["expires_at"] if "expires_at" in row.keys() else None
                
                result.append({
                    "id": row["id"],
                    "name": row["name"],
                    "description": row["description"],
                    "created_by": row["created_by"],
                    "created_at": row["created_at"],
                    "last_used_at": row["last_used_at"],
                    "expires_at": expires_at,
                    "rate_limit_per_minute": row["rate_limit_per_minute"],
                    "rate_limit_per_hour": row["rate_limit_per_hour"],
                    "is_active": bool(row["is_active"]),
                    "permissions": permissions
                })
            
            return result
        except Exception as e:
            logger.error(f"❌ Error listing API keys: {e}")
            raise
    
    def update_key(
        self,
        key_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        rate_limit_per_minute: Optional[int] = None,
        rate_limit_per_hour: Optional[int] = None,
        is_active: Optional[bool] = None,
        permissions: Optional[List[str]] = None,
        expires_at: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Update API key"""
        try:
            # Validate permissions if provided
            if permissions is not None:
                is_valid, error_msg = validate_scopes(permissions)
                if not is_valid:
                    raise ValueError(error_msg)
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            updates = []
            params = []
            
            if name is not None:
                updates.append("name = ?")
                params.append(name)
            
            if description is not None:
                updates.append("description = ?")
                params.append(description)
            
            if rate_limit_per_minute is not None:
                updates.append("rate_limit_per_minute = ?")
                params.append(rate_limit_per_minute)
            
            if rate_limit_per_hour is not None:
                updates.append("rate_limit_per_hour = ?")
                params.append(rate_limit_per_hour)
            
            if is_active is not None:
                updates.append("is_active = ?")
                params.append(1 if is_active else 0)
            
            if permissions is not None:
                updates.append("permissions = ?")
                params.append(json.dumps(permissions))
            
            if expires_at is not None:
                updates.append("expires_at = ?")
                params.append(expires_at)
            
            if not updates:
                conn.close()
                return self.get_key(key_id)
            
            params.append(key_id)
            query = f"UPDATE api_keys SET {', '.join(updates)} WHERE id = ?"
            
            cursor.execute(query, params)
            conn.commit()
            conn.close()
            
            logger.info(f"✅ API key updated: {key_id}")
            return self.get_key(key_id)
        except Exception as e:
            logger.error(f"❌ Error updating API key: {e}")
            raise
    
    def delete_key(self, key_id: str) -> bool:
        """Delete API key"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("DELETE FROM api_keys WHERE id = ?", (key_id,))
            
            deleted = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            if deleted:
                logger.info(f"✅ API key deleted: {key_id}")
            return deleted
        except Exception as e:
            logger.error(f"❌ Error deleting API key: {e}")
            raise
    
    def regenerate_key(self, key_id: str) -> Optional[Dict[str, Any]]:
        """Regenerate API key (returns new key)"""
        try:
            # Generate new key
            new_api_key = self._generate_api_key()
            new_key_hash = self._hash_key(new_api_key)
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE api_keys 
                SET key_hash = ?
                WHERE id = ?
            """, (new_key_hash, key_id))
            
            updated = cursor.rowcount > 0
            conn.commit()
            conn.close()
            
            if updated:
                logger.info(f"✅ API key regenerated: {key_id}")
                # Store API key temporarily for email sending (expires in 1 hour)
                self._temp_key_storage.set(f"api_key_{key_id}", new_api_key, ttl_seconds=3600)
                
                key_data = self.get_key(key_id)
                if key_data:
                    key_data["api_key"] = new_api_key  # Return new key only once
                return key_data
            return None
        except Exception as e:
            logger.error(f"❌ Error regenerating API key: {e}")
            raise
    
    def validate_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate API key and return key info if valid"""
        try:
            key_hash = self._hash_key(api_key)
            
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, rate_limit_per_minute, rate_limit_per_hour, is_active, permissions
                FROM api_keys
                WHERE key_hash = ? AND is_active = 1
            """, (key_hash,))
            
            row = cursor.fetchone()
            
            if row:
                # Update last_used_at
                last_used_at = datetime.now(THAILAND_TZ).isoformat()
                cursor.execute("""
                    UPDATE api_keys 
                    SET last_used_at = ?
                    WHERE id = ?
                """, (last_used_at, row["id"]))
                conn.commit()
                
                # Parse permissions JSON
                # sqlite3.Row uses indexing, not .get() method
                permissions_json = row["permissions"] if "permissions" in row.keys() else "[]"
                if not permissions_json:
                    permissions_json = "[]"
                try:
                    permissions = json.loads(permissions_json)
                except (json.JSONDecodeError, TypeError):
                    permissions = DEFAULT_PERMISSIONS.copy()
            else:
                permissions = []
            
            conn.close()
            
            if row:
                return {
                    "id": row["id"],
                    "name": row["name"],
                    "rate_limit_per_minute": row["rate_limit_per_minute"],
                    "rate_limit_per_hour": row["rate_limit_per_hour"],
                    "is_active": bool(row["is_active"]),
                    "permissions": permissions
                }
            return None
        except Exception as e:
            logger.error(f"❌ Error validating API key: {e}")
            return None
    
    def get_temp_key(self, key_id: str) -> Optional[str]:
        """Get temporarily stored API key (for email sending)"""
        try:
            return self._temp_key_storage.get(f"api_key_{key_id}")
        except Exception as e:
            logger.error(f"❌ Error getting temp API key: {e}")
            return None


# Global instance
api_key_manager = APIKeyManager()

