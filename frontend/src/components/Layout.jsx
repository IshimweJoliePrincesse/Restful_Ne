import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from './ConfirmDialog';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: '📊' },
  { path: '/extinguishers', label: 'Extinguishers', icon: '🧯' },
  { path: '/inspections', label: 'Inspections', icon: '✅' },
  { path: '/maintenance', label: 'Maintenance', icon: '🛠️' },
  { path: '/reports', label: 'Reports', icon: '📄' },
  { path: '/notifications', label: 'Notifications', icon: '🔔' },
  { path: '/profile', label: 'Profile', icon: '👤' },
  { path: '/change-password', label: 'Change Password', icon: '🔐' },
];

const adminItems = [
  { path: '/users', label: 'Users', icon: '👥' },
];

export default function Layout({ children }) {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [confirmLogoutOpen, setConfirmLogoutOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setConfirmLogoutOpen(false);
    navigate('/login');
  };

  const allItems = isAdmin ? [...navItems, ...adminItems] : navItems;

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <aside className="bg-red-700 text-white w-full md:w-64 md:min-h-screen shrink-0">
        <div className="p-6 border-b border-red-600">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <span>🧯</span> FEMS
          </h1>
          <p className="text-red-200 text-sm mt-1">Fire Extinguisher System</p>
        </div>
        <nav className="p-4 space-y-1">
          {allItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-red-600 text-white'
                  : 'text-red-100 hover:bg-red-600/50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 mt-auto border-t border-red-600">
          <div className="px-4 py-2 text-sm">
            <p className="font-medium truncate">{user?.name}</p>
            <p className="text-red-200 text-xs truncate">{user?.email}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-red-600 rounded text-xs">{user?.role}</span>
          </div>
          <button
            onClick={() => setConfirmLogoutOpen(true)}
            className="w-full mt-3 px-4 py-2 text-sm font-medium text-red-100 hover:bg-red-600 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8 overflow-auto">
        {children}
      </main>
      <ConfirmDialog
        open={confirmLogoutOpen}
        title="Confirm Logout"
        message="Are you sure you want to log out of your account?"
        confirmLabel="Logout"
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogoutOpen(false)}
      />
    </div>
  );
}
