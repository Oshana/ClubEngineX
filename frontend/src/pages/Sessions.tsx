import {
    closestCenter,
    DndContext,
    DragEndEvent,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { sessionsAPI } from '../api/client';
import ConfirmDialog from '../components/ConfirmDialog';
import { useNotification } from '../context/NotificationContext';
import { Session, SessionStatus } from '../types';

interface SortableSessionProps {
  session: Session;
  onEdit: (session: Session) => void;
  onDelete: (id: number) => void;
  onStart: (id: number) => void;
  getStatusBadge: (status: SessionStatus) => React.ReactNode;
}

function SortableSession({ session, onEdit, onDelete, onStart, getStatusBadge }: SortableSessionProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: session.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleClick = (e: React.MouseEvent) => {
    // Prevent navigation if clicking on buttons
    if ((e.target as HTMLElement).closest('button')) {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card hover:shadow-lg transition-shadow relative"
      onClick={handleClick}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-2 hover:bg-gray-100 rounded"
          title="Drag to reorder"
        >
          <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
          </svg>
        </div>

        {/* Session Content */}
        <Link
          to={`/sessions/${session.id}`}
          className="flex-1 flex justify-between items-start"
        >
          <div>
            <h3 className="text-xl font-bold">{session.name}</h3>
            <p className="text-gray-600 mt-1">
              {new Date(session.date).toLocaleDateString()}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {session.number_of_courts} courts • {session.match_duration_minutes} min matches
            </p>
          </div>
          <div>
            {getStatusBadge(session.status)}
          </div>
        </Link>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {(!session.started_at || session.ended_at) && (
            <button
              onClick={() => onStart(session.id)}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              title="Start session"
            >
              Start
            </button>
          )}
          {session.started_at && !session.ended_at && (
            <span className="px-4 py-2 bg-green-100 text-green-800 rounded font-medium">
              In Progress
            </span>
          )}
          <button
            onClick={() => onEdit(session)}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
            title="Edit session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(session.id)}
            className="p-2 text-red-600 hover:bg-red-50 rounded"
            title="Delete session"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<number | null>(null);
  const { showNotification } = useNotification();
  
  const [formData, setFormData] = useState({
    name: '',
    match_duration_minutes: 15,
    number_of_courts: 4,
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const response = await sessionsAPI.getAll();
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to load sessions:', error);
      showNotification('error', 'Failed to load sessions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await sessionsAPI.create(formData);
      setShowCreateModal(false);
      setFormData({ name: '', match_duration_minutes: 15, number_of_courts: 4 });
      await loadSessions();
      showNotification('success', 'Session created successfully!');
    } catch (error: any) {
      console.error('Failed to create session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to create session. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleStartSession = async (sessionId: number) => {
    try {
      await sessionsAPI.startSession(sessionId);
      await loadSessions();
      showNotification('success', 'Session started successfully!');
      // Navigate to the session
      window.location.href = `/sessions/${sessionId}`;
    } catch (error: any) {
      console.error('Failed to start session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to start session. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingSession) return;

    try {
      await sessionsAPI.update(editingSession.id, formData);
      setShowEditModal(false);
      setEditingSession(null);
      setFormData({ name: '', match_duration_minutes: 15, number_of_courts: 4 });
      await loadSessions();
      showNotification('success', 'Session updated successfully!');
    } catch (error: any) {
      console.error('Failed to update session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to update session. Please try again.';
      showNotification('error', errorMessage);
    }
  };

  const handleEdit = (session: Session) => {
    setEditingSession(session);
    setFormData({
      name: session.name,
      match_duration_minutes: session.match_duration_minutes,
      number_of_courts: session.number_of_courts,
    });
    setShowEditModal(true);
  };

  const handleDelete = async (id: number) => {
    setDeletingSessionId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingSessionId) return;

    try {
      await sessionsAPI.delete(deletingSessionId);
      await loadSessions();
      showNotification('success', 'Session deleted successfully!');
    } catch (error: any) {
      console.error('Failed to delete session:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete session. It may have active rounds or attendance records.';
      showNotification('error', errorMessage);
    } finally {
      setShowDeleteConfirm(false);
      setDeletingSessionId(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSessions((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const getStatusBadge = (status: SessionStatus) => {
    const colors = {
      [SessionStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [SessionStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [SessionStatus.ENDED]: 'bg-blue-100 text-blue-800',
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs ${colors[status]}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Sessions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
        >
          + New Session
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sessions.map(s => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="grid gap-4">
            {sessions.map((session) => (
              <SortableSession
                key={session.id}
                session={session}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStart={handleStartSession}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {sessions.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No sessions yet. Create your first session to get started!
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Create Session</h2>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Match Duration (minutes)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.match_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, match_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Number of Courts</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={formData.number_of_courts}
                  onChange={(e) => setFormData({ ...formData, number_of_courts: parseInt(e.target.value) })}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-secondary flex-1"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Session</h2>
            
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Session Name</label>
                <input
                  type="text"
                  className="input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Match Duration (minutes)</label>
                <input
                  type="number"
                  className="input"
                  value={formData.match_duration_minutes}
                  onChange={(e) => setFormData({ ...formData, match_duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Number of Courts</label>
                <input
                  type="number"
                  min="1"
                  className="input"
                  value={formData.number_of_courts}
                  onChange={(e) => setFormData({ ...formData, number_of_courts: parseInt(e.target.value) })}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <button type="submit" className="btn btn-primary flex-1">
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingSession(null);
                    setFormData({ name: '', match_duration_minutes: 15, number_of_courts: 4 });
                  }}
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
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeletingSessionId(null);
        }}
        danger
      />
    </div>
  );
};

export default Sessions;
