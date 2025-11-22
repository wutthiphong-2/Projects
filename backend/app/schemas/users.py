"""
User management schemas
"""
from pydantic import BaseModel, EmailStr, Field, validator
from typing import List, Optional
from datetime import datetime
import re

class UserCreate(BaseModel):
    """User creation request model"""
    cn: str = Field(..., min_length=1, max_length=64, description="Common name (CN) for the user")
    sAMAccountName: str = Field(..., min_length=1, max_length=20, description="SAM account name (username)")
    password: str = Field(..., min_length=8, max_length=128, description="User password (minimum 8 characters)")
    mail: EmailStr = Field(..., description="User email address")
    
    @validator('sAMAccountName')
    def validate_sam_account_name(cls, v):
        """Validate SAM account name format"""
        if not re.match(r'^[a-zA-Z0-9._-]+$', v):
            raise ValueError('sAMAccountName can only contain letters, numbers, dots, underscores, and hyphens')
        if len(v) > 20:
            raise ValueError('sAMAccountName cannot exceed 20 characters')
        return v
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password strength"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        # Optional: Add more password complexity rules
        # if not re.search(r'[A-Z]', v):
        #     raise ValueError('Password must contain at least one uppercase letter')
        # if not re.search(r'[a-z]', v):
        #     raise ValueError('Password must contain at least one lowercase letter')
        # if not re.search(r'\d', v):
        #     raise ValueError('Password must contain at least one number')
        return v
    displayName: Optional[str] = Field(None, max_length=256, description="Display name")
    givenName: Optional[str] = Field(None, max_length=64, description="Given name (first name)")
    sn: Optional[str] = Field(None, max_length=64, description="Surname (last name)")
    title: Optional[str] = Field(None, max_length=64, description="Job title")
    telephoneNumber: Optional[str] = Field(None, max_length=32, description="Telephone number")
    mobile: Optional[str] = Field(None, max_length=32, description="Mobile phone number")
    department: Optional[str] = Field(None, max_length=64, description="Department name")
    company: Optional[str] = Field(None, max_length=64, description="Company name")
    employeeID: Optional[str] = Field(None, max_length=64, description="Employee ID")
    departmentNumber: Optional[str] = Field(None, max_length=64, description="Department number")
    physicalDeliveryOfficeName: Optional[str] = Field(None, max_length=128, description="Office location")
    streetAddress: Optional[str] = Field(None, max_length=1024, description="Street address")
    l: Optional[str] = Field(None, max_length=128, description="City/locality")  # city/locality in AD
    st: Optional[str] = Field(None, max_length=128, description="State/province")  # state in AD
    postalCode: Optional[str] = Field(None, max_length=40, description="Postal code")
    co: Optional[str] = Field(None, max_length=2, description="Country code (2 letters)")  # country in AD
    description: Optional[str] = Field(None, max_length=1024, description="User description")
    # New fields for enhanced user creation
    ou: Optional[str] = Field(None, description="OU DN where user will be created")
    groups: Optional[List[str]] = Field(default_factory=list, description="List of group DNs to add user to")
    accountDisabled: Optional[bool] = Field(False, description="Create account as disabled")
    # Account options
    passwordMustChange: Optional[bool] = Field(False, description="User must change password at next logon")
    userCannotChangePassword: Optional[bool] = Field(False, description="User cannot change password")
    passwordNeverExpires: Optional[bool] = Field(False, description="Password never expires")
    storePasswordReversible: Optional[bool] = Field(False, description="Store password using reversible encryption")

