import React, { useEffect, useState } from 'react';
import { playerPortalAPI } from '../api/client';
import { PlayerProfileStats } from '../types';

const PlayerProfile: React.FC = () => {
  const [stats, setStats] = useState<PlayerProfileStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await playerPortalAPI.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">No stats available</div>;
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">My Profile</h1>

      {/* Overview */}
      <div className="card mb-6">
        <h2 className="text-2xl font-bold mb-4">{stats.player_name}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Matches</p>
            <p className="text-3xl font-bold text-primary-600">{stats.total_matches}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Sessions</p>
            <p className="text-3xl font-bold text-primary-600">{stats.total_sessions}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Avg Matches/Session</p>
            <p className="text-3xl font-bold text-primary-600">
              {stats.total_sessions > 0 ? (stats.total_matches / stats.total_sessions).toFixed(1) : 0}
            </p>
          </div>
        </div>
      </div>

      {/* Match Types */}
      <div className="card mb-6">
        <h3 className="text-xl font-bold mb-4">Match Types</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(stats.match_type_counts).map(([type, count]) => (
            <div key={type}>
              <p className="text-sm text-gray-600">{type}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Frequent Partners */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h3 className="text-xl font-bold mb-4">Frequent Partners</h3>
          <div className="space-y-2">
            {stats.frequent_partners.slice(0, 5).map((partner, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>{partner.name}</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {partner.count} matches
                </span>
              </div>
            ))}
            {stats.frequent_partners.length === 0 && (
              <p className="text-gray-500 text-center">No data yet</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="text-xl font-bold mb-4">Frequent Opponents</h3>
          <div className="space-y-2">
            {stats.frequent_opponents.slice(0, 5).map((opponent, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span>{opponent.name}</span>
                <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                  {opponent.count} matches
                </span>
              </div>
            ))}
            {stats.frequent_opponents.length === 0 && (
              <p className="text-gray-500 text-center">No data yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="card">
        <h3 className="text-xl font-bold mb-4">Recent Sessions</h3>
        <div className="space-y-3">
          {stats.recent_sessions.map((session) => (
            <div key={session.session_id} className="border rounded p-3">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{session.session_name}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.date).toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Matches</p>
                  <p className="text-xl font-bold">{session.matches_played}</p>
                </div>
              </div>
            </div>
          ))}
          {stats.recent_sessions.length === 0 && (
            <p className="text-gray-500 text-center">No sessions yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlayerProfile;
