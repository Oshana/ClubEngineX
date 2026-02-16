import React, { useEffect, useState } from 'react';
import { superAdminAPI } from '../api/client';
import { useNotification } from '../context/NotificationContext';

interface MatchTypeDistribution {
  MM: number;
  MF: number;
  FF: number;
}

interface SessionStats {
  session_id: number;
  session_name: string;
  session_date: string;
  total_rounds: number;
  total_players: number;
  total_matches: number;
  avg_matches_per_player: number;
  avg_waiting_time: number;
  fairness_score: number;
  match_type_distribution: MatchTypeDistribution;
  session_duration_minutes: number;
  total_round_duration_minutes: number;
}

interface ClubStats {
  club_id: number;
  club_name: string;
  total_sessions: number;
  total_players: number;
  total_matches_played: number;
  avg_session_duration_minutes: number;
  session_stats: SessionStats[];
}

interface GlobalStats {
  total_clubs: number;
  total_sessions: number;
  total_players: number;
  total_matches_played: number;
  avg_session_duration_minutes: number;
  club_stats: ClubStats[];
}

const SuperAdminStatistics: React.FC = () => {
  const { showNotification } = useNotification();
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedClubs, setExpandedClubs] = useState<Set<number>>(new Set());

  useEffect(() => {
    loadStatistics();
  }, []);

  const loadStatistics = async (search?: string) => {
    try {
      setLoading(true);
      const response = await superAdminAPI.getStatistics({ search });
      setStats(response.data);
    } catch (error: any) {
      console.error('Failed to load statistics:', error);
      showNotification('error', 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadStatistics(searchTerm.trim() || undefined);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    loadStatistics();
  };

  const toggleClubExpanded = (clubId: number) => {
    const newExpanded = new Set(expandedClubs);
    if (newExpanded.has(clubId)) {
      newExpanded.delete(clubId);
    } else {
      newExpanded.add(clubId);
    }
    setExpandedClubs(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">Loading statistics...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-lg text-gray-600">No statistics available</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Global Statistics</h1>
        <p className="text-gray-600 mt-2">View statistics across all clubs</p>
      </div>

      {/* Global Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Clubs</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total_clubs}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-green-600">{stats.total_sessions}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Players</div>
          <div className="text-3xl font-bold text-purple-600">{stats.total_players}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Total Matches</div>
          <div className="text-3xl font-bold text-orange-600">{stats.total_matches_played}</div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="text-sm text-gray-500 mb-1">Avg Session (min)</div>
          <div className="text-3xl font-bold text-indigo-600">{stats.avg_session_duration_minutes}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search clubs by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Search
          </button>
          {searchTerm && (
            <button
              onClick={handleClearSearch}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Club Statistics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Club Statistics</h2>
        
        {stats.club_stats.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No clubs found
          </div>
        ) : (
          stats.club_stats.map((club) => (
            <div key={club.club_id} className="bg-white rounded-lg shadow">
              {/* Club Summary */}
              <div
                onClick={() => toggleClubExpanded(club.club_id)}
                className="p-6 cursor-pointer hover:bg-gray-50"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{club.club_name}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Sessions</div>
                        <div className="text-lg font-semibold text-gray-900">{club.total_sessions}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Players</div>
                        <div className="text-lg font-semibold text-gray-900">{club.total_players}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Matches</div>
                        <div className="text-lg font-semibold text-gray-900">{club.total_matches_played}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Avg Duration (min)</div>
                        <div className="text-lg font-semibold text-gray-900">{club.avg_session_duration_minutes}</div>
                      </div>
                    </div>
                  </div>
                  <div className="ml-4">
                    <svg
                      className={`w-6 h-6 text-gray-400 transition-transform ${
                        expandedClubs.has(club.club_id) ? 'transform rotate-180' : ''
                      }`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Session Details */}
              {expandedClubs.has(club.club_id) && club.session_stats.length > 0 && (
                <div className="border-t border-gray-200 p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Session History</h4>
                  <div className="space-y-3">
                    {club.session_stats.map((session) => (
                      <div
                        key={session.session_id}
                        className="bg-gray-50 p-4 rounded-lg border border-gray-200"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h5 className="font-semibold text-gray-900">{session.session_name}</h5>
                            <p className="text-sm text-gray-500">
                              {new Date(session.session_date).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500">Fairness Score</div>
                            <div className="text-lg font-semibold text-green-600">
                              {session.fairness_score}/10
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-gray-500">Rounds:</span>{' '}
                            <span className="font-semibold">{session.total_rounds}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Players:</span>{' '}
                            <span className="font-semibold">{session.total_players}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Matches:</span>{' '}
                            <span className="font-semibold">{session.total_matches}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Avg Matches/Player:</span>{' '}
                            <span className="font-semibold">{session.avg_matches_per_player.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Avg Wait (min):</span>{' '}
                            <span className="font-semibold">{session.avg_waiting_time.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Duration (min):</span>{' '}
                            <span className="font-semibold">{session.session_duration_minutes.toFixed(1)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Match Types:</span>{' '}
                            <span className="font-semibold">
                              MM:{session.match_type_distribution.MM} MF:{session.match_type_distribution.MF} FF:{session.match_type_distribution.FF}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {expandedClubs.has(club.club_id) && club.session_stats.length === 0 && (
                <div className="border-t border-gray-200 p-6 text-center text-gray-500">
                  No session history available
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SuperAdminStatistics;
