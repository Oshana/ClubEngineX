import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { superAdminAPI } from '../api/client';
import { useNotification } from '../context/NotificationContext';
import { Club, SubscriptionStatus } from '../types';

interface DashboardStats {
  total_clubs: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  total_players: number;
  total_sessions: number;
  recent_clubs: Array<{
    id: number;
    name: string;
    subscription_status: SubscriptionStatus;
    created_at: string;
  }>;
}

const SuperAdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newClub, setNewClub] = useState({
    name: '',
    address: '',
    contact_email: '',
    contact_phone: '',
    max_players: 100,
    max_sessions_per_month: 20,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [dashboardRes, clubsRes] = await Promise.all([
        superAdminAPI.getDashboard(),
        superAdminAPI.getClubs(),
      ]);
      setStats(dashboardRes.data);
      setClubs(clubsRes.data);
    } catch (error: any) {
      console.error('Failed to load data:', error);
      showNotification('error', 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClub = async () => {
    if (!newClub.name.trim()) {
      showNotification('error', 'Club name is required');
      return;
    }

    try {
      await superAdminAPI.createClub(newClub);
      showNotification('success', 'Club created successfully');
      setShowCreateModal(false);
      setNewClub({
        name: '',
        address: '',
        contact_email: '',
        contact_phone: '',
        max_players: 100,
        max_sessions_per_month: 20,
      });
      loadData();
    } catch (error: any) {
      console.error('Failed to create club:', error);
      showNotification('error', 'Failed to create club');
    }
  };

  const getStatusBadge = (status: SubscriptionStatus) => {
    const colors = {
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
      [SubscriptionStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Super Admin Dashboard</h1>
        <p className="text-gray-600">Manage all badminton clubs and subscriptions</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Clubs</div>
            <div className="text-3xl font-bold text-blue-600">{stats.total_clubs}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Active Subscriptions</div>
            <div className="text-3xl font-bold text-green-600">{stats.active_subscriptions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Trial Subscriptions</div>
            <div className="text-3xl font-bold text-blue-600">{stats.trial_subscriptions}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Players</div>
            <div className="text-3xl font-bold text-purple-600">{stats.total_players}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
            <div className="text-3xl font-bold text-orange-600">{stats.total_sessions}</div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + Create New Club
        </button>
      </div>

      {/* Clubs Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold">All Clubs</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Club Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subscription</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Players Limit</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {clubs.map((club) => (
                <tr key={club.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{club.name}</div>
                    {club.address && <div className="text-sm text-gray-500">{club.address}</div>}
                  </td>
                  <td className="px-6 py-4">
                    {club.contact_email && <div className="text-sm text-gray-900">{club.contact_email}</div>}
                    {club.contact_phone && <div className="text-sm text-gray-500">{club.contact_phone}</div>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(club.subscription_status)}`}>
                      {club.subscription_status}
                    </span>
                    {club.subscription_end_date && (
                      <div className="text-xs text-gray-500 mt-1">
                        Expires: {new Date(club.subscription_end_date).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{club.max_players}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(club.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => navigate(`/super-admin/clubs/${club.id}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Club Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Create New Club</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Club Name *</label>
                <input
                  type="text"
                  value={newClub.name}
                  onChange={(e) => setNewClub({ ...newClub, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter club name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newClub.address}
                  onChange={(e) => setNewClub({ ...newClub, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={newClub.contact_email}
                  onChange={(e) => setNewClub({ ...newClub, contact_email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="contact@club.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={newClub.contact_phone}
                  onChange={(e) => setNewClub({ ...newClub, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Players</label>
                <input
                  type="number"
                  value={newClub.max_players}
                  onChange={(e) => setNewClub({ ...newClub, max_players: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Sessions per Month</label>
                <input
                  type="number"
                  value={newClub.max_sessions_per_month}
                  onChange={(e) => setNewClub({ ...newClub, max_sessions_per_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={handleCreateClub} className="btn btn-primary flex-1">
                Create Club
              </button>
              <button onClick={() => setShowCreateModal(false)} className="btn btn-secondary flex-1">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminDashboard;
