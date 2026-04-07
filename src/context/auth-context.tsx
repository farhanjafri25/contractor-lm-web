'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import posthog from 'posthog-js';
import { authApi } from '@/lib/api';

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch {
        return null;
    }
}

interface User {
    _id: string;
    email: string;
    name?: string;
    info?: string;
    avatar?: string;
    avatarVersion?: number;
    role: 'admin' | 'sponsor';
    tenant_id?: string;
    status?: string;
}

interface AuthState {
    user: User | null;
    tenantId: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    acceptInvite: (email: string, token: string, password: string) => Promise<void>;
    forgotPassword: (email: string) => Promise<void>;
    resetPassword: (email: string, otp: string, passwordPlain: string) => Promise<void>;
    updateUserSession: (data: Partial<User>) => void;
    setSession: (access_token: string, refresh_token: string, user: User) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

function persistUser(user: User | null) {
    if (!user) {
        localStorage.removeItem('user');
        return;
    }

    try {
        localStorage.setItem('user', JSON.stringify(user));
        return;
    } catch {
        const withoutAvatar = { ...user };
        delete withoutAvatar.avatar;

        try {
            localStorage.setItem('user', JSON.stringify(withoutAvatar));
        } catch {
            // Ignore storage quota failures and keep the in-memory session alive.
        }
    }
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(() => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem('user');
        return stored ? JSON.parse(stored) : null;
    });
    const [tenantId, setTenantId] = useState<string | null>(() => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('tenant_id');
    });
    const [isLoading] = useState(false);

    const setSession = (access_token: string, refresh_token: string, user: User) => {
        let tId = user?.tenant_id as string | undefined;
        if (!tId && access_token) {
            const decoded = parseJwt(access_token);
            if (decoded && decoded.tenant_id) {
                tId = decoded.tenant_id;
            }
        }

        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        persistUser(user);

        if (tId) {
            localStorage.setItem('tenant_id', tId);
            setTenantId(tId);
        }
        setUser(user);
        posthog.identify(user._id, { email: user.email, name: user.name, role: user.role, tenant_id: tId });
    };

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login(email, password);
        setSession(data.access_token, data.refresh_token, data.user);
    };

    const acceptInvite = async (email: string, token: string, passwordPlain: string) => {
        const { data } = await authApi.acceptInvite(email, token, passwordPlain);
        setSession(data.access_token, data.refresh_token, data.user);
    };

    const updateUserSession = (data: Partial<User>) => {
        setUser((prev) => {
            if (!prev) return prev;
            const next = { ...prev, ...data };
            persistUser(next);
            return next;
        });
    };

    const logout = () => {
        posthog.reset();
        localStorage.clear();
        setUser(null);
        setTenantId(null);
        window.location.href = '/login';
    };

    const forgotPassword = async (email: string) => {
        await authApi.forgotPassword(email);
    };

    const resetPassword = async (email: string, otp: string, passwordPlain: string) => {
        await authApi.resetPassword(email, otp, passwordPlain);
    };

    return (
        <AuthContext.Provider value={{ user, tenantId, isLoading, login, acceptInvite, forgotPassword, resetPassword, updateUserSession, setSession, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
