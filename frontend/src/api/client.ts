import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (usernameOrEmail: string, password: string) =>
    api.post('/auth/login', { username_or_email: usernameOrEmail, password }),
  register: (data: { email: string; password: string; full_name: string; is_admin: boolean }) =>
    api.post('/auth/register', data),
};

// Players API
export const playersAPI = {
  getAll: (params?: { skip?: number; limit?: number; search?: string; is_active?: boolean }) =>
    api.get('/players', { params }),
  getById: (id: number) => api.get(`/players/${id}`),
  create: (data: any) => api.post('/players', data),
  update: (id: number, data: any) => api.patch(`/players/${id}`, data),
  delete: (id: number) => api.delete(`/players/${id}`),
};

// Sessions API
export const sessionsAPI = {
  getAll: (params?: { skip?: number; limit?: number }) =>
    api.get('/sessions', { params }),
  getById: (id: number) => api.get(`/sessions/${id}`),
  create: (data: any) => api.post('/sessions', data),
  update: (id: number, data: any) => api.patch(`/sessions/${id}`, data),
  delete: (id: number) => api.delete(`/sessions/${id}`),
  endSession: (id: number) => api.post(`/sessions/${id}/end`),
  setAttendance: (id: number, player_ids: number[]) =>
    api.post(`/sessions/${id}/attendance`, { player_ids }),
  getAttendance: (id: number) => api.get(`/sessions/${id}/attendance`),
  getRounds: (id: number) => api.get(`/sessions/${id}/rounds`),
  autoAssign: (id: number, data: any) => {
    const { court_assignments, ...preferences } = data || {};
    const payload: any = { session_id: id, preferences };
    if (court_assignments) {
      payload.court_assignments = court_assignments;
    }
    return api.post(`/sessions/${id}/rounds/auto_assign`, payload);
  },
  getStats: (id: number) => api.get(`/sessions/${id}/stats`),
  startSession: (id: number) => api.post(`/sessions/${id}/start`),
};

// Rounds API
export const roundsAPI = {
  start: (id: number) => api.post(`/sessions/rounds/${id}/start`),
  end: (id: number) => api.post(`/sessions/rounds/${id}/end`),
  cancel: (id: number) => api.delete(`/sessions/rounds/${id}`),
  updateCourt: (roundId: number, courtNumber: number, data: any) =>
    api.patch(`/sessions/rounds/${roundId}/courts/${courtNumber}`, data),
  updateCourtAssignment: (courtAssignmentId: number, data: any) =>
    api.patch(`/sessions/court-assignments/${courtAssignmentId}`, data),
};

// Player Portal API
export const playerPortalAPI = {
  getProfile: () => api.get('/me'),
  getStats: () => api.get('/me/stats'),
  getSessions: () => api.get('/me/sessions'),
};

// Club Settings API
export const clubSettingsAPI = {
  getSettings: () => api.get('/club-settings'),
  updateSettings: (data: any) => api.put('/club-settings', data),
  getLevels: () => api.get('/club-settings/levels'),
};

// Statistics API
export const statisticsAPI = {
  getGlobalStats: () => api.get('/statistics/global'),
};

// Super Admin API
export const superAdminAPI = {
  getDashboard: () => api.get('/super-admin/dashboard'),
  getClubs: (params?: { skip?: number; limit?: number }) => 
    api.get('/super-admin/clubs', { params }),
  getClub: (id: number) => api.get(`/super-admin/clubs/${id}`),
  createClub: (data: any) => api.post('/super-admin/clubs', data),
  updateClub: (id: number, data: any) => api.patch(`/super-admin/clubs/${id}`, data),
  deleteClub: (id: number) => api.delete(`/super-admin/clubs/${id}`),
  toggleClubActive: (id: number) => api.patch(`/super-admin/clubs/${id}/toggle-active`),
  getClubStats: (id: number) => api.get(`/super-admin/clubs/${id}/stats`),
  getClubAdmins: (id: number) => api.get(`/super-admin/clubs/${id}/admins`),
};

export default api;
