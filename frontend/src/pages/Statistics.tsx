import React, { useEffect, useState } from 'react';
import { statisticsAPI } from '../api/client';
import { useNotification } from '../context/NotificationContext';

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
  match_type_distribution: {
    MM: number;
    MF: number;
    FF: number;
  };
  session_duration_minutes: number;
  total_round_duration_minutes: number;
}

interface GlobalStats {
  total_sessions: number;
  total_players: number;
  total_matches_played: number;
  avg_session_duration_minutes: number;
  session_stats: SessionStats[];
}

const Statistics: React.FC = () => {
  const [stats, setStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showNotification } = useNotification();

  useEffect(() => {
    loadStats();
    
    // Reload stats when window gains focus (user returns to tab)
    const handleFocus = () => loadStats();
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const loadStats = async () => {
    try {
      const response = await statisticsAPI.getGlobalStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to load statistics:', error);
      showNotification('error', 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading statistics...</div>;
  }

  if (!stats) {
    return <div className="text-center py-8">No statistics available</div>;
  }

  const filteredSessions = stats.session_stats.filter(session =>
    session.session_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group sessions by date
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = new Date(session.session_date).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(session);
    return acc;
  }, {} as Record<string, typeof filteredSessions>);

  // Sort dates in descending order
  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => {
    return new Date(b).getTime() - new Date(a).getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Global Statistics</h1>
        <button
          onClick={() => {
            setLoading(true);
            loadStats();
          }}
          className="btn btn-primary flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Global Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Sessions</div>
          <div className="text-3xl font-bold text-blue-600">{stats.total_sessions}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Players</div>
          <div className="text-3xl font-bold text-green-600">{stats.total_players}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Total Matches</div>
          <div className="text-3xl font-bold text-purple-600">{stats.total_matches_played}</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm mb-1">Avg Session Duration</div>
          <div className="text-3xl font-bold text-orange-600">
            {stats.avg_session_duration_minutes < 1 
              ? `${Math.round(stats.avg_session_duration_minutes * 60)}s`
              : stats.avg_session_duration_minutes < 60
                ? `${stats.avg_session_duration_minutes.toFixed(1)} min`
                : `${Math.floor(stats.avg_session_duration_minutes / 60)}h ${Math.round(stats.avg_session_duration_minutes % 60)}m`
            }
          </div>
        </div>
      </div>

      {/* Session Statistics Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Session Breakdown</h2>
            <input
              type="text"
              placeholder="Search sessions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Session Duration
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Round Duration
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Idle Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rounds
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Players
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Matches
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Matches/Player
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Wait Time
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fairness Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  MM/MF/FF
                </th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-4 text-center text-gray-500">
                    {searchQuery ? 'No sessions found' : 'No sessions yet'}
                  </td>
                </tr>
              ) : (
                sortedDates.map((date) => (
                  <React.Fragment key={date}>
                    {/* Date header row */}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td colSpan={12} className="px-6 py-2">
                        <div className="text-sm font-bold text-gray-700">
                          {date} ({sessionsByDate[date].length} session{sessionsByDate[date].length > 1 ? 's' : ''})
                        </div>
                      </td>
                    </tr>
                    {/* Sessions for this date */}
                    {sessionsByDate[date].map((session, index) => {
                      const idleTime = session.session_duration_minutes - session.total_round_duration_minutes;
                      return (
                      <tr key={`${session.session_id}-${session.session_date}`} className={`hover:bg-gray-50 ${index === sessionsByDate[date].length - 1 ? 'border-b-2 border-gray-200' : ''}`}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {session.session_name}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(session.session_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {session.session_duration_minutes > 0 
                              ? session.session_duration_minutes < 1 
                                ? `${Math.round(session.session_duration_minutes * 60)}s`
                                : session.session_duration_minutes < 60
                                  ? `${session.session_duration_minutes.toFixed(1)} min`
                                  : `${Math.floor(session.session_duration_minutes / 60)}h ${Math.round(session.session_duration_minutes % 60)}m`
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {session.total_round_duration_minutes > 0 
                              ? session.total_round_duration_minutes < 1 
                                ? `${Math.round(session.total_round_duration_minutes * 60)}s`
                                : session.total_round_duration_minutes < 60
                                  ? `${session.total_round_duration_minutes.toFixed(1)} min`
                                  : `${Math.floor(session.total_round_duration_minutes / 60)}h ${Math.round(session.total_round_duration_minutes % 60)}m`
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {idleTime > 0 
                              ? idleTime < 1 
                                ? `${Math.round(idleTime * 60)}s`
                                : idleTime < 60
                                  ? `${idleTime.toFixed(1)} min`
                                  : `${Math.floor(idleTime / 60)}h ${Math.round(idleTime % 60)}m`
                              : '-'
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{session.total_rounds}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{session.total_players}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">{session.total_matches}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {session.avg_matches_per_player.toFixed(1)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {session.avg_waiting_time < 1 
                              ? `${Math.round(session.avg_waiting_time * 60)}s`
                              : `${Math.round(session.avg_waiting_time)} min`
                            }
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            {session.fairness_score.toFixed(2)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="text-sm text-gray-900">
                            <span className="text-blue-600">{session.match_type_distribution.MM}</span>
                            {' / '}
                            <span className="text-purple-600">{session.match_type_distribution.MF}</span>
                            {' / '}
                            <span className="text-pink-600">{session.match_type_distribution.FF}</span>
                          </div>
                        </td>
                      </tr>
                    )})}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Statistics;
