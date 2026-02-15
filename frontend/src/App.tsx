import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import NotificationToast from './components/NotificationToast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ClubDetail from './pages/ClubDetail';
import Login from './pages/Login';
import PlayerProfile from './pages/PlayerProfile';
import Players from './pages/Players';
import SessionDetail from './pages/SessionDetail';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import Statistics from './pages/Statistics';
import SuperAdminDashboard from './pages/SuperAdminDashboard';

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

  return user?.is_admin || user?.is_super_admin ? <>{children}</> : <Navigate to="/" />;
};

const SuperAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return user?.is_super_admin ? <>{children}</> : <Navigate to="/" />;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();

  if (user?.is_super_admin) {
    return <Navigate to="/super-admin" />;
  }

  if (user?.is_admin) {
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
                <AdminRoute>
                  <Layout>
                    <Players />
                  </Layout>
                </AdminRoute>
              }
            />
            
            <Route
              path="/sessions"
              element={
                <PrivateRoute>
                  <Layout>
                    <Sessions />
                  </Layout>
                </PrivateRoute>
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
                <AdminRoute>
                  <Layout>
                    <Settings />
                  </Layout>
                </AdminRoute>
              }
            />
            
            <Route
              path="/statistics"
              element={
                <AdminRoute>
                  <Layout>
                    <Statistics />
                  </Layout>
                </AdminRoute>
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
          </Routes>
        </AuthProvider>
      </NotificationProvider>
    </BrowserRouter>
  );
}

export default App;
