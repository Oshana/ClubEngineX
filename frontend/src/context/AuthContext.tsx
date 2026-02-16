import React, { createContext, useContext, useEffect, useState } from 'react';
import { authAPI, playerPortalAPI } from '../api/client';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      // Fetch user profile
      playerPortalAPI.getProfile()
        .then(response => {
          const userData = response.data;
          // Handle missing role field for backward compatibility
          if (!userData.role) {
            // Map old fields to new role
            if (userData.is_super_admin) {
              userData.role = 'super_admin';
            } else if (userData.is_admin) {
              userData.role = 'club_admin';
            } else {
              userData.role = 'session_manager';
            }
          }
          setUser(userData);
        })
        .catch(() => {
          // Token invalid, clear it
          localStorage.removeItem('token');
          setToken(null);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = async (usernameOrEmail: string, password: string) => {
    const response = await authAPI.login(usernameOrEmail, password);
    const { access_token } = response.data;
    
    localStorage.setItem('token', access_token);
    setToken(access_token);
    
    // Fetch user profile
    const userResponse = await playerPortalAPI.getProfile();
    const userData = userResponse.data;
    
    // Handle missing role field for backward compatibility
    if (!userData.role) {
      if (userData.is_super_admin) {
        userData.role = 'super_admin';
      } else if (userData.is_admin) {
        userData.role = 'club_admin';
      } else {
        userData.role = 'session_manager';
      }
    }
    
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
