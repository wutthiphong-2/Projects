"""
User management schemas
"""
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from datetime import datetime

class UserCreate(BaseModel):
    """User creation request model"""
    cn: str
    sAMAccountName: str
    password: str
    mail: EmailStr
    displayName: Optional[str] = None
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    departmentNumber: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None
    # New fields for enhanced user creation
    ou: Optional[str] = None  # OU DN where user will be created
    groups: Optional[List[str]] = []  # List of group DNs to add user to
    accountDisabled: Optional[bool] = False  # Create account as disabled
    # Account options
    passwordMustChange: Optional[bool] = False  # User must change password at next logon
    userCannotChangePassword: Optional[bool] = False  # User cannot change password
    passwordNeverExpires: Optional[bool] = False  # Password never expires
    storePasswordReversible: Optional[bool] = False  # Store password using reversible encryption

class UserUpdate(BaseModel):
    """User update request model"""
    cn: Optional[str] = None
    password: Optional[str] = None  # For password reset
    mail: Optional[EmailStr] = None
    displayName: Optional[str] = None
    givenName: Optional[str] = None
    sn: Optional[str] = None
    title: Optional[str] = None
    telephoneNumber: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    employeeID: Optional[str] = None
    departmentNumber: Optional[str] = None
    physicalDeliveryOfficeName: Optional[str] = None
    streetAddress: Optional[str] = None
    l: Optional[str] = None  # city/locality in AD
    st: Optional[str] = None  # state in AD
    postalCode: Optional[str] = None
    co: Optional[str] = None  # country in AD
    description: Optional[str] = None
    # Account options
    passwordMustChange: Optional[bool] = None  # User must change password at next logon
    userCannotChangePassword: Optional[bool] = None  # User cannot change password
    passwordNeverExpires: Optional[bool] = None  # Password never expires
    storePasswordReversible: Optional[bool] = None  # Store password using reversible encryption

class UserResponse(BaseModel):
    """User response model"""
    dn: str
    cn: str
    sAMAccountName: str
    mail: str
    displayName: str
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

