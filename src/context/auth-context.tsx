'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authApi } from '@/lib/api';

interface User {
    _id: string;
    email: string;
    role: 'admin' | 'security' | 'sponsor' | 'viewer';
}

interface AuthState {
    user: User | null;
    tenantId: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Restore session from localStorage on mount
        const stored = localStorage.getItem('user');
        const storedTenant = localStorage.getItem('tenant_id');
        if (stored && storedTenant) {
            setUser(JSON.parse(stored));
            setTenantId(storedTenant);
        }
        setIsLoading(false);
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await authApi.login(email, password);
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        // The backend returns user context which includes tenant_id indirectly or we don't need it.
        // If we still need global tenantId, we can parse it from JWT or API.
        // Assuming data.user.tenant_id is provided or implicit going forward.
        if (data.user?.tenant_id) {
            localStorage.setItem('tenant_id', data.user.tenant_id);
            setTenantId(data.user.tenant_id);
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
        <AuthContext.Provider value={{ user, tenantId, isLoading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}
