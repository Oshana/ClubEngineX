import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="text-xl font-bold text-primary-600">
                Badminton Club
              </Link>
              
              {user?.is_super_admin && (
                <>
                  <Link to="/super-admin" className="text-gray-700 hover:text-primary-600">
                    Super Admin
                  </Link>
                </>
              )}
              
              {user?.is_admin && !user?.is_super_admin && (
                <>
                  <Link to="/players" className="text-gray-700 hover:text-primary-600">
                    Players
                  </Link>
                  <Link to="/sessions" className="text-gray-700 hover:text-primary-600">
                    Sessions
                  </Link>
                  <Link to="/statistics" className="text-gray-700 hover:text-primary-600">
                    Statistics
                  </Link>
                  <Link to="/settings" className="text-gray-700 hover:text-primary-600">
                    Settings
                  </Link>
                </>
              )}
              
              {!user?.is_admin && !user?.is_super_admin && (
                <>
                  <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                    My Profile
                  </Link>
                  <Link to="/sessions" className="text-gray-700 hover:text-primary-600">
                    My Sessions
                  </Link>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">{user?.full_name}</span>
              {user?.is_super_admin && (
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                  Super Admin
                </span>
              )}
              {user?.is_admin && !user?.is_super_admin && (
                <span className="px-2 py-1 bg-primary-100 text-primary-800 text-xs rounded">
                  Admin
                </span>
              )}
              <button onClick={logout} className="btn btn-secondary">
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;
