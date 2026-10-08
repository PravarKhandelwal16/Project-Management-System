import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderKanban, 
  CheckSquare, 
  Calendar, 
  BarChart2, 
  Users, 
  ShieldAlert, 
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';
import BrandMark from '../BrandMark';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { hasPermission, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard size={20} />, permission: null },
    { name: 'Projects', path: '/projects', icon: <FolderKanban size={20} />, permission: 'projects.view' },
    { name: 'Tasks', path: '/tasks', icon: <CheckSquare size={20} />, permission: 'tasks.view' },
    { name: 'Calendar', path: '/calendar', icon: <Calendar size={20} />, permission: null },
    { name: 'Analytics', path: '/analytics', icon: <BarChart2 size={20} />, permission: 'analytics.view' },
    { name: 'Team', path: '/team', icon: <Users size={20} />, permission: 'team.view' },
  ];

  const adminItems = [
    { name: 'User Management', path: '/admin/users', icon: <Users size={20} />, permission: 'users.view' },
    { name: 'Audit Logs', path: '/admin/audit-logs', icon: <ShieldAlert size={20} />, permission: 'audit.view' },
  ];

  const canSee = permission => !permission || hasPermission(permission);

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'active' : ''}`} onClick={toggleSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <BrandMark size={36}/>
            <span className="logo-text">ProjectMaster</span>
          </div>
          <button className="sidebar-close-btn" aria-label="Close navigation" onClick={toggleSidebar}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          <div className="nav-section">
            <h3 className="nav-section-title">Main Menu</h3>
            <ul className="nav-list">
              {navItems.filter(item => canSee(item.permission)).map(item => (
                <li key={item.path} className="nav-item">
                  <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                    {item.icon}
                    <span>{item.name}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {adminItems.some(item => canSee(item.permission)) && (
            <div className="nav-section">
              <h3 className="nav-section-title">Administration</h3>
              <ul className="nav-list">
                {adminItems.filter(item => canSee(item.permission)).map(item => (
                  <li key={item.path} className="nav-item">
                    <NavLink to={item.path} className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                      {item.icon}
                      <span>{item.name}</span>
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>

        <div className="sidebar-footer">
          <ul className="nav-list">
            <li className="nav-item">
              <button className="nav-link" onClick={() => navigate('/settings')}>
                <Settings size={20} />
                <span>Settings</span>
              </button>
            </li>
            <li className="nav-item">
              <button className="nav-link logout-btn" onClick={handleLogout}>
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
