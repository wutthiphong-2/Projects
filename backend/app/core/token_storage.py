import sqlite3
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import List, Dict, Any, Optional
import logging
import hashlib

logger = logging.getLogger(__name__)

# Thailand timezone (UTC+7)
THAILAND_TZ = timezone(timedelta(hours=7))

# Database file path
DB_PATH = Path(__file__).parent.parent.parent / "jwt_tokens.db"


class TokenStorage:
    """Manage JWT token storage with SQLite database"""
    
    def __init__(self):
        self.db_path = DB_PATH
        self._init_database()
    
    def _init_database(self):
        """Initialize database and create tables if not exists"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS jwt_tokens (
                    token_hash TEXT PRIMARY KEY,
                    full_token_hash TEXT UNIQUE NOT NULL,
                    user TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    expires_at TEXT NOT NULL,
                    last_used_at TEXT,
                    ip_address TEXT,
                    user_agent TEXT,
                    is_active INTEGER DEFAULT 1
                )
            """)
            
            # Create indexes
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_user 
                ON jwt_tokens(user)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_expires_at 
                ON jwt_tokens(expires_at)
            """)
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_is_active 
                ON jwt_tokens(is_active)
            """)
            
            conn.commit()
            conn.close()
            logger.info(f"✅ JWT tokens database initialized at {self.db_path}")
        except Exception as e:
            logger.error(f"❌ Error initializing JWT tokens database: {e}")
            raise
    
    def _hash_token(self, token: str) -> str:
        """Hash JWT token using SHA-256"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def store_token(
        self,
        token: str,
        user: str,
        expires_at: datetime,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> bool:
        """Store JWT token information"""
        try:
            token_hash = self._hash_token(token)
            full_token_hash = token_hash  # Use full hash as identifier
            created_at = datetime.now(THAILAND_TZ).isoformat()
            expires_at_str = expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            # Check if token already exists
            cursor.execute("SELECT token_hash FROM jwt_tokens WHERE token_hash = ?", (token_hash,))
            if cursor.fetchone():
                conn.close()
                return True  # Token already stored
            
            cursor.execute("""
                INSERT INTO jwt_tokens 
                (token_hash, full_token_hash, user, created_at, expires_at, ip_address, user_agent, is_active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                token_hash, full_token_hash, user, created_at, expires_at_str,
                ip_address, user_agent, 1
            ))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"❌ Error storing token: {e}")
            return False
    
    def update_token_usage(self, token: str) -> bool:
        """Update last used timestamp for token"""
        try:
            token_hash = self._hash_token(token)
            last_used_at = datetime.now(THAILAND_TZ).isoformat()
            
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE jwt_tokens 
                SET last_used_at = ?
                WHERE token_hash = ? AND is_active = 1
            """, (last_used_at, token_hash))
            
            conn.commit()
            conn.close()
            return True
        except Exception as e:
            logger.error(f"❌ Error updating token usage: {e}")
            return False
    
    def revoke_token(self, token_hash: str) -> bool:
        """Revoke a token by hash"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE jwt_tokens 
                SET is_active = 0
                WHERE token_hash = ? OR full_token_hash = ?
            """, (token_hash, token_hash))
            
            updated = cursor.rowcount > 0
            conn.commit()
            conn.close()
            return updated
        except Exception as e:
            logger.error(f"❌ Error revoking token: {e}")
            return False
    
    def revoke_all_user_tokens(self, user: str) -> int:
        """Revoke all tokens for a user"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            cursor = conn.cursor()
            
            cursor.execute("""
                UPDATE jwt_tokens 
                SET is_active = 0
                WHERE user = ? AND is_active = 1
            """, (user,))
            
            count = cursor.rowcount
            conn.commit()
            conn.close()
            return count
        except Exception as e:
            logger.error(f"❌ Error revoking all user tokens: {e}")
            return 0
    
    def list_user_tokens(self, user: str) -> List[Dict[str, Any]]:
        """List all active tokens for a user"""
        try:
            conn = sqlite3.connect(str(self.db_path))
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT token_hash, full_token_hash, user, created_at, expires_at, 
                       last_used_at, ip_address, user_agent, is_active
                FROM jwt_tokens
                WHERE user = ?
                ORDER BY created_at DESC
            """, (user,))
            
            rows = cursor.fetchall()
            conn.close()
            
            tokens = []
            for row in rows:
                tokens.append({
                    "token_hash": row["token_hash"][:16] + "...",  # Truncate for display
                    "full_token_hash": row["full_token_hash"],
                    "user": row["user"],
                    "created_at": row["created_at"],
                    "expires_at": row["expires_at"],
                    "last_used_at": row["last_used_at"],
                    "ip_address": row["ip_address"],
                    "user_agent": row["user_agent"],
                    "is_active": bool(row["is_active"])
                })
            
            return tokens
        except Exception as e:
            logger.error(f"❌ Error listing user tokens: {e}")
            return []


# Global instance
token_storage = TokenStorage()

