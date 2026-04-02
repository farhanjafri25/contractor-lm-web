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
            // Do not intercept 401s for login/signup/otp because those are credential/validation errors, 
            // not an expired session that requires a redirect
            if (original.url?.includes('/auth/')) {
                return Promise.reject(error);
            }

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

export const healthApi = {
    ping: () => api.get('/'),
};

export const authApi = {
    login: (email: string, password: string) =>
        api.post('/auth/login', { email, password }),
    signup: (email: string, name: string, password: string) =>
        api.post('/auth/signup', { email, name, password }),
    verifyOtp: (email: string, otp: string) =>
        api.post('/auth/verify-otp', { email, otp }),
    acceptInvite: (email: string, token: string, passwordPlain: string) =>
        api.post('/auth/accept-invite', { email, token, password: passwordPlain }),
    forgotPassword: (email: string) =>
        api.post('/auth/forgot-password', { email }),
    resetPassword: (email: string, otp: string, passwordPlain: string) =>
        api.post('/auth/reset-password', { email, otp, password: passwordPlain }),
};

export const tenantApi = {
    getProfile: () => api.get('/tenants/me'),
    updateProfile: (data: Record<string, unknown>) => api.patch('/tenants/me', data),
    getStats: () => api.get('/tenants/me/stats'),
    getUserProfile: () => api.get('/tenants/me/user'),
    updateUserProfile: (data: Record<string, unknown>) => api.patch('/tenants/me/user', data),
    listUsers: (params?: Record<string, unknown>) => api.get('/tenants/me/users', { params }),
    getPendingUsers: () => api.get('/tenants/me/pending-users'),
    inviteUser: (email: string) => api.post('/tenants/me/users', { email }),
    deactivateUser: (id: string) => api.post(`/tenants/me/users/${id}/deactivate`),
    reactivateUser: (id: string) => api.post(`/tenants/me/users/${id}/reactivate`),
    approveUser: (id: string) => api.post(`/tenants/me/users/${id}/approve`),
    rejectUser: (id: string) => api.post(`/tenants/me/users/${id}/reject`),
};

export const contractorsApi = {
    list: (params?: Record<string, unknown>) => api.get('/contractors', { params }),
    get: (id: string) => api.get(`/contractors/${id}`),
    create: (data: Record<string, unknown>) => api.post('/contractors', data),
    bulkCreate: (data: { contractors: Record<string, unknown>[] }) => api.post('/contractors/bulk', data),
    update: (id: string, data: Record<string, unknown>) => api.patch(`/contractors/${id}`, data),
    delete: (id: string) => api.delete(`/contractors/${id}`),
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
    review: (id: string, decision: 'approved' | 'rejected', review_note?: string) =>
        api.patch(`/sponsor/actions/${id}/review`, { decision, review_note }),
};

export const accessApi = {
    list: (params?: Record<string, unknown>) => api.get('/access', { params }),
    getByContract: (contractId: string) => api.get(`/access/contract/${contractId}`),
    assign: (contractId: string, appIds: string[]) => api.post(`/access/contract/${contractId}/assign`, { app_ids: appIds }),
    sync: (contractId: string, data: { access_items: any[]; create_google_account?: boolean; create_slack_account?: boolean }) =>
        api.patch(`/access/contract/${contractId}/sync`, data),
    revoke: (id: string) => api.post(`/access/${id}/revoke`),
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

export const integrationApi = {
    getStatus: () => api.get('/integrations/status'),
};

export const applicationsApi = {
    list: () => api.get('/applications'),
};

export interface AiChatMessage {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
}

export const aiApi = {
    chat: (messages: AiChatMessage[]) => api.post('/ai/chat', { messages }),
};

export const feedbackApi = {
    submit: (data: { category: string; message: string; rating?: number; metadata?: Record<string, unknown> }) =>
        api.post('/feedback', data),
};
