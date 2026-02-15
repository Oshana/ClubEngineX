import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      showNotification('success', 'Login successful! Welcome back.');
      navigate('/');
    } catch (err: any) {
      console.error('Login failed:', err);
      const errorMessage = err.response?.data?.detail || 'Login failed. Please check your credentials.';
      setError(errorMessage);
      showNotification('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="card max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">Badminton Club Manager</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
        
        <div className="mt-6 space-y-3">
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-center font-medium text-purple-900 mb-2">Super Admin Credentials:</p>
            <div className="space-y-1 text-center text-purple-800">
              <p className="font-mono text-sm">Email: admin@example.com</p>
              <p className="font-mono text-sm">Password: admin123</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@example.com');
                setPassword('admin123');
              }}
              className="mt-2 w-full text-xs text-purple-600 hover:text-purple-800"
            >
              Click to use these credentials
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
