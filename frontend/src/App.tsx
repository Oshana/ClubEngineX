import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import NotificationToast from './components/NotificationToast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ClubAdminsManager from './pages/ClubAdminsManager';
import ClubDetail from './pages/ClubDetail';
import Login from './pages/Login';
import PlayerProfile from './pages/PlayerProfile';
import Players from './pages/Players';
import SessionDetail from './pages/SessionDetail';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import SuperAdminDashboard from './pages/SuperAdminDashboard';
import { UserRole } from './types';

const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user ? <>{children}</> : <Navigate to="/login" />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Allow club admins and session managers
  return user?.role && [UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN, UserRole.SESSION_MANAGER].includes(user.role) ? <>{children}</> : <Navigate to="/" />;
};

const ClubAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Only club admins and super admins
  return user?.role && [UserRole.SUPER_ADMIN, UserRole.CLUB_ADMIN].includes(user.role) ? <>{children}</> : <Navigate to="/" />;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user?.role === UserRole.SUPER_ADMIN ? <>{children}</> : <Navigate to="/" />;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === UserRole.SUPER_ADMIN) {
    return <Navigate to="/super-admin" />;
  }

  if (user?.role === UserRole.CLUB_ADMIN) {
    return <Navigate to="/sessions" />;
  }

  if (user?.role === UserRole.SESSION_MANAGER) {
    return <Navigate to="/sessions" />;
  }

  return <Navigate to="/profile" />;
};

function App() {
  return (
    <BrowserRouter>
      <NotificationProvider>
        <AuthProvider>
          <NotificationToast />
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            
            <Route
              path="/players"
              element={
                <ClubAdminRoute>
                  <Layout>
                    <Players />
                  </Layout>
                </ClubAdminRoute>
              }
            />
            
            <Route
              path="/sessions"
              element={
                <AdminRoute>
                  <Layout>
                    <Sessions />
                  </Layout>
                </AdminRoute>
              }
            />
            
            <Route
              path="/sessions/:id"
              element={
                <AdminRoute>
                  <Layout>
                    <SessionDetail />
                  </Layout>
                </AdminRoute>
              }
            />
            
            <Route
              path="/settings"
              element={
                <ClubAdminRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </ClubAdminRoute>
              }
            />
            
            <Route
              path="/statistics"
              element={
                <ClubAdminRoute>
                  <Layout>
                    <Statistics />
                  </Layout>
                </ClubAdminRoute>
              }
            />
            
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Layout>
                    <PlayerProfile />
                  </Layout>
                </PrivateRoute>
              }
            />
            
            <Route
              path="/super-admin"
              element={
                <SuperAdminRoute>
                  <Layout>
                    <SuperAdminDashboard />
                  </Layout>
                </SuperAdminRoute>
              }
            />
            
            <Route
              path="/super-admin/clubs/:id"
              element={
                <SuperAdminRoute>
                  <Layout>
                    <ClubDetail />
                  </Layout>
                </SuperAdminRoute>
              }
            />
            
            <Route
              path="/super-admin/clubs/:clubId/admins"
              element={
                <SuperAdminRoute>
                  <Layout>
                    <ClubAdminsManager />
                  </Layout>
                </SuperAdminRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
