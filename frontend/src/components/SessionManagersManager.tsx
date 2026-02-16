import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

interface SessionManagerForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

const SessionManagersManager: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingManager, setEditingManager] = useState<User | null>(null);
  const [formData, setFormData] = useState<SessionManagerForm>({
    username: '',
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    fetchManagers();
  }, []);

  const fetchManagers = async () => {
    try {
      const response = await api.get('/club-settings/session-managers');
      setManagers(response.data);
    } catch (error) {
      console.error('Failed to fetch session managers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/club-settings/session-managers', formData);
      setFormData({ email: '', password: '', full_name: '' });
      setShowCreateForm(false);
      fetchManagers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create session manager');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingManager) return;

    try {
      const updateData: any = {
        email: formData.email,
        full_name: formData.full_name,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.patch(`/club-settings/session-managers/${editingManager.id}`, updateData);
      setFormData({ email: '', password: '', full_name: '' });
      setEditingManager(null);
      fetchManagers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update session manager');
    }
  };

  const handleDelete = async (managerId: number) => {
    if (!confirm('Are you sure you want to delete this session manager?')) return;

    try {
      await api.delete(`/club-settings/session-managers/${managerId}`);
      fetchManagers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete session manager');
    }
  };

  const startEdit = (manager: User) => {
    setEditingManager(manager);
    setFormData({
      username: manager.username,
      email: manager.email || '',
      password: '',
      full_name: manager.full_name,
    });
    setShowCreateForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Session Managers</h2>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingManager(null);
            setFormData({ username: '', email: '', password: '', full_name: '' });
          }}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add Session Manager'}
        </button>
      </div>

      {(showCreateForm || editingManager) && (
        <form onSubmit={editingManager ? handleUpdate : handleCreate} className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {editingManager ? 'Edit Session Manager' : 'Create Session Manager'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input mt-1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="input mt-1"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Password {editingManager && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input mt-1"
                required={!editingManager}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingManager ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingManager(null);
                  setShowCreateForm(false);
                  setFormData({ username: '', email: '', password: '', full_name: '' });
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Username</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {managers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No session managers yet
                </td>
              </tr>
            ) : (
              managers.map((manager) => (
                <tr key={manager.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{manager.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{manager.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{manager.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        manager.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {manager.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => startEdit(manager)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(manager.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default SessionManagersManager;
