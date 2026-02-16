import axios from 'axios';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

interface ClubAdminForm {
  username: string;
  email: string;
  password: string;
  full_name: string;
}

const ClubAdminsManager: React.FC = () => {
  const { clubId } = useParams<{ clubId: string }>();
  const navigate = useNavigate();
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<User | null>(null);
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [formData, setFormData] = useState<ClubAdminForm>({
    username: '',
    email: '',
    password: '',
    full_name: '',
  });

  useEffect(() => {
    fetchAdmins();
  }, [clubId]);

  const fetchAdmins = async () => {
    try {
      const response = await api.get(`/super-admin/clubs/${clubId}/admins`);
      setAdmins(response.data);
    } catch (error) {
      console.error('Failed to fetch club admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    
    try {
      const submitData = {
        ...formData,
        email: formData.email.trim() || null
      };
      await api.post(`/super-admin/clubs/${clubId}/admins`, submitData);
      setFormData({ username: '', email: '', password: '', full_name: '' });
      setShowCreateForm(false);
      setFormErrors({});
      fetchAdmins();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to create club admin';
      
      // Parse error message to determine which field has the issue
      if (errorMessage.toLowerCase().includes('username already') || (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('taken'))) {
        setFormErrors({ username: errorMessage });
      } else if (errorMessage.toLowerCase().includes('email already') || (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('use'))) {
        setFormErrors({ email: errorMessage });
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrors({});
    if (!editingAdmin) return;

    try {
      const updateData: any = {
        email: formData.email.trim() || null,
        full_name: formData.full_name,
      };
      if (formData.password) {
        updateData.password = formData.password;
      }

      await api.patch(`/super-admin/users/${editingAdmin.id}`, updateData);
      setFormData({ username: '', email: '', password: '', full_name: '' });
      setEditingAdmin(null);
      setFormErrors({});
      fetchAdmins();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to update club admin';
      
      if (errorMessage.toLowerCase().includes('username already') || (errorMessage.toLowerCase().includes('username') && errorMessage.toLowerCase().includes('taken'))) {
        setFormErrors({ username: errorMessage });
      } else if (errorMessage.toLowerCase().includes('email already') || (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('use'))) {
        setFormErrors({ email: errorMessage });
      } else {
        alert(errorMessage);
      }
    }
  };

  const handleDelete = async (adminId: number) => {
    if (!confirm('Are you sure you want to delete this club admin?')) return;

    try {
      await api.delete(`/super-admin/users/${adminId}`);
      fetchAdmins();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete club admin');
    }
  };

  const startEdit = (admin: User) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      email: admin.email || '',
      password: '',
      full_name: admin.full_name,
    });
    setShowCreateForm(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <button
            onClick={() => navigate('/super-admin')}
            className="text-primary-600 hover:text-primary-800 mb-2"
          >
            ← Back to Dashboard
          </button>
          <h2 className="text-2xl font-bold">Club Administrators</h2>
        </div>
        <button
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingAdmin(null);
            setFormData({ username: '', email: '', password: '', full_name: '' });
          }}
          className="btn btn-primary"
        >
          {showCreateForm ? 'Cancel' : 'Add Club Admin'}
        </button>
      </div>

      {(showCreateForm || editingAdmin) && (
        <form onSubmit={editingAdmin ? handleUpdate : handleCreate} className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">
            {editingAdmin ? 'Edit Club Admin' : 'Create Club Admin'}
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username</label>
              <input
                type="text"
                value={formData.username}
                onChange={(e) => { setFormData({ ...formData, username: e.target.value }); setFormErrors({ ...formErrors, username: '' }); }}
                className={`input mt-1 ${formErrors.username ? 'border-red-500' : ''}`}
                required
              />
              {formErrors.username && <p className="text-red-500 text-sm mt-1">{formErrors.username}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Email (optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setFormErrors({ ...formErrors, email: '' }); }}
                className={`input mt-1 ${formErrors.email ? 'border-red-500' : ''}`}
              />
              {formErrors.email && <p className="text-red-500 text-sm mt-1">{formErrors.email}</p>}
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
                Password {editingAdmin && '(leave blank to keep current)'}
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="input mt-1"
                required={!editingAdmin}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingAdmin ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingAdmin(null);
                  setShowCreateForm(false);
                  setFormData({ username: '', email: '', password: '', full_name: '' });
                  setFormErrors({});
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
            {admins.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                  No club admins yet
                </td>
              </tr>
            ) : (
              admins.map((admin) => (
                <tr key={admin.id}>
                  <td className="px-6 py-4 whitespace-nowrap">{admin.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{admin.full_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap">{admin.email || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        admin.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {admin.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap space-x-2">
                    <button
                      onClick={() => startEdit(admin)}
                      className="text-primary-600 hover:text-primary-900"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(admin.id)}
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

export default ClubAdminsManager;
