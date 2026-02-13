import { DndContext, DragEndEvent, DragOverlay, DragOverEvent, DragStartEvent, closestCenter, pointerWithin } from '@dnd-kit/core';
import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { playersAPI, roundsAPI, sessionsAPI, clubSettingsAPI } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import CourtCard from '../components/CourtCard';
import WaitingList from '../components/WaitingList';
import { useNotification } from '../context/NotificationContext';
import { Player, Round, Session, SessionStats } from '../types';

const SessionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const sessionId = parseInt(id!);
  const navigate = useNavigate();
  
  const [session, setSession] = useState<Session | null>(null);
  const [allPlayers, setAllPlayers] = useState<Player[]>([]);
  const [temporaryPlayers, setTemporaryPlayers] = useState<Player[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
  const [showTempPlayerModal, setShowTempPlayerModal] = useState(false);
  const [showTempPlayerForm, setShowTempPlayerForm] = useState(false);
  const [tempPlayerName, setTempPlayerName] = useState('');
  const [tempPlayerGender, setTempPlayerGender] = useState<'male' | 'female'>('male');
  const [tempPlayerLevel, setTempPlayerLevel] = useState('');
  const [availableLevels, setAvailableLevels] = useState<string[]>([]);
  const [presentPlayers, setPresentPlayers] = useState<number[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAttendance, setShowAttendance] = useState(false);
  const [showEndSessionConfirm, setShowEndSessionConfirm] = useState(false);
  const [showCancelRoundConfirm, setShowCancelRoundConfirm] = useState(false);
  const [showEndRoundConfirm, setShowEndRoundConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [panelSearchQuery, setPanelSearchQuery] = useState('');
  const [confirmedSessionPlayers, setConfirmedSessionPlayers] = useState<number[]>([]);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showManualAssignment, setShowManualAssignment] = useState(false);
  const [manualAssignments, setManualAssignments] = useState<any[]>([]);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [autoAssignRemaining, setAutoAssignRemaining] = useState(false);
  const [showCancelButton, setShowCancelButton] = useState(false); // Track if Cancel Round button should show
  const [showResetCourtsConfirm, setShowResetCourtsConfirm] = useState(false);
  const [sortBy, setSortBy] = useState<'waiting' | 'played' | 'name' | 'gender' | 'division' | 'mm' | 'mf' | 'ff'>('waiting');
  const [attendanceSortBy, setAttendanceSortBy] = useState<'name' | 'gender' | 'division'>('name');
  const [attendanceSortOrder, setAttendanceSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [draggedPlayer, setDraggedPlayer] = useState<{ id: number; name: string; level?: string } | null>(null);
  const [targetPlayer, setTargetPlayer] = useState<{ id: number; name: string; level?: string } | null>(null);
  const [matchTypePopup, setMatchTypePopup] = useState<{ playerId: number; playerName: string; counts: any; opponentsCount: Record<string, number> } | null>(null);
  const [showAlarmPopup, setShowAlarmPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'courts' | 'stats'>('courts');
  const [matchesPlayedSearch, setMatchesPlayedSearch] = useState('');
  const [roundsWaitingSearch, setRoundsWaitingSearch] = useState('');
  const [playerDetailsSearch, setPlayerDetailsSearch] = useState('');
  const [playerDetailsPopup, setPlayerDetailsPopup] = useState<{
    playerName: string;
    partners: string[];
    opponents: string[];
    courtsPlayed: number[];
  } | null>(null);
  const alarmIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const alarmAudioContextRef = useRef<AudioContext | null>(null);
  const { showNotification } = useNotification();

  useEffect(() => {
    // Load data
    loadData();
    loadClubLevels();
  }, [sessionId]);

  const loadClubLevels = async () => {
    try {
      const response = await clubSettingsAPI.getLevels();
      console.log('Loaded levels:', response.data);
      setAvailableLevels(response.data.levels || []);
    } catch (error) {
      console.error('Failed to load club levels:', error);
      setAvailableLevels([]);
    }
  };

  // Countdown timer effect
  useEffect(() => {
    if (!isTimerRunning || timeRemaining === null) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          setIsTimerRunning(false);
          // Play repeating notification sound
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          alarmAudioContextRef.current = audioContext;
          
          const playBeepSequence = () => {
            if (!alarmAudioContextRef.current || alarmAudioContextRef.current.state === 'closed') return;
            const beepTimes = [0, 300, 600];
            beepTimes.forEach(delay => {
              setTimeout(() => {
                if (!alarmAudioContextRef.current || alarmAudioContextRef.current.state === 'closed') return;
                const oscillator = alarmAudioContextRef.current.createOscillator();
                const gainNode = alarmAudioContextRef.current.createGain();
                oscillator.connect(gainNode);
                gainNode.connect(alarmAudioContextRef.current.destination);
                oscillator.frequency.value = 800;
                oscillator.type = 'sine';
                gainNode.gain.setValueAtTime(0.3, alarmAudioContextRef.current.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, alarmAudioContextRef.current.currentTime + 0.5);
                oscillator.start(alarmAudioContextRef.current.currentTime);
                oscillator.stop(alarmAudioContextRef.current.currentTime + 0.5);
              }, delay);
            });
          };
          // Play immediately and then repeat every 2 seconds
          playBeepSequence();
          alarmIntervalRef.current = setInterval(playBeepSequence, 2000);
          // Show popup
          setShowAlarmPopup(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning, timeRemaining]);

  const loadData = async () => {
    try {
      const [sessionRes, playersRes, roundsRes, attendanceRes] = await Promise.all([
        sessionsAPI.getById(sessionId),
        playersAPI.getAll({ is_active: true }),
        sessionsAPI.getRounds(sessionId),
        sessionsAPI.getAttendance(sessionId),
      ]);
      
      setSession(sessionRes.data);
      setAllPlayers(playersRes.data);
      setRounds(roundsRes.data);
      setAttendanceRecords(attendanceRes.data);
      
      // Set attendance from backend (now includes guest players with is_temp=true)
      const attendancePlayerIds = attendanceRes.data.map((a: any) => a.player_id);
      
      // Always set these states, even if empty (important for ended sessions)
      setPresentPlayers(attendancePlayerIds);
      setConfirmedSessionPlayers(attendancePlayerIds);
      
      // Only set temporaryPlayers if there's actual attendance
      // This prevents showing guest players when reopening an ended session
      if (attendancePlayerIds.length > 0) {
        const guestPlayers = playersRes.data.filter((p: Player) => p.is_temp);
        const activeGuestPlayers = guestPlayers.filter((p: Player) => 
          attendancePlayerIds.includes(p.id)
        );
        setTemporaryPlayers(activeGuestPlayers);
      } else {
        // No attendance means session was ended or never started
        setTemporaryPlayers([]);
      }
      
      if (roundsRes.data.length > 0) {
        const latestRound = roundsRes.data[roundsRes.data.length - 1];
        setCurrentRound(latestRound);
        
        // Set timer state based on round status
        if (latestRound.started_at && !latestRound.ended_at && sessionRes.data) {
          // Round is active, calculate remaining time
          const startTime = new Date(latestRound.started_at).getTime();
          const now = Date.now();
          const elapsedSeconds = Math.floor((now - startTime) / 1000);
          const totalSeconds = sessionRes.data.match_duration_minutes * 60;
          const remaining = Math.max(0, totalSeconds - elapsedSeconds);
          setTimeRemaining(remaining);
          setIsTimerRunning(true);
        } else {
          setTimeRemaining(null);
          setIsTimerRunning(false);
        }
      }
      
      // Load stats
      const statsRes = await sessionsAPI.getStats(sessionId);
      setStats(statsRes.data);
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetAttendance = async (playerIds?: number[], silent = false) => {
    try {
      // Use provided playerIds or current presentPlayers
      const idsToSet = playerIds || presentPlayers;
      
      console.log('Setting attendance with player IDs:', idsToSet);
      
      // Send all player IDs to the API (now includes guest players with is_temp=true)
      await sessionsAPI.setAttendance(sessionId, idsToSet);
      
      // Set confirmed session players
      setConfirmedSessionPlayers(idsToSet);
      setShowAttendance(false);
      if (!silent) {
        showNotification('success', `${idsToSet.length} player(s) added to session`);
      }
      loadData();
    } catch (error: any) {
      console.error('Failed to set attendance:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to add players to session. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleAutoAssign = async () => {
    try {
      const response = await sessionsAPI.autoAssign(sessionId, {
        desired_mm: 0,
        desired_mf: 0,
        desired_ff: 0,
        prioritize_waiting: 1.0,
        prioritize_equal_matches: 1.0,
        avoid_repeat_partners: 0.5,
        avoid_repeat_opponents: 0.3,
        balance_skill: 0.5,
      });
      // Immediately update currentRound state from response
      setCurrentRound(response.data);
      setShowCancelButton(false); // Don't show Cancel button for auto-assigned rounds
      // Reload data in background
      loadData();
    } catch (error: any) {
      console.error('Failed to auto-assign:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to auto-assign players. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleResetCourts = async () => {
    if (!currentRound) return;
    
    setShowResetCourtsConfirm(false);
    
    try {
      // Clear all court assignments sequentially to avoid race conditions
      for (const court of currentRound.court_assignments) {
        try {
          await roundsAPI.updateCourtAssignment(court.id, {
            team_a_player1_id: null,
            team_a_player2_id: null,
            team_b_player1_id: null,
            team_b_player2_id: null,
          });
        } catch (courtError) {
          console.error(`Failed to clear court ${court.court_number}:`, courtError);
          // Continue with other courts even if one fails
        }
      }
      
      showNotification('success', 'All courts cleared. Players moved to waiting list.');
      
      // Reload data
      await loadData();
    } catch (error) {
      console.error('Failed to reset courts:', error);
      showNotification('error', 'Failed to reset courts. Please try again.');
    }
  };

  const handleStartRound = async () => {
    if (!currentRound || !session) return;
    try {
      const updatedRound = await roundsAPI.start(currentRound.id);
      // Immediately update currentRound state with the response to hide Cancel button
      setCurrentRound(updatedRound.data);
      setShowCancelButton(false); // Hide cancel button when round starts
      // Start the timer
      setTimeRemaining(session.match_duration_minutes * 60);
      setIsTimerRunning(true);
      // Reload full data in background
      loadData();
    } catch (error) {
      console.error('Failed to start round:', error);
    }
  };

  const handleEndRound = () => {
    setShowEndRoundConfirm(true);
  };

  const confirmEndRound = async () => {
    if (!currentRound) return;
    try {
      await roundsAPI.end(currentRound.id);
      setShowEndRoundConfirm(false);
      // Stop and reset timer
      setIsTimerRunning(false);
      setTimeRemaining(null);
      loadData();
    } catch (error) {
      console.error('Failed to end round:', error);
      setShowEndRoundConfirm(false);
    }
  };

  const handleCancelRound = () => {
    setShowCancelRoundConfirm(true);
  };

  const confirmCancelRound = async () => {
    if (!currentRound) return;
    try {
      await roundsAPI.cancel(currentRound.id);
      setShowCancelRoundConfirm(false);
      setShowCancelButton(false); // Reset cancel button state
      // Stop and reset timer
      setIsTimerRunning(false);
      setTimeRemaining(null);
      await loadData();
      showNotification('success', 'Round cancelled successfully. You can now restart the assignment.');
    } catch (error: any) {
      console.error('Failed to cancel round:', error);
      showNotification('error', error.response?.data?.detail || 'Failed to cancel round');
    }
  };

  const handleEndSession = () => {
    setShowEndSessionConfirm(true);
  };

  const confirmEndSession = async () => {
    try {
      await sessionsAPI.endSession(sessionId);
      setShowEndSessionConfirm(false);
      // Clear temporary players from state
      setTemporaryPlayers([]);
      showNotification('success', 'Session ended successfully! All rounds and attendance have been cleared.');
      navigate('/sessions');
    } catch (error: any) {
      console.error('Failed to end session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to end session. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleAddTemporaryPlayer = async () => {
    if (!tempPlayerName.trim()) {
      showNotification('error', 'Please enter a player name');
      return;
    }

    if (!tempPlayerLevel.trim()) {
      showNotification('error', 'Please select a division');
      return;
    }

    try {
      // Create a guest player in the database with is_temp=true
      const playerData = {
        full_name: tempPlayerName.trim(),
        gender: tempPlayerGender,
        level: tempPlayerLevel.trim(),
        is_temp: true,
        is_active: true
      };

      const response = await playersAPI.create(playerData);
      const newGuestPlayer = response.data;

      // Add to allPlayers
      setAllPlayers([...allPlayers, newGuestPlayer]);
      
      // Add to present players (session attendance)
      const newPresentPlayers = [...presentPlayers, newGuestPlayer.id];
      setPresentPlayers(newPresentPlayers);
      
      // Add to confirmed session players (so they appear in the session panel)
      const newConfirmedPlayers = [...confirmedSessionPlayers, newGuestPlayer.id];
      setConfirmedSessionPlayers(newConfirmedPlayers);
      
      // Update attendance in backend
      await handleSetAttendance(newPresentPlayers);
      
      // Reset form and close modal
      setTempPlayerName('');
      setTempPlayerGender('male');
      setTempPlayerLevel('');
      setShowTempPlayerModal(false);
      
      // Close attendance modal and show courts tab
      setShowAttendance(false);
      setActiveTab('courts');
      
      showNotification('success', `Guest player "${newGuestPlayer.full_name}" added to session`);
    } catch (error: any) {
      console.error('Failed to create guest player:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create guest player. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const sourceData = active.data.current;
    
    if (sourceData && sourceData.playerId) {
      const player = getAllPlayersIncludingTemp().find(p => p.id === sourceData.playerId);
      if (player) {
        setDraggedPlayer({
          id: player.id,
          name: player.full_name,
          level: player.level
        });
      }
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    
    if (!over || !active) {
      setTargetPlayer(null);
      return;
    }
    
    const targetData = over.data.current;
    const sourceData = active.data.current;
    
    if (!targetData || !sourceData) {
      setTargetPlayer(null);
      return;
    }
    
    // Only show swap visual if hovering over a slot that has a player
    // and it's not the same slot being dragged
    if (targetData.currentPlayerId && 
        sourceData.playerId && 
        sourceData.playerId !== targetData.currentPlayerId) {
      const player = getAllPlayersIncludingTemp().find(p => p.id === targetData.currentPlayerId);
      if (player) {
        setTargetPlayer({
          id: player.id,
          name: player.full_name,
          level: player.level
        });
        return;
      }
    }
    
    setTargetPlayer(null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear dragged player overlay
    setDraggedPlayer(null);
    setTargetPlayer(null);
    
    if (!over || !currentRound) return;
    if (active.id === over.id) return; // Dropped on itself

    const sourceData = active.data.current;
    const targetData = over.data.current;

    if (!sourceData) return;

    const sourcePlayerId = sourceData.playerId;
    const sourceIsWaiting = sourceData.isWaiting || false;
    const sourceSlotId = sourceData.slotId as string;

    // Case 1: Dragging from waiting list to a court slot
    if (sourceIsWaiting && targetData) {
      const targetPlayerId = targetData.currentPlayerId;
      const targetSlotId = targetData.slotId as string;
      
      // Parse target slot ID
      const parseSlotId = (slotId: string) => {
        const parts = slotId.split('-');
        return {
          courtId: parseInt(parts[1]),
          team: parts[3] as 'a' | 'b',
          position: parseInt(parts[5]) as 1 | 2,
        };
      };
      
      const target = parseSlotId(targetSlotId);
      
      // Update court assignment: replace target slot with waiting player
      const updatedAssignments = currentRound.court_assignments.map(court => {
        if (court.id === target.courtId) {
          const updatedCourt = { ...court };
          const field = `team_${target.team}_player${target.position}_id` as keyof typeof updatedCourt;
          (updatedCourt as any)[field] = sourcePlayerId;
          return updatedCourt;
        }
        return court;
      });
      
      // Update local state
      const updatedRound = {
        ...currentRound,
        court_assignments: updatedAssignments,
      };
      setCurrentRound(updatedRound);
      setRounds(rounds.map(r => r.id === updatedRound.id ? updatedRound : r));
      
      try {
        const court = updatedAssignments.find(c => c.id === target.courtId);
        if (court) {
          await roundsAPI.updateCourtAssignment(court.id, {
            team_a_player1_id: court.team_a_player1_id || null,
            team_a_player2_id: court.team_a_player2_id || null,
            team_b_player1_id: court.team_b_player1_id || null,
            team_b_player2_id: court.team_b_player2_id || null,
          });
        }
        
        showNotification('success', 'Player moved to court');
        const statsRes = await sessionsAPI.getStats(sessionId);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error updating court assignment:', error);
        showNotification('error', 'Failed to move player');
        const roundsRes = await sessionsAPI.getRounds(sessionId);
        setRounds(roundsRes.data);
        setCurrentRound(roundsRes.data.find(r => r.id === currentRound.id) || null);
      }
      
      return;
    }
    
    // Case 2: Dragging from court to waiting list (drop on empty space or another waiting player)
    if (!sourceIsWaiting && !targetData) {
      // Dropped somewhere outside courts (likely waiting list area)
      // Remove player from court
      const parseSlotId = (slotId: string) => {
        const parts = slotId.split('-');
        return {
          courtId: parseInt(parts[1]),
          team: parts[3] as 'a' | 'b',
          position: parseInt(parts[5]) as 1 | 2,
        };
      };
      
      const source = parseSlotId(sourceSlotId);
      
      const updatedAssignments = currentRound.court_assignments.map(court => {
        if (court.id === source.courtId) {
          const updatedCourt = { ...court };
          const field = `team_${source.team}_player${source.position}_id` as keyof typeof updatedCourt;
          (updatedCourt as any)[field] = null;
          return updatedCourt;
        }
        return court;
      });
      
      const updatedRound = {
        ...currentRound,
        court_assignments: updatedAssignments,
      };
      setCurrentRound(updatedRound);
      setRounds(rounds.map(r => r.id === updatedRound.id ? updatedRound : r));
      
      try {
        const court = updatedAssignments.find(c => c.id === source.courtId);
        if (court) {
          await roundsAPI.updateCourtAssignment(court.id, {
            team_a_player1_id: court.team_a_player1_id || null,
            team_a_player2_id: court.team_a_player2_id || null,
            team_b_player1_id: court.team_b_player1_id || null,
            team_b_player2_id: court.team_b_player2_id || null,
          });
        }
        
        showNotification('success', 'Player moved to waiting list');
        const statsRes = await sessionsAPI.getStats(sessionId);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error updating court assignment:', error);
        showNotification('error', 'Failed to move player');
        const roundsRes = await sessionsAPI.getRounds(sessionId);
        setRounds(roundsRes.data);
        setCurrentRound(roundsRes.data.find(r => r.id === currentRound.id) || null);
      }
      
      return;
    }

    // Case 3: Swapping between two court slots (original behavior)
    if (!sourceIsWaiting && targetData) {
      const targetPlayerId = targetData.currentPlayerId;
      const targetSlotId = targetData.slotId as string;

      // Parse slot IDs to get court and position
      const parseSlotId = (slotId: string) => {
        const parts = slotId.split('-');
        return {
          courtId: parseInt(parts[1]),
          team: parts[3] as 'a' | 'b',
          position: parseInt(parts[5]) as 1 | 2,
        };
      };

      const source = parseSlotId(sourceSlotId);
      const target = parseSlotId(targetSlotId);

      // Create updated court assignments
      const updatedAssignments = currentRound.court_assignments.map(court => {
        const updatedCourt = { ...court };
        
        // Update source court
        if (court.id === source.courtId) {
          const field = `team_${source.team}_player${source.position}_id` as keyof typeof updatedCourt;
          (updatedCourt as any)[field] = targetPlayerId || null;
        }
        
        // Update target court
        if (court.id === target.courtId) {
          const field = `team_${target.team}_player${target.position}_id` as keyof typeof updatedCourt;
          (updatedCourt as any)[field] = sourcePlayerId || null;
        }
        
        return updatedCourt;
      });

      // Update local state optimistically
      const updatedRound = {
        ...currentRound,
        court_assignments: updatedAssignments,
      };
      setCurrentRound(updatedRound);
      setRounds(rounds.map(r => r.id === updatedRound.id ? updatedRound : r));

      try {
        // Update each affected court on the backend
        const courtsToUpdate = new Set([source.courtId, target.courtId]);
        for (const courtId of courtsToUpdate) {
          const court = updatedAssignments.find(c => c.id === courtId);
          if (court) {
            await roundsAPI.updateCourtAssignment(court.id, {
              team_a_player1_id: court.team_a_player1_id || null,
              team_a_player2_id: court.team_a_player2_id || null,
              team_b_player1_id: court.team_b_player1_id || null,
              team_b_player2_id: court.team_b_player2_id || null,
            });
          }
        }
        
        showNotification('success', 'Players swapped successfully');
        const statsRes = await sessionsAPI.getStats(sessionId);
        setStats(statsRes.data);
      } catch (error) {
        console.error('Error updating court assignments:', error);
        showNotification('error', 'Failed to swap players');
        const roundsRes = await sessionsAPI.getRounds(sessionId);
        setRounds(roundsRes.data);
        setCurrentRound(roundsRes.data.find(r => r.id === currentRound.id) || null);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper to get all players (regular + temporary)
  const getAllPlayersIncludingTemp = () => {
    return allPlayers; // Guest players with is_temp=true are already included in allPlayers
  };

  const getWaitingPlayers = () => {
    if (!currentRound || !stats) return [];
    
    const playingPlayerIds = new Set<number>();
    currentRound.court_assignments.forEach(court => {
      if (court.team_a_player1_id) playingPlayerIds.add(court.team_a_player1_id);
      if (court.team_a_player2_id) playingPlayerIds.add(court.team_a_player2_id);
      if (court.team_b_player1_id) playingPlayerIds.add(court.team_b_player1_id);
      if (court.team_b_player2_id) playingPlayerIds.add(court.team_b_player2_id);
    });
    
    const allPlayersWithTemp = getAllPlayersIncludingTemp();
    return allPlayersWithTemp.filter(p => 
      confirmedSessionPlayers.includes(p.id) && !playingPlayerIds.has(p.id)
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  if (!session) {
    return <div className="text-center py-8">Session not found</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{session.name}</h1>
        <p className="text-gray-600">
          {new Date(session.date).toLocaleDateString()} • {session.number_of_courts} courts
        </p>
      </div>

      {/* Actions */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setShowAttendance(true)}
          className="btn btn-primary"
        >
          Set Attendance
        </button>
        <button
          onClick={handleAutoAssign}
          className="btn btn-primary"
        >
          Auto-Assign Round
        </button>
        {currentRound && !currentRound.started_at && (
          <button
            onClick={() => setShowResetCourtsConfirm(true)}
            className="btn btn-secondary"
          >
            Reset Courts
          </button>
        )}
        <button
          onClick={() => {
            if (!session) return;
            const courts = [];
            for (let i = 0; i < session.number_of_courts; i++) {
              courts.push({
                court_number: i,
                team_a_player1_id: null,
                team_a_player2_id: null,
                team_b_player1_id: null,
                team_b_player2_id: null,
              });
            }
            setManualAssignments(courts);
            setShowManualAssignment(true);
          }}
          className="btn btn-secondary"
        >
          Manual Assignment
        </button>
        {currentRound && !currentRound.started_at && (
          <>
            <button onClick={handleStartRound} className="btn btn-secondary">
              Start Round
            </button>
            {showCancelButton && (
              <button onClick={handleCancelRound} className="btn btn-danger">
                Cancel Round
              </button>
            )}
          </>
        )}
        {currentRound && currentRound.started_at && !currentRound.ended_at && (
          <button onClick={handleEndRound} className="btn btn-secondary">
            End Round
          </button>
        )}
        <button
          onClick={handleEndSession}
          className="btn btn-danger ml-auto"
        >
          End Session
        </button>
      </div>

      {/* Round Timer */}
      {stats && (
        <div className="card mb-6">
          <div className="flex items-center gap-6">
            {/* Round Number - Left */}
            {currentRound && (
              <div className="flex-shrink-0 text-center">
                <p className="text-sm text-gray-600 mb-1">Current Round</p>
                <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center">
                  <span className="text-2xl font-bold text-indigo-800">
                    {rounds.findIndex(r => r.id === currentRound.id) + 1}
                  </span>
                </div>
              </div>
            )}

            {/* Timer - Center */}
            <div className="flex-1 text-center">
              {timeRemaining !== null ? (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Time Remaining</p>
                  <div className="text-5xl font-bold text-gray-800 font-mono">
                    {formatTime(timeRemaining)}
                  </div>
                  {timeRemaining === 0 && (
                    <p className="text-sm text-red-600 mt-1 font-semibold">Time's up!</p>
                  )}
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Match Duration</p>
                  <div className="text-3xl font-bold text-gray-400">
                    {session?.match_duration_minutes || 0} min
                  </div>
                </div>
              )}
            </div>

            {/* Next Round Number - Right */}
            <div className="flex-shrink-0 text-center">
              <p className="text-sm text-gray-600 mb-1">Next Round</p>
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-2xl font-bold text-green-800">
                  {currentRound ? rounds.findIndex(r => r.id === currentRound.id) + 2 : rounds.length + 1}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('courts')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'courts'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Courts & Assignment
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'stats'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Session Statistics
          </button>
        </nav>
      </div>

      {/* Courts and Waiting List */}
      {activeTab === 'courts' && (
      <DndContext 
        collisionDetection={pointerWithin} 
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Players in Session Panel */}
          <div>
            <div className="card h-[600px] flex flex-col">
              <h2 className="text-lg font-bold mb-3">Players in Session</h2>
              
              {confirmedSessionPlayers.length === 0 ? (
                <p className="text-gray-500 text-sm">No players added yet</p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={panelSearchQuery}
                    onChange={(e) => setPanelSearchQuery(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded mb-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="text-sm text-gray-600 mb-2">{confirmedSessionPlayers.length} player{confirmedSessionPlayers.length !== 1 ? 's' : ''}</p>
                  <div className="space-y-1 flex-1 overflow-y-auto">
                    {getAllPlayersIncludingTemp()
                      .filter(player => 
                        confirmedSessionPlayers.includes(player.id) &&
                        player.full_name.toLowerCase().includes(panelSearchQuery.toLowerCase())
                      )
                      .map((player) => {
                        const isTempPlayer = player.is_temp; // Guest players have is_temp=true
                        return (
                        <div
                          key={player.id}
                          className={`px-2 py-1 ${isTempPlayer ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'} text-sm rounded hover:${isTempPlayer ? 'bg-blue-100' : 'bg-green-100'} flex items-center justify-between gap-2`}
                        >
                          <span className="flex-1 flex items-center gap-2">
                            {player.full_name}
                          </span>
                          <div className="flex items-center gap-2">
                            {player.level && (
                              <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-xs rounded font-medium inline-flex items-center gap-1">
                                🏆 {player.level}
                              </span>
                            )}
                            <button
                              onClick={async () => {
                                const newPresentPlayers = presentPlayers.filter(id => id !== player.id);
                                const newConfirmedPlayers = confirmedSessionPlayers.filter(id => id !== player.id);
                                setPresentPlayers(newPresentPlayers);
                                setConfirmedSessionPlayers(newConfirmedPlayers);
                                // Update backend attendance (silent = true to suppress notification)
                                await handleSetAttendance(newConfirmedPlayers, true);
                              }}
                              className="text-red-600 hover:text-red-800 hover:bg-red-100 rounded px-1.5 py-0.5"
                              title="Remove player"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                        );
                      })}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Courts</h2>
              {currentRound && (
                <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-sm font-semibold rounded-full">
                  Round {rounds.findIndex(r => r.id === currentRound.id) + 1}
                </span>
              )}
            </div>
            <div className="grid gap-4">
              {currentRound?.court_assignments.map((court) => (
                <CourtCard
                  key={court.id}
                  court={court}
                  allPlayers={allPlayers}
                  isDragDisabled={!!(currentRound?.started_at)}
                />
              ))}
              {!currentRound && (
                <div className="card text-center text-gray-500">
                  No round assigned yet. Click "Auto-Assign Round" to begin.
                </div>
              )}
            </div>
          </div>
          
          <div>
            <WaitingList 
              players={getWaitingPlayers()} 
              stats={stats}
              rounds={rounds}
              attendanceRecords={attendanceRecords}
              isDragDisabled={!currentRound || currentRound.started_at !== null}
            />
          </div>
        </div>
        
        {/* Drag Overlay - Shows what's being dragged */}
        <DragOverlay>
          {draggedPlayer ? (
            <div className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[280px]">
              {/* Show swap animation when hovering over another player */}
              {targetPlayer ? (
                <div className="p-3">
                  {/* Dragged Player */}
                  <div className="flex items-center gap-3 pb-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {draggedPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{draggedPlayer.name}</div>
                      {draggedPlayer.level && (
                        <div className="text-xs text-gray-500">Division {draggedPlayer.level}</div>
                      )}
                    </div>
                  </div>
                  
                  {/* Swap Icon */}
                  <div className="flex justify-center py-1">
                    <div className="bg-green-100 rounded-full p-1.5">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Target Player */}
                  <div className="flex items-center gap-3 pt-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {targetPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{targetPlayer.name}</div>
                      {targetPlayer.level && (
                        <div className="text-xs text-gray-500">Division {targetPlayer.level}</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Single player being dragged */
                <div className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0">
                      {draggedPlayer.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{draggedPlayer.name}</div>
                      {draggedPlayer.level && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-xs text-gray-500">Division</span>
                          <span className="text-xs font-medium text-blue-600">{draggedPlayer.level}</span>
                        </div>
                      )}
                    </div>
                    <div className="text-gray-400">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
      )}

      {/* Session Statistics */}
      {activeTab === 'stats' && (
        stats ? (
        <div className="space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Rounds</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">{stats.total_rounds}</div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Active Players</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {stats.player_stats.length}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Total Matches</div>
              <div className="mt-2 text-3xl font-semibold text-gray-900">
                {Math.round(stats.player_stats.reduce((sum, p) => sum + p.matches_played, 0) / 2)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Fairness Score</div>
              <div className="mt-2 text-3xl font-semibold text-green-600">{stats.fairness_score.toFixed(1)}%</div>
            </div>
          </div>

          {/* Match Type Distribution */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Match Type Distribution</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(() => {
                const totalMatches = stats.player_stats.reduce((sum, p) => {
                  return sum + (p.match_type_counts?.MM || 0) + (p.match_type_counts?.MF || 0) + (p.match_type_counts?.FF || 0);
                }, 0) / 2;
                
                const mmCount = stats.player_stats.reduce((sum, p) => sum + (p.match_type_counts?.MM || 0), 0) / 2;
                const mfCount = stats.player_stats.reduce((sum, p) => sum + (p.match_type_counts?.MF || 0), 0) / 2;
                const ffCount = stats.player_stats.reduce((sum, p) => sum + (p.match_type_counts?.FF || 0), 0) / 2;

                return (
                  <>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">{mmCount}</div>
                      <div className="text-sm text-gray-600 mt-1">Men's Doubles</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {totalMatches > 0 ? ((mmCount / totalMatches) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">{mfCount}</div>
                      <div className="text-sm text-gray-600 mt-1">Mixed Doubles</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {totalMatches > 0 ? ((mfCount / totalMatches) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                    <div className="text-center p-4 bg-pink-50 rounded-lg">
                      <div className="text-2xl font-bold text-pink-600">{ffCount}</div>
                      <div className="text-sm text-gray-600 mt-1">Women's Doubles</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {totalMatches > 0 ? ((ffCount / totalMatches) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Player Participation Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Matches Played Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Matches Played per Player</h3>
              <input
                type="text"
                placeholder="Search players..."
                value={matchesPlayedSearch}
                onChange={(e) => setMatchesPlayedSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {stats.player_stats
                  .filter(p => p.player_name.toLowerCase().includes(matchesPlayedSearch.toLowerCase()))
                  .sort((a, b) => b.matches_played - a.matches_played)
                  .slice(0, 10)
                  .map((playerStat) => {
                    const maxMatches = Math.max(...stats.player_stats.map(p => p.matches_played));
                    const percentage = maxMatches > 0 ? (playerStat.matches_played / maxMatches) * 100 : 0;
                    
                    return (
                      <div key={playerStat.player_id} className="flex items-center">
                        <div className="w-32 text-sm font-medium truncate">{playerStat.player_name}</div>
                        <div className="flex-1 mx-3">
                          <div className="bg-gray-200 rounded-full h-6">
                            <div
                              className="bg-green-500 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white">{playerStat.matches_played}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Rounds Waiting Chart */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-lg font-semibold mb-4">Rounds Waiting per Player</h3>
              <input
                type="text"
                placeholder="Search players..."
                value={roundsWaitingSearch}
                onChange={(e) => setRoundsWaitingSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                {stats.player_stats
                  .filter(p => p.player_name.toLowerCase().includes(roundsWaitingSearch.toLowerCase()))
                  .sort((a, b) => b.rounds_sitting_out - a.rounds_sitting_out)
                  .slice(0, 10)
                  .map((playerStat) => {
                    const maxWaiting = Math.max(...stats.player_stats.map(p => p.rounds_sitting_out));
                    const percentage = maxWaiting > 0 ? (playerStat.rounds_sitting_out / maxWaiting) * 100 : 0;
                    
                    return (
                      <div key={playerStat.player_id} className="flex items-center">
                        <div className="w-32 text-sm font-medium truncate">{playerStat.player_name}</div>
                        <div className="flex-1 mx-3">
                          <div className="bg-gray-200 rounded-full h-6">
                            <div
                              className="bg-orange-500 h-6 rounded-full flex items-center justify-end pr-2"
                              style={{ width: `${percentage}%` }}
                            >
                              <span className="text-xs font-medium text-white">{playerStat.rounds_sitting_out}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>

          {/* Player Details Table */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Player Details ({stats.player_stats.length} players)</h3>
            <input
              type="text"
              placeholder="Search players..."
              value={playerDetailsSearch}
              onChange={(e) => setPlayerDetailsSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Player</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Matches</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Waiting</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">MM</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">MF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">FF</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Courts</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Partners</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider bg-gray-50">Opponents</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.player_stats
                  .filter(p => p.player_name.toLowerCase().includes(playerDetailsSearch.toLowerCase()))
                  .sort((a, b) => b.matches_played - a.matches_played)
                  .map((playerStat) => (
                    <tr key={playerStat.player_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{playerStat.player_name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{playerStat.matches_played}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{playerStat.rounds_sitting_out}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{playerStat.match_type_counts?.MM || 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{playerStat.match_type_counts?.MF || 0}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{playerStat.match_type_counts?.FF || 0}</td>
                      <td 
                        className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => setPlayerDetailsPopup({
                          playerName: playerStat.player_name,
                          partners: playerStat.partners || [],
                          opponents: playerStat.opponents || [],
                          courtsPlayed: playerStat.courts_played || []
                        })}
                      >
                        {playerStat.courts_played?.length || 0}
                      </td>
                      <td 
                        className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => setPlayerDetailsPopup({
                          playerName: playerStat.player_name,
                          partners: playerStat.partners || [],
                          opponents: playerStat.opponents || [],
                          courtsPlayed: playerStat.courts_played || []
                        })}
                      >
                        {playerStat.partners?.length || 0}
                      </td>
                      <td 
                        className="px-4 py-3 whitespace-nowrap text-sm text-blue-600 hover:text-blue-800 cursor-pointer underline"
                        onClick={() => setPlayerDetailsPopup({
                          playerName: playerStat.player_name,
                          partners: playerStat.partners || [],
                          opponents: playerStat.opponents || [],
                          courtsPlayed: playerStat.courts_played || []
                        })}
                      >
                        {playerStat.opponents?.length || 0}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
            </div>
          </div>

          {/* Average Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Average Matches Played</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {stats.avg_matches_per_player.toFixed(1)}
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Average Waiting Time</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {stats.avg_waiting_time.toFixed(1)} rounds
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="text-sm font-medium text-gray-500">Match Variance</div>
              <div className="mt-2 text-2xl font-semibold text-gray-900">
                {(() => {
                  const matches = stats.player_stats.map(p => p.matches_played);
                  const avg = matches.reduce((a, b) => a + b, 0) / matches.length;
                  const variance = matches.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / matches.length;
                  return Math.sqrt(variance).toFixed(2);
                })()}
              </div>
            </div>
          </div>
        </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500">No statistics available yet. Start some rounds to see statistics.</p>
          </div>
        )
      )}

      {/* Attendance Modal */}
      {showAttendance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Set Attendance</h2>
            
            {/* Search Bar and Add Temp Player Button */}
            <div className="mb-4 flex gap-2">
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={() => setShowTempPlayerModal(true)}
                className="btn btn-secondary whitespace-nowrap"
              >
                + Temp Player
              </button>
            </div>

            {/* Buttons */}
            <div className="flex space-x-2 mb-4">
              <button onClick={() => handleSetAttendance()} className="btn btn-primary flex-1">
                Add to Session
              </button>
              <button
                onClick={() => {
                  setShowAttendance(false);
                  setSearchQuery('');
                  setPresentPlayers(confirmedSessionPlayers);
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
            
            {/* Player Table */}
            <div className="overflow-y-auto flex-1 border border-gray-200 rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          const allPlayerIds = [...temporaryPlayers, ...allPlayers]
                            .filter(p => !confirmedSessionPlayers.includes(p.id) && p.full_name.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(p => p.id);
                          if (e.target.checked) {
                            setPresentPlayers([...new Set([...presentPlayers, ...allPlayerIds])]);
                          } else {
                            setPresentPlayers(presentPlayers.filter(id => !allPlayerIds.includes(id)));
                          }
                        }}
                        className="w-4 h-4"
                      />
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (attendanceSortBy === 'name') {
                          setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setAttendanceSortBy('name');
                          setAttendanceSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Name
                        <span className={attendanceSortBy === 'name' ? 'text-gray-700' : 'text-gray-300'}>
                          {attendanceSortBy === 'name' && attendanceSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (attendanceSortBy === 'gender') {
                          setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setAttendanceSortBy('gender');
                          setAttendanceSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Gender
                        <span className={attendanceSortBy === 'gender' ? 'text-gray-700' : 'text-gray-300'}>
                          {attendanceSortBy === 'gender' && attendanceSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      </div>
                    </th>
                    <th 
                      className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => {
                        if (attendanceSortBy === 'division') {
                          setAttendanceSortOrder(attendanceSortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setAttendanceSortBy('division');
                          setAttendanceSortOrder('asc');
                        }
                      }}
                    >
                      <div className="flex items-center gap-1">
                        Division
                        <span className={attendanceSortBy === 'division' ? 'text-gray-700' : 'text-gray-300'}>
                          {attendanceSortBy === 'division' && attendanceSortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[...temporaryPlayers.filter(p => p.is_temp), ...allPlayers.filter(p => !p.is_temp)]
                    .filter(player => 
                      !confirmedSessionPlayers.includes(player.id) &&
                      player.full_name.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .sort((a, b) => {
                      let comparison = 0;
                      if (attendanceSortBy === 'name') {
                        comparison = a.full_name.localeCompare(b.full_name);
                      } else if (attendanceSortBy === 'gender') {
                        comparison = (a.gender || '').localeCompare(b.gender || '');
                      } else if (attendanceSortBy === 'division') {
                        const aLevel = parseFloat(a.level || '0');
                        const bLevel = parseFloat(b.level || '0');
                        comparison = aLevel - bLevel;
                      }
                      return attendanceSortOrder === 'asc' ? comparison : -comparison;
                    })
                    .map((player) => (
                    <tr key={player.id} className={`hover:bg-gray-50 ${player.is_temp ? 'bg-blue-25' : ''}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={presentPlayers.includes(player.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPresentPlayers([...presentPlayers, player.id]);
                            } else {
                              setPresentPlayers(presentPlayers.filter(id => id !== player.id));
                            }
                          }}
                          className="w-4 h-4"
                        />
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {player.full_name}
                          {player.is_temp && (
                            <span className="px-2 py-0.5 bg-blue-500 text-white text-xs rounded font-medium">
                              GUEST
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                        {player.gender || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {player.level || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Add Temporary Player Modal */}
      {showTempPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold mb-4">Add Temporary Player</h2>
            
            <div className="space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Player Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter player name"
                  value={tempPlayerName}
                  onChange={(e) => setTempPlayerName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>

              {/* Gender Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender *
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="male"
                      checked={tempPlayerGender === 'male'}
                      onChange={(e) => setTempPlayerGender(e.target.value as 'male')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Male</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="female"
                      checked={tempPlayerGender === 'female'}
                      onChange={(e) => setTempPlayerGender(e.target.value as 'female')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm">Female</span>
                  </label>
                </div>
              </div>

              {/* Division Field */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Division/Level *
                </label>
                {availableLevels.length > 0 ? (
                  <select
                    value={tempPlayerLevel}
                    onChange={(e) => setTempPlayerLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select division *</option>
                    {availableLevels.map((level) => (
                      <option key={level} value={level}>
                        {level}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    placeholder="Enter division *"
                    value={tempPlayerLevel}
                    onChange={(e) => setTempPlayerLevel(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleAddTemporaryPlayer}
                className="btn btn-primary flex-1"
              >
                Add to Session
              </button>
              <button
                onClick={() => {
                  setShowTempPlayerModal(false);
                  setTempPlayerName('');
                  setTempPlayerGender('male');
                  setTempPlayerLevel('');
                }}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEndSessionConfirm}
        title="End Session"
        message="Are you sure you want to end this session? This will clear all rounds, court assignments, and attendance. The session will be reset to a clean state. This action cannot be undone."
        confirmLabel="End Session"
        cancelLabel="Cancel"
        onConfirm={confirmEndSession}
        onCancel={() => setShowEndSessionConfirm(false)}
        danger
      />

      {/* Reset Courts Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showResetCourtsConfirm}
        title="Reset Courts"
        message="Are you sure you want to clear all court assignments? All players will be moved to the waiting list. This action cannot be undone."
        confirmLabel="Reset Courts"
        cancelLabel="Cancel"
        onConfirm={handleResetCourts}
        onCancel={() => setShowResetCourtsConfirm(false)}
      />

      {/* Cancel Round Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showCancelRoundConfirm}
        title="Cancel Round"
        message="Are you sure you want to cancel this round? This will delete all court assignments for this round and allow you to restart the assignment. This action cannot be undone."
        confirmLabel="Cancel Round"
        cancelLabel="Keep Round"
        onConfirm={confirmCancelRound}
        onCancel={() => setShowCancelRoundConfirm(false)}
        danger
      />

      {/* End Round Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showEndRoundConfirm}
        title="End Round"
        message="Are you sure you want to end this round? The timer will stop and the round will be marked as complete."
        confirmLabel="End Round"
        cancelLabel="Continue Playing"
        onConfirm={confirmEndRound}
        onCancel={() => setShowEndRoundConfirm(false)}
      />

      {/* Manual Assignment Modal */}
      {showManualAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50">
          <div className="bg-white w-full h-full max-w-none max-h-none rounded-none flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">Manual Court Assignment</h2>
              </div>
              {/* Actions at top */}
              <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowManualAssignment(false);
                      setManualAssignments([]);
                      setManualSearchQuery('');
                      setAutoAssignRemaining(false);
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const preferences = {
                          desired_mm: 0,
                          desired_mf: 0,
                          desired_ff: 0,
                          prioritize_waiting: 1.0,
                          prioritize_equal_matches: 1.0,
                          avoid_repeat_partners: 0.5,
                          avoid_repeat_opponents: 0.3,
                          balance_skill: 0.5,
                        };
                        
                        if (autoAssignRemaining) {
                          // Filter out courts with at least one player assigned
                          const assignedCourts = manualAssignments
                            .filter(court => 
                              court.team_a_player1_id || court.team_a_player2_id || 
                              court.team_b_player1_id || court.team_b_player2_id
                            );
                          
                          // Call auto-assign with manual assignments as locked courts
                          const response = await sessionsAPI.autoAssign(sessionId, {
                            ...preferences,
                            court_assignments: assignedCourts,
                          });
                        } else {
                          // Pure manual assignment - send all courts including empty ones
                          const response = await sessionsAPI.autoAssign(sessionId, {
                            ...preferences,
                            court_assignments: manualAssignments,
                          });
                        }
                        
                        setShowManualAssignment(false);
                        setManualAssignments([]);
                        setManualSearchQuery('');
                        setAutoAssignRemaining(false);
                        await loadData();
                        showNotification('Manual assignment completed successfully', 'success');
                      } catch (error) {
                        console.error('Failed to submit manual assignment:', error);
                        showNotification('Failed to submit manual assignment', 'error');
                      }
                    }}
                    className="btn btn-primary"
                  >
                    Finish Assignment
                  </button>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-6">
                {/* Player Panel - Left */}
                <div className="col-span-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">Available Players</h3>
                    <input
                      type="text"
                      placeholder="Search..."
                      value={manualSearchQuery}
                      onChange={(e) => setManualSearchQuery(e.target.value)}
                      className="w-32 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  {/* Sorting Controls */}
                  <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="text-xs font-semibold text-gray-600 mb-1.5">Sort by:</div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      <button
                        onClick={() => {
                          if (sortBy === 'waiting') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('waiting'); setSortOrder('desc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'waiting' ? 'bg-orange-100 text-orange-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        W {sortBy === 'waiting' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'played') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('played'); setSortOrder('desc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'played' ? 'bg-green-100 text-green-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        P {sortBy === 'played' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'name') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('name'); setSortOrder('asc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'name' ? 'bg-blue-100 text-blue-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        Name {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'gender') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('gender'); setSortOrder('asc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'gender' ? 'bg-purple-100 text-purple-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        Gender {sortBy === 'gender' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'division') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('division'); setSortOrder('asc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'division' ? 'bg-indigo-100 text-indigo-800 font-semibold' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        Div {sortBy === 'division' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'mm') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('mm'); setSortOrder('desc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'mm' ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        MM {sortBy === 'mm' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'mf') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('mf'); setSortOrder('desc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'mf' ? 'bg-purple-50 text-purple-700 font-semibold border border-purple-200' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        MF {sortBy === 'mf' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                      <button
                        onClick={() => {
                          if (sortBy === 'ff') setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                          else { setSortBy('ff'); setSortOrder('desc'); }
                        }}
                        className={`px-2 py-1 text-xs rounded ${sortBy === 'ff' ? 'bg-pink-50 text-pink-700 font-semibold border border-pink-200' : 'bg-white text-gray-700 hover:bg-gray-100'}`}
                      >
                        FF {sortBy === 'ff' && (sortOrder === 'desc' ? '↓' : '↑')}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 max-h-[600px] overflow-y-auto">
                    {stats?.player_stats
                      .filter(ps => {
                        const player = getAllPlayersIncludingTemp().find(p => p.id === ps.player_id);
                        return confirmedSessionPlayers.includes(ps.player_id) &&
                          (!manualSearchQuery || player?.full_name.toLowerCase().includes(manualSearchQuery.toLowerCase()));
                      })
                      .sort((a, b) => {
                        const playerA = getAllPlayersIncludingTemp().find(p => p.id === a.player_id);
                        const playerB = getAllPlayersIncludingTemp().find(p => p.id === b.player_id);
                        if (!playerA || !playerB) return 0;
                        
                        let compareValue = 0;
                        switch (sortBy) {
                          case 'waiting':
                            compareValue = a.rounds_sitting_out - b.rounds_sitting_out;
                            break;
                          case 'played':
                            compareValue = a.matches_played - b.matches_played;
                            break;
                          case 'name':
                            compareValue = playerA.full_name.localeCompare(playerB.full_name);
                            break;
                          case 'gender':
                            compareValue = playerA.gender.localeCompare(playerB.gender);
                            break;
                          case 'division':
                            compareValue = (playerA.level || '').localeCompare(playerB.level || '');
                            break;
                          case 'mm':
                            compareValue = (a.match_type_counts?.MM || 0) - (b.match_type_counts?.MM || 0);
                            break;
                          case 'mf':
                            compareValue = (a.match_type_counts?.MF || 0) - (b.match_type_counts?.MF || 0);
                            break;
                          case 'ff':
                            compareValue = (a.match_type_counts?.FF || 0) - (b.match_type_counts?.FF || 0);
                            break;
                        }
                        return sortOrder === 'asc' ? compareValue : -compareValue;
                      })
                      .map((playerStat) => {
                        const player = getAllPlayersIncludingTemp().find(p => p.id === playerStat.player_id);
                        if (!player) return null;
                        
                        // Check if player is already assigned
                        const isAssigned = manualAssignments.some(court => 
                          court.team_a_player1_id === player.id ||
                          court.team_a_player2_id === player.id ||
                          court.team_b_player1_id === player.id ||
                          court.team_b_player2_id === player.id
                        );
                        
                        return (
                          <div
                            key={player.id}
                            draggable={!isAssigned}
                            onDragStart={(e) => {
                              e.dataTransfer.setData('playerId', player.id.toString());
                            }}
                            className={`border rounded px-2 py-1 ${isAssigned ? 'bg-gray-100 opacity-50' : 'bg-white cursor-move hover:bg-blue-50'}`}
                          >
                            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center text-xs">
                              <span className="font-medium">{player.full_name}</span>
                              <span className={`px-1 py-0.5 rounded text-center whitespace-nowrap min-w-[1.5rem] ${
                                player.gender === 'male' ? 'bg-blue-100 text-blue-800' :
                                player.gender === 'female' ? 'bg-pink-100 text-pink-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {player.gender === 'male' ? 'M' : player.gender === 'female' ? 'F' : 'O'}
                              </span>
                              {player.level ? (
                                <span className="px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-center whitespace-nowrap">
                                  🏆{player.level}
                                </span>
                              ) : (
                                <span className="px-1 py-0.5 text-transparent">-</span>
                              )}
                              <span 
                                className="px-1 py-0.5 bg-green-100 text-green-800 rounded text-center whitespace-nowrap min-w-[2.5rem] cursor-pointer hover:bg-green-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMatchTypePopup({
                                    playerId: player.id,
                                    playerName: player.full_name,
                                    counts: playerStat.match_type_counts,
                                    opponentsCount: playerStat.opponents_count || {}
                                  });
                                }}
                              >
                                P:{playerStat.matches_played}
                              </span>
                              <span className="px-1 py-0.5 bg-orange-100 text-orange-800 rounded text-center whitespace-nowrap min-w-[2.5rem]">
                                W:{playerStat.rounds_sitting_out}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Courts - Right */}
                <div className="col-span-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold">Court Assignments</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-700">Auto assign remaining courts</span>
                      <button
                        onClick={() => setAutoAssignRemaining(!autoAssignRemaining)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                          autoAssignRemaining ? 'bg-blue-600' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            autoAssignRemaining ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto">
                    {manualAssignments.map((court, courtIdx) => (
                      <div key={courtIdx} className="border-2 border-gray-300 rounded p-4">
                        <h4 className="font-bold mb-3">Court {courtIdx + 1}</h4>
                        <div className="grid grid-cols-2 gap-4">
                          {/* Team A */}
                          <div className="border-2 border-blue-200 rounded p-3">
                            <p className="text-sm font-medium text-blue-800 mb-2">Team A</p>
                            <div className="space-y-2">
                              {['team_a_player1_id', 'team_a_player2_id'].map((slot, slotIdx) => {
                                const playerId = court[slot];
                                const player = playerId ? getAllPlayersIncludingTemp().find(p => p.id === playerId) : null;
                                return (
                                  <div
                                    key={slot}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const draggedPlayerId = parseInt(e.dataTransfer.getData('playerId'));
                                      const newAssignments = [...manualAssignments];
                                      newAssignments[courtIdx][slot] = draggedPlayerId;
                                      setManualAssignments(newAssignments);
                                    }}
                                    className="bg-blue-50 rounded p-2 min-h-[40px] flex items-center justify-between border-2 border-dashed border-blue-300"
                                  >
                                    {player ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{player.full_name}</span>
                                          {player.level && (
                                            <span className="px-1.5 py-0.5 bg-blue-200 text-blue-900 text-xs rounded font-medium">
                                              🏆 {player.level}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newAssignments = [...manualAssignments];
                                            newAssignments[courtIdx][slot] = null;
                                            setManualAssignments(newAssignments);
                                          }}
                                          className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-gray-400 text-sm">Drop player here</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          {/* Team B */}
                          <div className="border-2 border-red-200 rounded p-3">
                            <p className="text-sm font-medium text-red-800 mb-2">Team B</p>
                            <div className="space-y-2">
                              {['team_b_player1_id', 'team_b_player2_id'].map((slot, slotIdx) => {
                                const playerId = court[slot];
                                const player = playerId ? getAllPlayersIncludingTemp().find(p => p.id === playerId) : null;
                                return (
                                  <div
                                    key={slot}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={(e) => {
                                      e.preventDefault();
                                      const draggedPlayerId = parseInt(e.dataTransfer.getData('playerId'));
                                      const newAssignments = [...manualAssignments];
                                      newAssignments[courtIdx][slot] = draggedPlayerId;
                                      setManualAssignments(newAssignments);
                                    }}
                                    className="bg-red-50 rounded p-2 min-h-[40px] flex items-center justify-between border-2 border-dashed border-red-300"
                                  >
                                    {player ? (
                                      <>
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm">{player.full_name}</span>
                                          {player.level && (
                                            <span className="px-1.5 py-0.5 bg-red-200 text-red-900 text-xs rounded font-medium">
                                              🏆 {player.level}
                                            </span>
                                          )}
                                        </div>
                                        <button
                                          onClick={() => {
                                            const newAssignments = [...manualAssignments];
                                            newAssignments[courtIdx][slot] = null;
                                            setManualAssignments(newAssignments);
                                          }}
                                          className="text-red-600 hover:text-red-800 text-xs"
                                        >
                                          ✕
                                        </button>
                                      </>
                                    ) : (
                                      <span className="text-gray-400 text-sm">Drop player here</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Match Type Popup */}
      {matchTypePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm w-full mx-4">
            <h3 className="text-base font-bold mb-3">{matchTypePopup.playerName}</h3>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2">
                <div className="flex-1 text-center">
                  <div className="text-xs text-gray-600 mb-1">Men's Double</div>
                  <div className="px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold">
                    {matchTypePopup.counts?.MM || 0}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-gray-600 mb-1">Mixed Double</div>
                  <div className="px-2 py-1 bg-purple-50 text-purple-700 rounded font-semibold">
                    {matchTypePopup.counts?.MF || 0}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xs text-gray-600 mb-1">Female's Double</div>
                  <div className="px-2 py-1 bg-pink-50 text-pink-700 rounded font-semibold">
                    {matchTypePopup.counts?.FF || 0}
                  </div>
                </div>
              </div>
              {matchTypePopup.opponentsCount && Object.keys(matchTypePopup.opponentsCount).length > 0 && (
                <div className="pt-2 border-t">
                  <div className="text-xs font-semibold text-gray-600 mb-1.5">Opponents:</div>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(matchTypePopup.opponentsCount)
                      .sort((a, b) => b[1] - a[1])
                      .map(([name, count]) => (
                        <span key={name} className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {name} ({count})
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => setMatchTypePopup(null)}
              className="mt-3 w-full px-3 py-1.5 bg-gray-200 hover:bg-gray-300 rounded text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Player Details Popup */}
      {playerDetailsPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">{playerDetailsPopup.playerName}</h3>
            <div className="space-y-4">
              {/* Courts Played */}
              <div>
                <div className="text-sm font-semibold text-gray-700 mb-2">Courts Played</div>
                <div className="flex flex-wrap gap-2">
                  {playerDetailsPopup.courtsPlayed.length > 0 ? (
                    (() => {
                      const courtCounts = playerDetailsPopup.courtsPlayed.reduce((acc, court) => {
                        acc[court] = (acc[court] || 0) + 1;
                        return acc;
                      }, {} as Record<number, number>);
                      return Object.entries(courtCounts)
                        .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                        .map(([court, count]) => (
                          <span key={court} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded font-medium text-sm">
                            Court {court} ({count})
                          </span>
                        ));
                    })()
                  ) : (
                    <span className="text-gray-500 text-sm">No courts played yet</span>
                  )}
                </div>
              </div>

              {/* Partners */}
              <div className="border-t pt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Partners</div>
                <div className="flex flex-wrap gap-2">
                  {playerDetailsPopup.partners.length > 0 ? (
                    (() => {
                      const partnerCounts = playerDetailsPopup.partners.reduce((acc, partner) => {
                        acc[partner] = (acc[partner] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(partnerCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([partner, count]) => (
                          <span key={partner} className="px-3 py-1.5 bg-green-50 text-green-700 rounded text-sm">
                            {partner} ({count})
                          </span>
                        ));
                    })()
                  ) : (
                    <span className="text-gray-500 text-sm">No partners yet</span>
                  )}
                </div>
              </div>

              {/* Opponents */}
              <div className="border-t pt-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Opponents</div>
                <div className="flex flex-wrap gap-2">
                  {playerDetailsPopup.opponents.length > 0 ? (
                    (() => {
                      const opponentCounts = playerDetailsPopup.opponents.reduce((acc, opponent) => {
                        acc[opponent] = (acc[opponent] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>);
                      return Object.entries(opponentCounts)
                        .sort((a, b) => b[1] - a[1])
                        .map(([opponent, count]) => (
                          <span key={opponent} className="px-3 py-1.5 bg-red-50 text-red-700 rounded text-sm">
                            {opponent} ({count})
                          </span>
                        ));
                    })()
                  ) : (
                    <span className="text-gray-500 text-sm">No opponents yet</span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setPlayerDetailsPopup(null)}
              className="mt-6 w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Time's Up Alarm Popup */}
      {showAlarmPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 text-center">
            <div className="mb-4">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-5xl">⏰</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Time's Up!</h3>
              <p className="text-gray-600">The round has ended. Please proceed to end the round.</p>
            </div>
            <button
              onClick={() => {
                // Stop alarm sound - clear interval
                if (alarmIntervalRef.current) {
                  clearInterval(alarmIntervalRef.current);
                  alarmIntervalRef.current = null;
                }
                // Close audio context
                if (alarmAudioContextRef.current) {
                  alarmAudioContextRef.current.close();
                  alarmAudioContextRef.current = null;
                }
                setShowAlarmPopup(false);
                handleEndRound();
              }}
              className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-lg"
            >
              End Round
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;
