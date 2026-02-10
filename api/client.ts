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
  import: (data: {
    geojson: any;
    location_id?: number;
    faculty_id?: number;
    default_fill_color?: string;
    default_stroke_color?: string;
    default_fill_opacity?: number;
    clear_existing?: boolean;
  }) => apiFetch<{
    message: string;
    imported_count: number;
    error_count: number;
    errors: string[];
    polygons: { id: number; name: string }[];
  }>('/admin/polygons/import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  deleteAll: () => apiFetch<{ message: string; deleted_count: number }>('/admin/polygons/delete-all', {
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

// ==================== E-LELANG API ====================

// Helper for bidder token
const getBidderToken = (): string | null => {
  return localStorage.getItem('sidia_bidder_token');
};

export const setBidderToken = (token: string): void => {
  localStorage.setItem('sidia_bidder_token', token);
};

export const clearBidderToken = (): void => {
  localStorage.removeItem('sidia_bidder_token');
};

export const isBidderAuthenticated = (): boolean => {
  return !!getBidderToken();
};

// Bidder-authenticated fetch
async function bidderApiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getBidderToken();

  const headers: HeadersInit = {
    'Accept': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  // Don't set Content-Type for FormData
  if (!(options.body instanceof FormData)) {
    (headers as any)['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearBidderToken();
    }
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

// Bidder Auth API
export const bidderAuthApi = {
  register: async (formData: FormData) => {
    const token = getBidderToken();
    const response = await fetch(`${API_BASE_URL}/bidder/register`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Registration failed');
    }
    return response.json();
  },

  login: async (email: string, password: string) => {
    const data = await bidderApiFetch<{ token: string; bidder: any }>('/bidder/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setBidderToken(data.token);
    return data;
  },

  logout: async () => {
    await bidderApiFetch('/bidder/logout', { method: 'POST' });
    clearBidderToken();
  },

  profile: () => bidderApiFetch<any>('/bidder/profile'),

  updateProfile: (formData: FormData) => {
    return fetch(`${API_BASE_URL}/bidder/profile`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${getBidderToken()}`,
      },
      body: formData,
    }).then(r => r.json());
  },

  verifyEmail: (token: string) => apiFetch<any>(`/bidder/verify-email/${token}`),

  resendVerification: () => bidderApiFetch<any>('/bidder/resend-verification', {
    method: 'POST',
  }),
};

// Public Auctions API
export const auctionsApi = {
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/auctions${query}`);
  },

  get: (id: number) => apiFetch<any>(`/auctions/${id}`),

  getBids: (id: number) => apiFetch<any>(`/auctions/${id}/bids`),

  facilities: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/facilities${query}`);
  },

  facilityAvailability: (id: number, date: string) =>
    apiFetch<any>(`/facilities/${id}/availability?date=${date}`),
};

// Bidder Actions API (requires bidder auth)
export const bidderApi = {
  // Deposits
  submitDeposit: async (auctionId: number, formData: FormData) => {
    const token = getBidderToken();
    const response = await fetch(`${API_BASE_URL}/bidder/auctions/${auctionId}/deposit`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Deposit submission failed');
    }
    return response.json();
  },

  myDeposits: () => bidderApiFetch<any>('/bidder/my-deposits'),

  // Bidding
  placeBid: (auctionId: number, bidAmount: number, notes?: string) =>
    bidderApiFetch<any>(`/bidder/auctions/${auctionId}/bid`, {
      method: 'POST',
      body: JSON.stringify({ bid_amount: bidAmount, notes }),
    }),

  myBids: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return bidderApiFetch<any>(`/bidder/my-bids${query}`);
  },

  // Facility Bookings
  bookFacility: async (facilityId: number, formData: FormData) => {
    const token = getBidderToken();
    const response = await fetch(`${API_BASE_URL}/bidder/facilities/${facilityId}/book`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Booking failed');
    }
    return response.json();
  },

  myBookings: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return bidderApiFetch<any>(`/bidder/my-bookings${query}`);
  },

  cancelBooking: (bookingId: number) =>
    bidderApiFetch<any>(`/bidder/bookings/${bookingId}/cancel`, {
      method: 'POST',
    }),
};

// Admin Auctions API
export const adminAuctionsApi = {
  // Auctions
  list: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/admin/auctions${query}`);
  },

  create: async (formData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/auctions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Create failed');
    }
    return response.json();
  },

  update: async (id: number, formData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/auctions/${id}`, {
      method: 'PUT',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Update failed');
    }
    return response.json();
  },

  delete: (id: number) => apiFetch<any>(`/admin/auctions/${id}`, { method: 'DELETE' }),

  updateStatus: (id: number, status: string) =>
    apiFetch<any>(`/admin/auctions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    }),

  determineWinner: (id: number) =>
    apiFetch<any>(`/admin/auctions/${id}/determine-winner`, { method: 'POST' }),

  // Bidders
  bidders: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/admin/bidders${query}`);
  },

  bidderDetail: (id: number) => apiFetch<any>(`/admin/bidders/${id}`),

  verifyBidder: (id: number, status: 'verified' | 'rejected', rejectionReason?: string) =>
    apiFetch<any>(`/admin/bidders/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status, rejection_reason: rejectionReason }),
    }),

  // Deposits
  deposits: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/admin/deposits${query}`);
  },

  verifyDeposit: (id: number, status: 'verified' | 'forfeited', notes?: string) =>
    apiFetch<any>(`/admin/deposits/${id}/verify`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: notes }),
    }),

  refundDeposit: async (id: number, formData: FormData) => {
    const token = getAuthToken();
    const response = await fetch(`${API_BASE_URL}/admin/deposits/${id}/refund`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Refund failed');
    }
    return response.json();
  },

  // Facility Bookings
  facilityBookings: (params?: Record<string, any>) => {
    const query = params ? '?' + new URLSearchParams(params).toString() : '';
    return apiFetch<any>(`/admin/facility-bookings${query}`);
  },

  updateBookingStatus: (id: number, status: 'approved' | 'rejected', notes?: string, rejectionReason?: string) =>
    apiFetch<any>(`/admin/facility-bookings/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status, admin_notes: notes, rejection_reason: rejectionReason }),
    }),

  completeBooking: (id: number) =>
    apiFetch<any>(`/admin/facility-bookings/${id}/complete`, { method: 'POST' }),
};
