import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000/v1';

export const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' },
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-refresh or redirect on 401
api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refreshToken = localStorage.getItem('refresh_token');
                if (refreshToken) {
                    const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
                        refresh_token: refreshToken,
                    });
                    localStorage.setItem('access_token', data.access_token);
                    original.headers.Authorization = `Bearer ${data.access_token}`;
                    return api(original);
                }
            } catch {
                // refresh failed — clear and redirect to login
            }
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    },
);

// ── Typed API helpers ──────────────────────────────────────

export const authApi = {
    login: (email: string, password: string, tenant_id: string) =>
        api.post('/auth/login', { email, password, tenant_id }),
};

export const tenantApi = {
    getProfile: () => api.get('/tenants/me'),
    updateProfile: (data: Record<string, unknown>) => api.patch('/tenants/me', data),
    getStats: () => api.get('/tenants/me/stats'),
    listUsers: (params?: Record<string, unknown>) => api.get('/tenants/me/users', { params }),
    inviteUser: (data: Record<string, unknown>) => api.post('/tenants/me/users', data),
    updateRole: (id: string, role: string) => api.patch(`/tenants/me/users/${id}/role`, { role }),
    deactivateUser: (id: string) => api.post(`/tenants/me/users/${id}/deactivate`),
    reactivateUser: (id: string) => api.post(`/tenants/me/users/${id}/reactivate`),
};

export const contractorsApi = {
    list: (params?: Record<string, unknown>) => api.get('/contractors', { params }),
    get: (id: string) => api.get(`/contractors/${id}`),
    create: (data: Record<string, unknown>) => api.post('/contractors', data),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/contractors/${id}`, data),
};

export const contractsApi = {
    get: (contractorId: string, contractId: string) =>
        api.get(`/contractors/${contractorId}/contracts/${contractId}`),
    suspend: (contractorId: string, contractId: string, reason: string, note?: string) =>
        api.post(`/contractors/${contractorId}/contracts/${contractId}/suspend`, { reason, note }),
    reactivate: (contractorId: string, contractId: string, note?: string) =>
        api.post(`/contractors/${contractorId}/contracts/${contractId}/reactivate`, { note }),
    extend: (contractorId: string, contractId: string, new_end_date: string, note?: string) =>
        api.patch(`/contractors/${contractorId}/contracts/${contractId}/extend`, { new_end_date, note }),
    terminate: (contractorId: string, contractId: string, reason?: string) =>
        api.post(`/contractors/${contractorId}/contracts/${contractId}/terminate`, { reason }),
};

export const sponsorApi = {
    list: (params?: Record<string, unknown>) => api.get('/sponsor/actions', { params }),
    get: (id: string) => api.get(`/sponsor/actions/${id}`),
    submit: (data: Record<string, unknown>) => api.post('/sponsor/actions', data),
    review: (id: string, decision: 'approved' | 'rejected', note?: string) =>
        api.patch(`/sponsor/actions/${id}/review`, { decision, note }),
};

export const accessApi = {
    list: (params?: Record<string, unknown>) => api.get('/access', { params }),
    getByContract: (contractId: string) => api.get(`/access/contract/${contractId}`),
    retryRevocation: (id: string) => api.post(`/access/${id}/retry-revocation`),
    markResolved: (id: string) => api.post(`/access/${id}/mark-resolved`),
};

export const dashboardApi = {
    getSummary: (params?: Record<string, unknown>) => api.get('/dashboard/summary', { params }),
    getExpiring: (params?: Record<string, unknown>) => api.get('/dashboard/expiring', { params }),
    getOverdue: (params?: Record<string, unknown>) => api.get('/dashboard/overdue', { params }),
    getAtRisk: (params?: Record<string, unknown>) => api.get('/dashboard/at-risk', { params }),
};

export const eventsApi = {
    list: (params?: Record<string, unknown>) => api.get('/events', { params }),
    getStats: (params?: Record<string, unknown>) => api.get('/events/stats', { params }),
    getContractorTimeline: (contractorId: string) =>
        api.get(`/events/contractor/${contractorId}`),
};
