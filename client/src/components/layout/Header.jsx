import { useState, useRef, useEffect } from 'react';
import { Menu, Search, Bell, Sun, User as UserIcon, LogOut, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import './Header.css';

const Header = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setSearchResults(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery.trim().length > 0) {
        performSearch(searchQuery);
      } else {
        setSearchResults(null);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const performSearch = async (query) => {
    setIsSearching(true);
    try {
      const res = await api.get(`/search?q=${encodeURIComponent(query)}`);
      setSearchResults(res.data.data);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  };

  const navigateToResult = (type, id) => {
    setSearchResults(null);
    setSearchQuery('');
    if (type === 'project') navigate(`/projects/${id}`);
    if (type === 'task') navigate(`/tasks/${id}`);
    if (type === 'user') navigate(`/admin/users`);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-menu-btn" onClick={toggleSidebar}>
          <Menu size={20} />
        </button>
        
        <div className="search-container" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search projects, tasks..." 
              className="search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => { if(searchQuery) performSearch(searchQuery); }}
            />
          </div>
          
          {searchResults && (
            <div className="search-dropdown">
              {isSearching && <div className="search-loading">Searching...</div>}
              
              {!isSearching && searchResults.projects?.length > 0 && (
                <div className="search-category">
                  <div className="search-category-title">Projects</div>
                  {searchResults.projects.map(p => (
                    <div key={`p-${p.id}`} className="search-result-item" onClick={() => navigateToResult('project', p.id)}>
                      <div className="search-result-name">{p.name}</div>
                      <div className="search-result-meta">{p.status}</div>
                    </div>
                  ))}
                </div>
              )}
              
              {!isSearching && searchResults.tasks?.length > 0 && (
                <div className="search-category">
                  <div className="search-category-title">Tasks</div>
                  {searchResults.tasks.map(t => (
                    <div key={`t-${t.id}`} className="search-result-item" onClick={() => navigateToResult('task', t.id)}>
                      <div className="search-result-name">{t.name}</div>
                      <div className="search-result-meta">{t.project_name} • {t.status}</div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.users?.length > 0 && (
                <div className="search-category">
                  <div className="search-category-title">Users</div>
                  {searchResults.users.map(u => (
                    <div key={`u-${u.id}`} className="search-result-item" onClick={() => navigateToResult('user', u.id)}>
                      <div className="search-result-name">{u.name}</div>
                      <div className="search-result-meta">{formatRole(u.role)}</div>
                    </div>
                  ))}
                </div>
              )}

              {!isSearching && searchResults.projects?.length === 0 && searchResults.tasks?.length === 0 && searchResults.users?.length === 0 && (
                <div className="search-empty">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="header-right">
        <button className="header-icon-btn">
          <Sun size={20} />
        </button>
        <button className="header-icon-btn notification-btn">
          <Bell size={20} />
          <span className="notification-badge">3</span>
        </button>
        
        <div className="profile-menu-container">
          <div 
            className="profile-trigger" 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
          >
            <div className="profile-avatar">
              {getInitials(user?.full_name)}
            </div>
            <div className="profile-info">
              <div className="profile-name">{user?.full_name}</div>
              <div className="profile-role">{formatRole(user?.role)}</div>
            </div>
          </div>
          
          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <div className="profile-name">{user?.full_name}</div>
                <div className="profile-email">{user?.email}</div>
              </div>
              <div className="profile-dropdown-body">
                <button className="dropdown-item">
                  <UserIcon size={16} /> Profile
                </button>
                <button className="dropdown-item">
                  <Settings size={16} /> Settings
                </button>
                <div className="dropdown-divider"></div>
                <button className="dropdown-item text-danger" onClick={handleLogout}>
                  <LogOut size={16} /> Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
