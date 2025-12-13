// API Configuration
const API_BASE_URL = 'http://localhost:8000/api/v1';

// Helper to get auth token from localStorage
const getAuthToken = (): string | null => {
  return localStorage.getItem('sidia_auth_token');
};

// Helper to set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('sidia_auth_token', token);
};

// Helper to clear auth token
export const clearAuthToken = (): void => {
  localStorage.removeItem('sidia_auth_token');
};

// Check if user is authenticated
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

// Base fetch wrapper with auth headers
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearAuthToken();
      window.location.href = '/admin/login';
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authApi = {
  login: async (email: string, password: string) => {
    const data = await apiFetch<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    return data;
  },
  
  logout: async () => {
    await apiFetch('/admin/logout', { method: 'POST' });
    clearAuthToken();
  },
  
  me: () => apiFetch<any>('/admin/me'),
};

// Stats API
export const statsApi = {
  get: () => apiFetch<any>('/stats'),
};

// Buildings API
export const buildingsApi = {
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/buildings${query}`);
  },
  get: (id: number) => apiFetch<any>(`/buildings/${id}`),
  create: (data: any) => apiFetch<any>('/admin/buildings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiFetch<any>(`/admin/buildings/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<any>(`/admin/buildings/${id}`, {
    method: 'DELETE',
  }),
};

// Rooms API
export const roomsApi = {
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/rooms${query}`);
  },
  get: (id: number) => apiFetch<any>(`/rooms/${id}`),
  create: (data: any) => apiFetch<any>('/admin/rooms', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiFetch<any>(`/admin/rooms/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<any>(`/admin/rooms/${id}`, {
    method: 'DELETE',
  }),
};

// Assets API
export const assetsApi = {
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/assets${query}`);
  },
  get: (id: number) => apiFetch<any>(`/assets/${id}`),
  create: (data: any) => apiFetch<any>('/admin/assets', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiFetch<any>(`/admin/assets/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<any>(`/admin/assets/${id}`, {
    method: 'DELETE',
  }),
};

// Polygons API
export const polygonsApi = {
  list: () => apiFetch<any>('/polygons'),
  geojson: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/polygons/geojson${query}`);
  },
  get: (id: number) => apiFetch<any>(`/polygons/${id}`),
  create: (data: any) => apiFetch<any>('/admin/polygons', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiFetch<any>(`/admin/polygons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<any>(`/admin/polygons/${id}`, {
    method: 'DELETE',
  }),
};

// Schedules API
export const schedulesApi = {
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/schedules${query}`);
  },
  get: (id: number) => apiFetch<any>(`/schedules/${id}`),
  create: (data: any) => apiFetch<any>('/admin/schedules', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: number, data: any) => apiFetch<any>(`/admin/schedules/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: number) => apiFetch<any>(`/admin/schedules/${id}`, {
    method: 'DELETE',
  }),
  syncSipirang: () => apiFetch<any>('/admin/schedules/sync-sipirang', {
    method: 'POST',
  }),
};

// Categories API
export const categoriesApi = {
  list: () => apiFetch<any[]>('/categories'),
};

// Locations API
export const locationsApi = {
  list: () => apiFetch<any[]>('/locations'),
};

// Faculties API
export const facultiesApi = {
  list: () => apiFetch<any[]>('/faculties'),
};
