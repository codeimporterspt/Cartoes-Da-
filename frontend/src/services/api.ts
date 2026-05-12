import axios from 'axios';
import { useAuthStore } from '../store/authStore';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; brands: string[]; concessaoIds?: string[]; nif?: string }) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/auth/change-password', { currentPassword, newPassword }),
};

// Users
export const usersApi = {
  list: (params?: Record<string, string>) => api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: string, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  resetPassword: (id: string, newPassword: string) =>
    api.put(`/users/${id}/reset-password`, { newPassword }),
  approve: (id: string, brands: string[], concessaoIds: string[], role: string) =>
    api.put(`/users/${id}/approve`, { brands, concessaoIds, role }),
  reject: (id: string) => api.put(`/users/${id}/reject`),
  deactivate: (id: string) => api.put(`/users/${id}/deactivate`),
  reactivate: (id: string) => api.put(`/users/${id}/reactivate`),
};

// Cards
export const cardsApi = {
  list: (params?: Record<string, string>) => api.get('/cards', { params }),
  getById: (id: string) => api.get(`/cards/${id}`),
  create: (formData: FormData) =>
    api.post('/cards', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  validate: (id: string, data: { status: string; rejectionReason?: string }) =>
    api.put(`/cards/${id}/validate`, data),
  updateBalance: (id: string, movementValue: number, notes?: string) =>
    api.put(`/cards/${id}/balance`, { movementValue, notes }),
  inactivate: (id: string) => api.put(`/cards/${id}/inactivate`),
  reactivate: (id: string) => api.put(`/cards/${id}/reactivate`),
  transfer: (id: string, newUserId: string) =>
    api.put(`/cards/${id}/transfer`, { newUserId }),
  exportExcel: (params?: Record<string, string>) =>
    api.get('/cards/export', { params, responseType: 'blob' }),
};

// Prizes
export const prizesApi = {
  list: (params?: Record<string, string>) => api.get('/prizes', { params }),
  getPending: (params?: Record<string, string>) => api.get('/prizes/pending', { params }),
  approve: (ids: string[]) => api.post('/prizes/approve', { ids }),
  reject: (ids: string[], reason: string) => api.post('/prizes/reject', { ids, reason }),
  deletePending: (id: string) => api.delete(`/prizes/${id}`),
  exportExcel: (params?: Record<string, string>) =>
    api.get('/prizes/export', { params, responseType: 'blob' }),
};

// Origins
type OriginPayload = {
  name: string;
  area?: string;
  estado?: string;
  matricula?: string;
  modelo?: string;
  description?: string;
};

export const originsApi = {
  list: (params?: Record<string, string>) => api.get('/origins', { params }),
  create: (data: OriginPayload) => api.post('/origins', data),
  update: (id: string, data: OriginPayload) => api.put(`/origins/${id}`, data),
  delete: (id: string) => api.delete(`/origins/${id}`),
  exportExcel: () => api.get('/origins/export', { responseType: 'blob' }),
};

// Concessões
export const concessoesApi = {
  list: (brand?: string) => api.get('/concessoes', { params: brand ? { brand } : undefined }),
  create: (data: { name: string; dealerCode: string; brand: string }) => api.post('/concessoes', data),
  update: (id: string, data: { name: string; dealerCode: string; brand?: string }) =>
    api.put(`/concessoes/${id}`, data),
  delete: (id: string) => api.delete(`/concessoes/${id}`),
};

// Imports
export const importsApi = {
  list: (params?: Record<string, string>) => api.get('/imports', { params }),
  importPrizes: (formData: FormData) =>
    api.post('/imports/prizes', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importPrizesAftersales: (formData: FormData) =>
    api.post('/imports/prizes-aftersales', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importTopup: (formData: FormData) =>
    api.post('/imports/topup', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importOrigins: (formData: FormData) =>
    api.post('/imports/origins', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  importConcessoes: (formData: FormData, brand: string) => {
    formData.append('brand', brand);
    return api.post('/imports/concessoes', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  downloadTemplate: (type: string) =>
    api.get(`/imports/template/${type}`, { responseType: 'blob' }),
  downloadLastFile: (type: string) =>
    api.get(`/imports/last-file/${type}`, { responseType: 'blob' }),
};

// Card Loading History
export const cardLoadingApi = {
  list: (params?: Record<string, string>) => api.get('/card-loading', { params }),
  exportExcel: (params?: Record<string, string>) =>
    api.get('/card-loading/export', { params, responseType: 'blob' }),
  updateOrigin: (id: string, originId: string | null) =>
    api.patch(`/card-loading/${id}/origin`, { originId }),
};

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
