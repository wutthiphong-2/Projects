import React, { useState, useEffect } from 'react';
import { Layout, Avatar, Badge, Tooltip } from 'antd';
import { 
  LayoutDashboard,
  Users,
  UsersRound,
  FolderTree,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Bell,
  Search,
  Activity,
  Key
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './Sidebar.css';

const { Sider } = Layout;

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  // Update body class when sidebar collapses/expands
  useEffect(() => {
    if (collapsed) {
      document.body.classList.add('sidebar-collapsed');
    } else {
      document.body.classList.remove('sidebar-collapsed');
    }
  }, [collapsed]);

  const menuItems = [
    { 
      key: '/dashboard', 
      icon: <LayoutDashboard size={20} />, 
      label: 'Overview',
      badge: null
    },
    { 
      key: '/users', 
      icon: <Users size={20} />, 
      label: 'Users',
      badge: null
    },
    { 
      key: '/groups', 
      icon: <UsersRound size={20} />, 
      label: 'Groups',
      badge: null
    },
    { 
      key: '/ous', 
      icon: <FolderTree size={20} />, 
      label: 'Organization',
      badge: null
    },
    { 
      key: '/activity-log', 
      icon: <Activity size={20} />, 
      label: 'Activity Log',
      badge: null
    },
    { 
      key: '/api-management', 
      icon: <Key size={20} />, 
      label: 'API Management',
      badge: null
    },
  ];

  const handleMenuClick = (key) => {
    navigate(key);
  };

  return (
    <Sider 
      className="modern-tech-sidebar"
      width={260}
      collapsedWidth={72}
      collapsed={collapsed}
      trigger={null}
    >
      <div className="sidebar-container">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand">
            {!collapsed ? (
              <>
                <div className="brand-icon">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <rect width="24" height="24" rx="6" fill="url(#gradient)" />
                    <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">AD</text>
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="24" y2="24">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </div>
                <div className="brand-text">
                  <span className="brand-name">AD Portal</span>
                  <span className="brand-badge">PRO</span>
                </div>
              </>
            ) : (
              <div className="brand-icon-collapsed">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
                  <rect width="24" height="24" rx="6" fill="url(#gradient2)" />
                  <text x="12" y="17" textAnchor="middle" fill="white" fontSize="12" fontWeight="700">AD</text>
                  <defs>
                    <linearGradient id="gradient2" x1="0" y1="0" x2="24" y2="24">
                      <stop offset="0%" stopColor="#3b82f6" />
                      <stop offset="100%" stopColor="#8b5cf6" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
            )}
          </div>
          
          {!collapsed && (
            <div className="sidebar-search">
              <Search size={14} />
              <input type="text" placeholder="Search..." />
              <kbd>⌘K</kbd>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="sidebar-nav">
          {!collapsed && <div className="nav-section-title">MAIN MENU</div>}
          <div className="nav-items">
            {menuItems.map((item) => (
              <Tooltip 
                key={item.key}
                title={collapsed ? item.label : ''}
                placement="right"
              >
                <div
                  className={`nav-item ${location.pathname === item.key ? 'active' : ''}`}
                  onClick={() => handleMenuClick(item.key)}
                >
                  <div className="nav-item-icon">{item.icon}</div>
                  {!collapsed && (
                    <>
                      <span className="nav-item-label">{item.label}</span>
                      {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                    </>
                  )}
                </div>
              </Tooltip>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sidebar-footer">
          {!collapsed && (
            <>
              <Tooltip title="Notifications">
                <div className="footer-action">
                  <Badge count={3} size="small">
                    <Bell size={18} />
                  </Badge>
                </div>
              </Tooltip>
            </>
          )}
          
          <div className="footer-divider"></div>
          
          {/* User Profile */}
          <div className="user-profile">
            <Avatar 
              size={collapsed ? 36 : 32}
              className="user-avatar"
              style={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' }}
            >
              {user?.username?.charAt(0).toUpperCase() || 'A'}
            </Avatar>
            {!collapsed && (
              <div className="user-info">
                <div className="user-name">{user?.username || 'Administrator'}</div>
                <div className="user-role">System Admin</div>
              </div>
            )}
            <Tooltip title="Sign out">
              <div className="logout-btn" onClick={logout}>
                <LogOut size={16} />
              </div>
            </Tooltip>
          </div>
          
          {/* Collapse Toggle */}
          <div className="collapse-toggle" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </div>
        </div>
      </div>
    </Sider>
  );
};

export default Sidebar;