class UserUpdate(BaseModel):
    """User update request model"""
    cn: Optional[str] = Field(None, min_length=1, max_length=64, description="Common name (CN) for the user")
    password: Optional[str] = Field(None, min_length=8, max_length=128, description="New password (minimum 8 characters)")
    mail: Optional[EmailStr] = Field(None, description="User email address")
    
    @validator('password')
    def validate_password_strength(cls, v):
        """Validate password strength if provided"""
        if v is not None and len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v
    displayName: Optional[str] = Field(None, max_length=256, description="Display name")
    givenName: Optional[str] = Field(None, max_length=64, description="Given name (first name)")
    sn: Optional[str] = Field(None, max_length=64, description="Surname (last name)")
    title: Optional[str] = Field(None, max_length=64, description="Job title")
    telephoneNumber: Optional[str] = Field(None, max_length=32, description="Telephone number")
    mobile: Optional[str] = Field(None, max_length=32, description="Mobile phone number")
    department: Optional[str] = Field(None, max_length=64, description="Department name")
    company: Optional[str] = Field(None, max_length=64, description="Company name")
    employeeID: Optional[str] = Field(None, max_length=64, description="Employee ID")
    departmentNumber: Optional[str] = Field(None, max_length=64, description="Department number")
    physicalDeliveryOfficeName: Optional[str] = Field(None, max_length=128, description="Office location")
    streetAddress: Optional[str] = Field(None, max_length=1024, description="Street address")
    l: Optional[str] = Field(None, max_length=128, description="City/locality")  # city/locality in AD
    st: Optional[str] = Field(None, max_length=128, description="State/province")  # state in AD
    postalCode: Optional[str] = Field(None, max_length=40, description="Postal code")
    co: Optional[str] = Field(None, max_length=2, description="Country code (2 letters)")  # country in AD
    description: Optional[str] = Field(None, max_length=1024, description="User description")
    # Account options
    passwordMustChange: Optional[bool] = Field(None, description="User must change password at next logon")
    userCannotChangePassword: Optional[bool] = Field(None, description="User cannot change password")
    passwordNeverExpires: Optional[bool] = Field(None, description="Password never expires")
    storePasswordReversible: Optional[bool] = Field(None, description="Store password using reversible encryption")

class UserResponse(BaseModel):
    """User response model with all user attributes"""
    dn: str = Field(..., description="Distinguished Name (DN) of the user")
    cn: str = Field(..., description="Common name (CN) of the user")
    sAMAccountName: str = Field(..., description="SAM account name (username)")
    mail: str = Field(..., description="Email address")
    displayName: str = Field(..., description="Display name")
    
    class Config:
        json_schema_extra = {
            "example": {
                "dn": "CN=John Doe,OU=Users,DC=example,DC=com",
                "cn": "John Doe",
                "sAMAccountName": "jdoe",
                "mail": "jdoe@example.com",
                "displayName": "John Doe",
                "isEnabled": True,
                "department": "IT",
                "title": "Software Engineer"
            }
        }
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None
    userAccountControl: int
    memberOf: List[str]
    isEnabled: bool
    whenCreated: Optional[str] = None
    whenChanged: Optional[str] = None
    lastLogon: Optional[str] = None
    pwdLastSet: Optional[str] = None
    logonCount: Optional[int] = None
    # Account options (parsed from userAccountControl)
    passwordMustChange: Optional[bool] = False
    userCannotChangePassword: Optional[bool] = False
    passwordNeverExpires: Optional[bool] = False
    storePasswordReversible: Optional[bool] = False
    # New fields
    userPrincipalName: Optional[str] = None
    manager: Optional[str] = None
    accountExpires: Optional[str] = None
    departmentNumber: Optional[str] = None

class UserStatsResponse(BaseModel):
    """User statistics response model"""
    total_users: int
    enabled_users: int
    disabled_users: int
    fetched_at: datetime

class LoginInsightEntry(BaseModel):
    """Login insight entry model"""
    dn: str
    display_name: Optional[str] = None
    username: Optional[str] = None
    email: Optional[str] = None
    department: Optional[str] = None
    last_login: Optional[datetime] = None
    first_login: Optional[datetime] = None
    when_created: Optional[datetime] = None
    logon_count: Optional[int] = None

class UserCreateResponse(BaseModel):
    """User creation response model"""
    success: bool
    message: str
    passwordSet: bool
    accountEnabled: bool
    groupsAssigned: int
    groupsFailed: int
    user: dict

class UserUpdateResponse(BaseModel):
    """User update response model"""
    success: bool
    message: str
    user: Optional[UserResponse] = None
    dn: Optional[str] = None

class UserStatusToggleResponse(BaseModel):
    """User status toggle response model"""
    success: bool
    message: str
    isEnabled: bool

class UserDeleteResponse(BaseModel):
    """User delete response model"""
    success: bool
    message: str

class PasswordExpiryResponse(BaseModel):
    """Password expiry information response model"""
    createdDate: Optional[str] = None
    expiryDate: Optional[str] = None
    daysRemaining: Optional[int] = None

