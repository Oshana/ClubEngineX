import { useDraggable, useDroppable } from '@dnd-kit/core';
import React from 'react';
import { CourtAssignment, MatchType, Player } from '../types';

interface CourtCardProps {
  court: CourtAssignment;
  allPlayers: Player[];
  isDragDisabled?: boolean;
  onRemovePlayer?: (courtId: number, slotName: string) => void;
}

const CourtCard: React.FC<CourtCardProps> = ({ court, allPlayers, isDragDisabled = false, onRemovePlayer }) => {
  const getPlayer = (playerId?: number) => {
    if (!playerId) return null;
    return allPlayers.find(p => p.id === playerId);
  };

  const getPlayerName = (playerId?: number) => {
    if (!playerId) return 'Empty';
    const player = getPlayer(playerId);
    return player?.full_name || 'Unknown';
  };

  const getPlayerLevel = (playerId?: number) => {
    if (!playerId) return null;
    const player = getPlayer(playerId);
    return player?.level;
  };

  const renderPlayerCard = (playerId?: number, bgColor: string = 'bg-blue-50', slotId: string, slotName: string) => {
    const player = getPlayer(playerId);
    const playerName = getPlayerName(playerId);
    const playerLevel = getPlayerLevel(playerId);
    
    // Draggable for the player (if not empty)
    const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
      id: slotId,
      disabled: !playerId || isDragDisabled, // Can't drag empty slots or when round started
      data: {
        playerId,
        courtId: court.id,
        slotId,
      },
    });

    // Droppable for the slot
    const { setNodeRef: setDropRef, isOver } = useDroppable({
      id: slotId,
      disabled: isDragDisabled, // Can't drop when round started
      data: {
        courtId: court.id,
        slotId,
        currentPlayerId: playerId,
      },
    });
    
    return (
      <div
        ref={setDropRef}
        className={`text-sm p-2 ${bgColor} rounded ${isOver ? 'ring-2 ring-green-400' : ''} ${
          isDragging ? 'opacity-50' : ''
        } ${playerId ? 'cursor-move' : 'cursor-default'}`}
      >
        <div className="flex items-center justify-between">
          <div
            ref={setDragRef}
            {...listeners}
            {...attributes}
            className="flex-1"
          >
            <span>{playerName}</span>
          </div>
          <div className="flex items-center gap-1">
            {player?.gender && (
              <span className={`px-1.5 py-0.5 ${player.gender === 'male' ? 'bg-blue-200 text-blue-900' : 'bg-pink-200 text-pink-900'} text-xs rounded font-medium`}>
                {player.gender === 'male' ? 'M' : 'F'}
              </span>
            )}
            {playerLevel && (
              <span className="px-1.5 py-0.5 bg-blue-200 text-blue-900 text-xs rounded font-medium inline-flex items-center gap-1">
                🏆 {playerLevel}
              </span>
            )}
            {playerId && onRemovePlayer && (
              <button
                onClick={(e) => {
                  console.log('Remove button clicked!', court.id, slotName);
                  e.stopPropagation();
                  e.preventDefault();
                  onRemovePlayer(court.id, slotName);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                }}
                className="px-1.5 py-0.5 bg-red-100 hover:bg-red-200 rounded text-red-600 hover:text-red-800 transition-colors text-xs font-bold cursor-pointer"
                title="Remove from court"
                type="button"
              >
                ↓
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getMatchTypeColor = (type: MatchType) => {
    const colors = {
      [MatchType.MM]: 'bg-blue-100 text-blue-800',
      [MatchType.FF]: 'bg-pink-100 text-pink-800',
      [MatchType.MF]: 'bg-purple-100 text-purple-800',
      [MatchType.OTHER]: 'bg-gray-100 text-gray-800',
    };
    return colors[type];
  };

  return (
    <div className="card border-2 border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-bold">Court {court.court_number + 1}</h3>
        <span className={`px-2 py-1 rounded text-xs ${getMatchTypeColor(court.match_type)}`}>
          {court.match_type}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Team A */}
        <div className="border-2 border-blue-200 rounded p-3">
          <p className="text-sm font-medium text-blue-800 mb-2">Team A</p>
          <div className="space-y-1">
            {renderPlayerCard(court.team_a_player1_id, 'bg-blue-50', `court-${court.id}-team-a-player-1`, 'team_a_player1_id')}
            {renderPlayerCard(court.team_a_player2_id, 'bg-blue-50', `court-${court.id}-team-a-player-2`, 'team_a_player2_id')}
          </div>
        </div>

        {/* Team B */}
        <div className="border-2 border-red-200 rounded p-3">
          <p className="text-sm font-medium text-red-800 mb-2">Team B</p>
          <div className="space-y-1">
            {renderPlayerCard(court.team_b_player1_id, 'bg-red-50', `court-${court.id}-team-b-player-1`, 'team_b_player1_id')}
            {renderPlayerCard(court.team_b_player2_id, 'bg-red-50', `court-${court.id}-team-b-player-2`, 'team_b_player2_id')}
          </div>
        </div>
      </div>

      {court.locked && (
        <div className="mt-3 text-center">
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
            🔒 Locked
          </span>
        </div>
      )}
    </div>
  );
};

export default CourtCard;
