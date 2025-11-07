from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List
import os

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")
    # LDAP Configuration
    LDAP_URL: str = "ldap://localhost:389"
    LDAP_BASE_DN: str = "DC=example,DC=com"
    LDAP_BIND_DN: str = "CN=admin,CN=Users,DC=example,DC=com"
    LDAP_BIND_PASSWORD: str = "password"
    
    # Server Configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = True
    
    # JWT Configuration
    JWT_SECRET_KEY: str = "your-secret-key"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 hours (was 30 minutes)
    
    # CORS Configuration
    CORS_ORIGINS: List[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # WinRM Configuration (for querying Event Logs on Domain Controller)
    WINRM_ENABLED: bool = False  # Set to True to enable computer login history
    WINRM_DC_HOST: str = ""  # Domain Controller hostname/IP (e.g., "dc.domain.local")
    WINRM_USERNAME: str = ""  # Admin username for WinRM
    WINRM_PASSWORD: str = ""  # Admin password for WinRM
    WINRM_PORT: int = 5985  # WinRM HTTP port (5985) or HTTPS (5986)
    WINRM_TRANSPORT: str = "ntlm"  # Authentication: ntlm, kerberos, ssl
    
    # Pydantic v2 uses model_config; keep empty Config for backward compatibility in code references
    # Remove legacy Config to avoid conflicts with Pydantic v2

settings = Settings()
# Backwards-compat: support legacy environment variable names used in .env
# .env in the workspace uses JWT_SECRET and JWT_EXPIRES_IN, and PORT=3000 etc.
# Apply fallbacks after creating Settings so users don't need to rename env vars.
_jwt_secret = os.getenv('JWT_SECRET')
if _jwt_secret:
    settings.JWT_SECRET_KEY = _jwt_secret

_jwt_expires = os.getenv('JWT_EXPIRES_IN')
if _jwt_expires:
    # Accept formats like '24h', '1440m', or plain minutes as integer string
    try:
        if _jwt_expires.endswith('h'):
            settings.ACCESS_TOKEN_EXPIRE_MINUTES = int(_jwt_expires[:-1]) * 60
        elif _jwt_expires.endswith('m'):
            settings.ACCESS_TOKEN_EXPIRE_MINUTES = int(_jwt_expires[:-1])
        else:
            settings.ACCESS_TOKEN_EXPIRE_MINUTES = int(_jwt_expires)
    except Exception:
        # ignore parse errors and keep default
        pass

# Allow legacy PORT env var to override settings.PORT (some .env use PORT)
_port = os.getenv('PORT')
if _port:
    try:
        settings.PORT = int(_port)
    except Exception:
        pass

