import sqlite3
import hashlib
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Dict, List
import logging

logger = logging.getLogger(__name__)

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "tokens.db"


class TokenManager:
    """Manage JWT tokens with blacklist and active sessions"""
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create tables if not exists"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Table for active tokens (sessions)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS active_tokens (
                    token_hash TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    is_active INTEGER DEFAULT 1,
                    last_used_at TEXT,
                    user_agent TEXT,
                    ip_address TEXT
                )
            """)
            
            # Table for blacklisted tokens
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS blacklisted_tokens (
                    token_hash TEXT PRIMARY KEY,
                    username TEXT NOT NULL,
                    revoked_at TEXT NOT NULL,
                    reason TEXT
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_username 
                ON active_tokens(username)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_is_active 
                ON active_tokens(is_active)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ Token database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing token database: {e}")
            raise
    
    def _hash_token(self, token: str) -> str:
        """Hash token using SHA-256"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def register_token(
        self, 
        token: str, 
        username: str, 
        expires_at: datetime,
        user_agent: Optional[str] = None,
        ip_address: Optional[str] = None
    ):
        """Register a new active token"""
        try:
            token_hash = self._hash_token(token)
            created_at = datetime.now(timezone.utc).isoformat()
            expires_at_str = expires_at.isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO active_tokens 
                (token_hash, username, created_at, expires_at, is_active, user_agent, ip_address)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (token_hash, username, created_at, expires_at_str, 1, user_agent, ip_address))
            
            conn.commit()
            conn.close()
            logger.info(f"✅ Token registered for user: {username}")
        except Exception as e:
            logger.error(f"❌ Error registering token: {e}")
            raise
    
    def revoke_token(self, token: str, reason: Optional[str] = None) -> bool:
        """Revoke a token (move to blacklist)"""
        try:
            token_hash = self._hash_token(token)
            return self.revoke_token_by_hash(token_hash, reason)
        except Exception as e:
            logger.error(f"❌ Error revoking token: {e}")
            return False
    
    def revoke_token_by_hash(self, token_hash: str, reason: Optional[str] = None) -> bool:
        """Revoke a token by hash (move to blacklist)"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Get token info before revoking
            cursor.execute("""
                SELECT username FROM active_tokens WHERE token_hash = ?
            """, (token_hash,))
            row = cursor.fetchone()
            
            if not row:
                conn.close()
                return False
            
            username = row[0]
            
            # Move to blacklist
            revoked_at = datetime.now(timezone.utc).isoformat()
            cursor.execute("""
                INSERT OR REPLACE INTO blacklisted_tokens 
                (token_hash, username, revoked_at, reason)
                VALUES (?, ?, ?, ?)
            """, (token_hash, username, revoked_at, reason))
            
            # Remove from active tokens
            cursor.execute("""
                DELETE FROM active_tokens WHERE token_hash = ?
            """, (token_hash,))
            
            conn.commit()
            conn.close()
            logger.info(f"✅ Token revoked for user: {username}")
            return True
        except Exception as e:
            logger.error(f"❌ Error revoking token by hash: {e}")
            return False
    
    def revoke_all_user_tokens(self, username: str, reason: Optional[str] = None) -> int:
        """Revoke all tokens for a user"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Get all active tokens for user
            cursor.execute("""
                SELECT token_hash FROM active_tokens WHERE username = ?
            """, (username,))
            rows = cursor.fetchall()
            
            revoked_at = datetime.now(timezone.utc).isoformat()
            count = 0
            
            for row in rows:
                token_hash = row[0]
                # Move to blacklist
                cursor.execute("""
                    INSERT OR REPLACE INTO blacklisted_tokens 
                    (token_hash, username, revoked_at, reason)
                    VALUES (?, ?, ?, ?)
                """, (token_hash, username, revoked_at, reason))
                count += 1
            
            # Remove from active tokens
            cursor.execute("""
                DELETE FROM active_tokens WHERE username = ?
            """, (username,))
            
            conn.commit()
            conn.close()
            logger.info(f"✅ Revoked {count} tokens for user: {username}")
            return count
        except Exception as e:
            logger.error(f"❌ Error revoking user tokens: {e}")
            return 0
    
    def is_token_blacklisted(self, token: str) -> bool:
        """Check if token is blacklisted"""
        try:
            token_hash = self._hash_token(token)
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 1 FROM blacklisted_tokens WHERE token_hash = ?
            """, (token_hash,))
            
            result = cursor.fetchone() is not None
            conn.close()
            return result
        except Exception as e:
            logger.error(f"❌ Error checking blacklist: {e}")
            return False
    
    def is_token_active(self, token: str) -> bool:
        """Check if token is active (not revoked and not expired)"""
        try:
            token_hash = self._hash_token(token)
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT is_active, expires_at FROM active_tokens 
                WHERE token_hash = ?
            """, (token_hash,))
            
            row = cursor.fetchone()
            conn.close()
            
            if not row:
                return False
            
            is_active, expires_at_str = row
            if not is_active:
                return False
            
            # Check expiration
            expires_at = datetime.fromisoformat(expires_at_str.replace('Z', '+00:00'))
            if datetime.now(timezone.utc) > expires_at:
                return False
            
            return True
        except Exception as e:
            logger.error(f"❌ Error checking token status: {e}")
            return False
    
    def update_token_usage(self, token: str):
        """Update last_used_at timestamp"""
        try:
            token_hash = self._hash_token(token)
            last_used_at = datetime.now(timezone.utc).isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE active_tokens 
                SET last_used_at = ?
                WHERE token_hash = ?
            """, (last_used_at, token_hash))
            
            conn.commit()
            conn.close()
        except Exception as e:
            logger.error(f"❌ Error updating token usage: {e}")
    
    def list_user_tokens(self, username: Optional[str] = None) -> List[Dict]:
        """List all active tokens"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            if username:
                cursor.execute("""
                    SELECT token_hash, username, created_at, expires_at, 
                           is_active, last_used_at, user_agent, ip_address
                    FROM active_tokens
                    WHERE username = ?
                    ORDER BY created_at DESC
                """, (username,))
            else:
                cursor.execute("""
                    SELECT token_hash, username, created_at, expires_at, 
                           is_active, last_used_at, user_agent, ip_address
                    FROM active_tokens
                    ORDER BY created_at DESC
                """)
            
            rows = cursor.fetchall()
            conn.close()
            
            result = []
            for row in rows:
                result.append({
                    "token_hash": row["token_hash"][:16] + "...",  # Partial hash for display
                    "full_token_hash": row["token_hash"],  # Full hash for revoke
                    "username": row["username"],
                    "created_at": row["created_at"],
                    "expires_at": row["expires_at"],
                    "is_active": bool(row["is_active"]),
                    "last_used_at": row["last_used_at"],
                    "user_agent": row["user_agent"],
                    "ip_address": row["ip_address"]
                })
            
            return result
        except Exception as e:
            logger.error(f"❌ Error listing tokens: {e}")
            return []


# Global instance
token_manager = TokenManager()

