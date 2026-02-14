import { useDraggable, useDroppable } from '@dnd-kit/core';
import React from 'react';
import { Attendance, Player, Round, SessionStats } from '../types';

interface WaitingListProps {
  players: Player[];
  stats: SessionStats | null;
  rounds: Round[];
  attendanceRecords: Attendance[];
  isDragDisabled?: boolean;
}

interface WaitingPlayerProps {
  player: Player;
  playerStats: any;
  roundHistory: string;
  isDragDisabled: boolean;
}

const WaitingPlayer: React.FC<WaitingPlayerProps> = ({ player, playerStats, roundHistory, isDragDisabled }) => {
  const slotId = `waiting-${player.id}`;
  
  // Draggable for waiting list player
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: slotId,
    disabled: isDragDisabled,
    data: {
      playerId: player.id,
      slotId,
      isWaiting: true,
    },
  });
  
  return (
    <div 
      ref={setDragRef}
      {...listeners}
      {...attributes}
      className={`border rounded p-2 ${isDragging ? 'opacity-50' : ''} ${!isDragDisabled ? 'cursor-move' : 'cursor-default'}`}
    >
      <div className="font-medium mb-1 flex items-center justify-between gap-2">
        <span className="flex-1">{player.full_name}</span>
        <div className="flex items-center gap-1">
          {player.gender && (
            <span className={`px-1.5 py-0.5 ${player.gender === 'male' ? 'bg-blue-200 text-blue-900' : 'bg-pink-200 text-pink-900'} text-xs rounded font-medium`}>
              {player.gender === 'male' ? 'M' : 'F'}
            </span>
          )}
          {player.level && (
            <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium inline-flex items-center gap-0.5">
              🏆 {player.level}
            </span>
          )}
        </div>
      </div>
      {playerStats && (
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="px-1.5 py-0.5 bg-green-100 text-green-800 text-xs rounded font-medium">
            Played: {playerStats.matches_played}
          </span>
          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-800 text-xs rounded font-medium">
            Waiting: {playerStats.rounds_sitting_out}
          </span>
        </div>
      )}
      {roundHistory && (
        <div className="flex items-center gap-1 flex-wrap">
          {roundHistory.split('').map((char, idx) => (
            <span 
              key={idx}
              className={`w-5 h-5 flex items-center justify-center text-xs font-bold rounded ${
                char === 'P' 
                  ? 'bg-green-500 text-white' 
                  : char === 'W'
                  ? 'bg-orange-500 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
              title={char === 'P' ? 'Played' : char === 'W' ? 'Waiting' : 'Not in session'}
            >
              {char}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const WaitingList: React.FC<WaitingListProps> = ({ players, stats, rounds, attendanceRecords, isDragDisabled = false }) => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [sortBy, setSortBy] = React.useState<'waiting' | 'matches' | null>(null);
  const [sortAscending, setSortAscending] = React.useState(false);

  // Check if there are any players in the session at all
  const hasPlayersInSession = stats && stats.player_stats && stats.player_stats.length > 0;

  const getPlayerStats = (playerId: number) => {
    return stats?.player_stats.find(s => s.player_id === playerId);
  };

  const getRoundHistory = (playerId: number): string => {
    if (!rounds || rounds.length === 0) return '';
    
    // Find when this player joined
    const attendance = attendanceRecords.find(a => a.player_id === playerId);
    const joinTime = attendance ? new Date(attendance.check_in_time).getTime() : 0;
    
    // Count rounds before player joined
    const roundsBeforeJoin = rounds.filter(round => {
      const roundTime = new Date(round.created_at).getTime();
      return roundTime < joinTime;
    }).length;
    
    // Build pattern: missed rounds as '-', then P/W for rounds after joining
    const missedRounds = '-'.repeat(roundsBeforeJoin);
    
    const playedRounds = rounds
      .filter(round => {
        // Only include rounds created at or after player joined
        const roundTime = new Date(round.created_at).getTime();
        return joinTime <= roundTime;
      })
      .map(round => {
        const wasPlaying = round.court_assignments.some(court => 
          court.team_a_player1_id === playerId ||
          court.team_a_player2_id === playerId ||
          court.team_b_player1_id === playerId ||
          court.team_b_player2_id === playerId
        );
        return wasPlaying ? 'P' : 'W';
      }).join('');
    
    return missedRounds + playedRounds;
  };

  const filteredPlayers = players.filter(player => 
    player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort players based on selected sort option
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    if (!sortBy) return 0;
    
    const statsA = getPlayerStats(a.id);
    const statsB = getPlayerStats(b.id);
    
    let result = 0;
    
    if (sortBy === 'waiting') {
      // Sort by rounds_sitting_out
      const waitingA = statsA?.rounds_sitting_out || 0;
      const waitingB = statsB?.rounds_sitting_out || 0;
      result = waitingB - waitingA;
    } else if (sortBy === 'matches') {
      // Sort by matches_played
      const matchesA = statsA?.matches_played || 0;
      const matchesB = statsB?.matches_played || 0;
      result = matchesA - matchesB;
    }
    
    return sortAscending ? -result : result;
  });

  // Make the waiting list area droppable
  const { setNodeRef: setDropRef } = useDroppable({
    id: 'waiting-list-area',
    data: {
      isWaitingListArea: true,
    },
  });

  return (
    <div className="h-[600px] flex flex-col">
      <h2 className="text-xl font-bold mb-4">Waiting List ({sortedPlayers.length})</h2>
      
      <div ref={setDropRef} className="card flex flex-col flex-1 overflow-hidden">
        <input
          type="text"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => {
              if (sortBy === 'waiting') {
                setSortAscending(!sortAscending);
              } else {
                setSortAscending(false);
                setSortBy('waiting');
              }
            }}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              sortBy === 'waiting'
                ? 'bg-orange-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Waiting {sortBy === 'waiting' && (sortAscending ? '↓' : '↑')}
          </button>
          <button
            onClick={() => {
              if (sortBy === 'matches') {
                setSortAscending(!sortAscending);
              } else {
                setSortAscending(false);
                setSortBy('matches');
              }
            }}
            className={`flex-1 px-2 py-1 text-xs font-medium rounded transition-colors flex items-center justify-center gap-1 ${
              sortBy === 'matches'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Played {sortBy === 'matches' && (sortAscending ? '↑' : '↓')}
          </button>
        </div>
        
        <div className="space-y-3 flex-1 overflow-y-auto">
        {sortedPlayers.length === 0 ? (
          <p className="text-gray-500 text-center">
            {searchQuery 
              ? 'No players found' 
              : hasPlayersInSession 
                ? 'All players are assigned' 
                : 'No players in session'}
          </p>
        ) : (
          sortedPlayers.map((player) => (
            <WaitingPlayer
              key={player.id}
              player={player}
              playerStats={getPlayerStats(player.id)}
              roundHistory={getRoundHistory(player.id)}
              isDragDisabled={isDragDisabled}
            />
          ))
        )}
      </div>
      </div>
    </div>
  );
};

export default WaitingList;
