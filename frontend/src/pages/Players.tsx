import React, { useEffect, useState } from 'react';
import { clubSettingsAPI, playersAPI } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNotification } from '../context/NotificationContext';
import { Gender, Player } from '../types';

const Players: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingPlayerId, setDeletingPlayerId] = useState<number | null>(null);
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'registered' | 'guest'>('registered');
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    gender: Gender.MALE,
    level: '',
    contact_number: '',
    address: '',
    emergency_contact_name: '',
    emergency_contact_number: '',
  });

  useEffect(() => {
    loadPlayers();
    loadLevels();
  }, [search, activeTab]);

  const loadLevels = async () => {
    try {
      const response = await clubSettingsAPI.getLevels();
      setAvailableLevels(response.data.levels);
    } catch (error) {
      console.error('Failed to load levels:', error);
    }
  };

  const loadPlayers = async () => {
    try {
      const response = await playersAPI.getAll({ search, is_active: true });
      setPlayers(response.data);
    } catch (error) {
      console.error('Failed to load players:', error);
      showNotification('error', 'Failed to load players. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on active tab
  const filteredPlayers = players.filter(player => {
    if (activeTab === 'registered') {
      return !player.is_temp;
    } else {
      return player.is_temp;
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        full_name: `${formData.first_name} ${formData.last_name}`.trim(),
        gender: formData.gender,
        level: formData.level,
        contact_number: formData.contact_number || null,
        address: formData.address || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_number: formData.emergency_contact_number || null,
      };

      if (editingPlayer) {
        await playersAPI.update(editingPlayer.id, submitData);
        showNotification('success', 'Player updated successfully!');
      } else {
        await playersAPI.create(submitData);
        showNotification('success', 'Player created successfully!');
      }
      
      setShowModal(false);
      resetForm();
      await loadPlayers();
    } catch (error: any) {
      console.error('Failed to save player:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to save player. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    const nameParts = player.full_name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    
    setFormData({
      first_name: firstName,
      last_name: lastName,
      gender: player.gender,
      level: player.level || '',
      contact_number: (player as any).contact_number || '',
      address: (player as any).address || '',
      emergency_contact_name: (player as any).emergency_contact_name || '',
      emergency_contact_number: (player as any).emergency_contact_number || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    setDeletingPlayerId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingPlayerId) return;

    try {
      await playersAPI.delete(deletingPlayerId);
      await loadPlayers();
      showNotification('success', 'Player deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete player:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete player. Please try again.';
      showNotification('error', errorMessage);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingPlayerId(null);
    }
  };

  const resetForm = () => {
    setEditingPlayer(null);
    setFormData({
      first_name: '',
      last_name: '',
      gender: Gender.MALE,
      level: '',
      contact_number: '',
      address: '',
      emergency_contact_name: '',
      emergency_contact_number: '',
    });
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Players</h1>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn btn-primary"
        >
          + Add Player
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('registered')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'registered'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Registered Players
          </button>
          <button
            onClick={() => setActiveTab('guest')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'guest'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Guest Players
          </button>
        </nav>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search players..."
          className="input max-w-md"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="card">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-3">Name</th>
              <th className="text-left py-3">Gender</th>
              <th className="text-left py-3">Division</th>
              <th className="text-right py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <tr key={player.id} className="border-b last:border-b-0">
                  <td className="py-3">{player.full_name}</td>
                  <td className="py-3 capitalize">{player.gender}</td>
                  <td className="py-3">
                    {player.level ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {player.level}
                      </span>
                    ) : '-'}
                  </td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => handleEdit(player)}
                      className="text-primary-600 hover:text-primary-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(player.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="py-8 text-center text-gray-500">
                  {activeTab === 'registered' ? 'No registered players found' : 'No guest players found'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">
              {editingPlayer ? 'Edit Player' : 'Add Player'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Gender *</label>
                <select
                  className="input"
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                >
                  <option value={Gender.MALE}>Male</option>
                  <option value={Gender.FEMALE}>Female</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Division *</label>
                <select
                  className="input"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  required
                >
                  <option value="">Select Division</option>
                  {availableLevels.map(level => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Contact Number</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.contact_number}
                  onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
                  placeholder="Optional"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <textarea
                  className="input"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Optional"
                  rows={2}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contact Name *</label>
                <input
                  type="text"
                  className="input"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Emergency Contact Number *</label>
                <input
                  type="tel"
                  className="input"
                  value={formData.emergency_contact_number}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_number: e.target.value })}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">
                  {editingPlayer ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Player"
        message="Are you sure you want to delete this player? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingPlayerId(null);
        }}
        danger
      />
    </div>
  );
};

export default Players;
