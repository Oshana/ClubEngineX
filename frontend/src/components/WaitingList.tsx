import React from 'react';
import { Player, SessionStats } from '../types';

interface WaitingListProps {
  players: Player[];
  stats: SessionStats | null;
}

const WaitingList: React.FC<WaitingListProps> = ({ players, stats }) => {
  const getPlayerStats = (playerId: number) => {
    return stats?.player_stats.find(s => s.player_id === playerId);
  };

  return (
    <div className="h-[600px] flex flex-col">
      <h2 className="text-xl font-bold mb-4">Waiting List ({players.length})</h2>
      
      <div className="card space-y-3 flex-1 overflow-y-auto">
        {players.length === 0 ? (
          <p className="text-gray-500 text-center">All players are assigned</p>
        ) : (
          players.map((player) => {
            const playerStats = getPlayerStats(player.id);
            return (
              <div key={player.id} className="border rounded p-2">
                <div className="font-medium mb-1 flex items-center justify-between gap-2">
                  <span className="flex-1">{player.full_name}</span>
                  {player.level && (
                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium inline-flex items-center gap-0.5">
                      🏆 {player.level}
                    </span>
                  )}
                </div>
                {playerStats && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
                      Played: {playerStats.matches_played}
                    </span>
                    <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded font-medium">
                      Waiting: {playerStats.rounds_sitting_out}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default WaitingList;
