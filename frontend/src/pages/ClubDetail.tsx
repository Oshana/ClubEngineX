import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { superAdminAPI } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNotification } from '../context/NotificationContext';
import { Club, SubscriptionStatus, User } from '../types';

interface ClubStats {
  club_id: number;
  club_name: string;
  total_players: number;
  total_admins: number;
  total_sessions: number;
  active_sessions: number;
  subscription_status: SubscriptionStatus;
  subscription_end_date?: string;
}

const ClubDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const clubId = parseInt(id!);
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  
  const [club, setClub] = useState<Club | null>(null);
  const [stats, setStats] = useState<ClubStats | null>(null);
  const [admins, setAdmins] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<Club>>({});
  const [formErrors, setFormErrors] = useState<{[key: string]: string}>({});
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false);

  useEffect(() => {
    loadData();
  }, [clubId]);

  const loadData = async () => {
    try {
      const [clubRes, statsRes, adminsRes] = await Promise.all([
        superAdminAPI.getClub(clubId),
        superAdminAPI.getClubStats(clubId),
        superAdminAPI.getClubAdmins(clubId),
      ]);
      setClub(clubRes.data);
      setStats(statsRes.data);
      setAdmins(adminsRes.data);
      setEditData(clubRes.data);
    } catch (error: any) {
      console.error('Failed to load club data:', error);
      showNotification('error', 'Failed to load club data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    setFormErrors({});
    
    try {
      const submitData = {
        ...editData,
        contact_email: editData.contact_email?.trim() || null
      };
      await superAdminAPI.updateClub(clubId, submitData);
      showNotification('success', 'Club updated successfully');
      setEditMode(false);
      setFormErrors({});
      loadData();
    } catch (error: any) {
      console.error('Failed to update club:', error);
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' ? detail : JSON.stringify(detail) || 'Failed to update club';
      
      // Parse error message to determine which field has the issue
      if (errorMessage.toLowerCase().includes('name already exists') || (errorMessage.toLowerCase().includes('name') && errorMessage.toLowerCase().includes('exists'))) {
        setFormErrors({ name: errorMessage });
      } else if (errorMessage.toLowerCase().includes('email already') || (errorMessage.toLowerCase().includes('email') && errorMessage.toLowerCase().includes('exists'))) {
        setFormErrors({ contact_email: errorMessage });
      } else {
        showNotification('error', errorMessage);
      }
    }
  };

  const handleDelete = async () => {
    setShowDeleteDialog(false);
    try {
      await superAdminAPI.deleteClub(clubId);
      showNotification('success', 'Club deleted successfully');
      navigate('/super-admin');
    } catch (error: any) {
      console.error('Failed to delete club:', error);
      showNotification('error', error.response?.data?.detail || 'Failed to delete club');
    }
  };

  const handleDeactivate = async () => {
    setShowDeactivateDialog(false);
    const action = club?.is_active ? 'deactivate' : 'reactivate';
    try {
      await superAdminAPI.toggleClubActive(clubId);
      showNotification('success', `Club ${action}d successfully`);
      loadData();
    } catch (error: any) {
      console.error(`Failed to ${action} club:`, error);
      showNotification('error', error.response?.data?.detail || `Failed to ${action} club`);
    }
  };

  if (loading || !club || !stats) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    const colors = {
      [SubscriptionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SubscriptionStatus.TRIAL]: 'bg-blue-100 text-blue-800',
      [SubscriptionStatus.EXPIRED]: 'bg-red-100 text-red-800',
      [SubscriptionStatus.SUSPENDED]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/super-admin')}
          className="text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Dashboard
        </button>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{club.name}</h1>
            <p className="text-gray-600">{club.address}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate(`/super-admin/clubs/${id}/admins`)}
              className="btn btn-secondary"
            >
              Manage Admins
            </button>
            {editMode ? (
              <>
                <button onClick={handleUpdate} className="btn btn-primary">
                  Save Changes
                </button>
                <button onClick={() => { setEditMode(false); setFormErrors({}); }} className="btn btn-secondary">
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button onClick={() => setEditMode(true)} className="btn btn-primary">
                  Edit Club
                </button>
                <button onClick={() => setShowDeactivateDialog(true)} className="btn btn-secondary">
                  {club.is_active ? 'Deactivate' : 'Reactivate'}
                </button>
                <button onClick={() => setShowDeleteDialog(true)} className="btn btn-danger">
                  Delete Club
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Players</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total_players}</div>
          <div className="text-xs text-gray-500 mt-1">Limit: {club.max_players}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Admins</div>
          <div className="text-3xl font-bold text-purple-600">{stats.total_admins}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-green-600">{stats.total_sessions}</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-sm text-gray-600 mb-1">Active Sessions</div>
          <div className="text-3xl font-bold text-orange-600">{stats.active_sessions}</div>
        </div>
      </div>

      {/* Club Details */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Club Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {editMode ? (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Club Name</label>
                <input
                  type="text"
                  value={editData.name || ''}
                  onChange={(e) => { setEditData({ ...editData, name: e.target.value }); setFormErrors({ ...formErrors, name: '' }); }}
                  className={`w-full px-3 py-2 border rounded-md ${formErrors.name ? 'border-red-500' : ''}`}
                />
                {formErrors.name && <p className="text-red-500 text-sm mt-1">{formErrors.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Email</label>
                <input
                  type="email"
                  value={editData.contact_email || ''}
                  onChange={(e) => { setEditData({ ...editData, contact_email: e.target.value }); setFormErrors({ ...formErrors, contact_email: '' }); }}
                  className={`w-full px-3 py-2 border rounded-md ${formErrors.contact_email ? 'border-red-500' : ''}`}
                />
                {formErrors.contact_email && <p className="text-red-500 text-sm mt-1">{formErrors.contact_email}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Contact Phone</label>
                <input
                  type="tel"
                  value={editData.contact_phone || ''}
                  onChange={(e) => setEditData({ ...editData, contact_phone: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subscription Status</label>
                <select
                  value={editData.subscription_status}
                  onChange={(e) => setEditData({ ...editData, subscription_status: e.target.value as SubscriptionStatus })}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value={SubscriptionStatus.ACTIVE}>Active</option>
                  <option value={SubscriptionStatus.TRIAL}>Trial</option>
                  <option value={SubscriptionStatus.EXPIRED}>Expired</option>
                  <option value={SubscriptionStatus.SUSPENDED}>Suspended</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subscription End Date</label>
                <input
                  type="date"
                  value={editData.subscription_end_date ? editData.subscription_end_date.split('T')[0] : ''}
                  onChange={(e) => setEditData({ ...editData, subscription_end_date: e.target.value })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Players</label>
                <input
                  type="number"
                  value={editData.max_players || 0}
                  onChange={(e) => setEditData({ ...editData, max_players: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Max Sessions per Month</label>
                <input
                  type="number"
                  value={editData.max_sessions_per_month || 0}
                  onChange={(e) => setEditData({ ...editData, max_sessions_per_month: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <div className="text-sm text-gray-600">Contact Email</div>
                <div className="font-medium">{club.contact_email || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Contact Phone</div>
                <div className="font-medium">{club.contact_phone || 'Not set'}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Subscription Status</div>
                <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusBadge(club.subscription_status)}`}>
                  {club.subscription_status}
                </span>
              </div>
              <div>
                <div className="text-sm text-gray-600">Subscription End Date</div>
                <div className="font-medium">
                  {club.subscription_end_date ? new Date(club.subscription_end_date).toLocaleDateString() : 'Not set'}
                </div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Max Players</div>
                <div className="font-medium">{club.max_players}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Max Sessions per Month</div>
                <div className="font-medium">{club.max_sessions_per_month}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Created</div>
                <div className="font-medium">{new Date(club.created_at).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Updated</div>
                <div className="font-medium">{new Date(club.updated_at).toLocaleString()}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Club Admins */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Club Administrators</h2>
        {admins.length === 0 ? (
          <p className="text-gray-500">No administrators assigned to this club</p>
        ) : (
          <div className="space-y-3">
            {admins.map((admin) => (
              <div key={admin.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{admin.full_name}</div>
                  <div className="text-sm text-gray-600">{admin.email}</div>
                </div>
                <div className="text-sm text-gray-500">
                  Joined {new Date(admin.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="Delete Club"
        message={`Are you sure you want to permanently delete "${club?.name}"? This will remove all associated data including players, sessions, and settings. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        danger={true}
      />

      {/* Deactivate/Reactivate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeactivateDialog}
        title={club?.is_active ? 'Deactivate Club' : 'Reactivate Club'}
        message={`Are you sure you want to ${club?.is_active ? 'deactivate' : 'reactivate'} "${club?.name}"?${club?.is_active ? ' Users will not be able to access this club while it is deactivated.' : ''}`}
        confirmLabel={club?.is_active ? 'Deactivate' : 'Reactivate'}
        cancelLabel="Cancel"
        onConfirm={handleDeactivate}
        onCancel={() => setShowDeactivateDialog(false)}
        danger={club?.is_active}
      />
    </div>
  );
};

export default ClubDetail;
