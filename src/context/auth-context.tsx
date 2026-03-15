'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
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
    role: 'owner' | 'admin' | 'sponsor';
}

interface AuthState {
    user: User | null;
    tenantId: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    acceptInvite: (email: string, token: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

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

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login(email, password);
        
        let tId = data.user?.tenant_id;
        if (!tId && data.access_token) {
            const decoded = parseJwt(data.access_token);
            if (decoded && decoded.tenant_id) {
                tId = decoded.tenant_id;
            }
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (tId) {
            localStorage.setItem('tenant_id', tId);
            setTenantId(tId);
        }
        setUser(data.user);
    };

    const acceptInvite = async (email: string, token: string, passwordPlain: string) => {
        const { data } = await authApi.acceptInvite(email, token, passwordPlain);

        let tId = data.user?.tenant_id;
        if (!tId && data.access_token) {
            const decoded = parseJwt(data.access_token);
            if (decoded && decoded.tenant_id) {
                tId = decoded.tenant_id;
            }
        }

        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (tId) {
            localStorage.setItem('tenant_id', tId);
            setTenantId(tId);
        }
        setUser(data.user);
    };

    const logout = () => {
        localStorage.clear();
        setUser(null);
        setTenantId(null);
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider value={{ user, tenantId, isLoading, login, acceptInvite, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
