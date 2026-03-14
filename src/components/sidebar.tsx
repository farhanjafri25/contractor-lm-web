'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    FileText,
    ShieldCheck,
    Settings,
    LogOut,
    Activity,
} from 'lucide-react';
import { useAuth } from '@/context/auth-context';
import { useQuery } from '@tanstack/react-query';
import { tenantApi } from '@/lib/api';

const NAV = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/contractors', label: 'Contractors', icon: Users },
    { href: '/sponsor', label: 'Sponsor Requests', icon: FileText, roles: ['admin', 'security', 'sponsor'] },
    { href: '/access', label: 'Access', icon: ShieldCheck, roles: ['admin', 'security'] },
    { href: '/events', label: 'Audit Log', icon: Activity, roles: ['admin', 'security'] },
    { href: '/settings/team', label: 'Team', icon: Settings, roles: ['admin'] },
];

export function Sidebar() {
    const pathname = usePathname();
    const { user, logout } = useAuth();
    const isAdmin = user?.role === 'admin';

    const { data: pendingData } = useQuery({
        queryKey: ['pending-users'],
        queryFn: async () => (await tenantApi.getPendingUsers()).data,
        enabled: isAdmin,
    });
    const pendingCount = pendingData?.data?.length || 0;

    const visible = NAV.filter((n) => !n.roles || n.roles.includes(user?.role ?? ''));

    return (
        <aside style={{
            width: 220,
            minHeight: '100vh',
            background: 'var(--color-surface)',
            borderRight: '1px solid var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            padding: '1.5rem 0',
            position: 'fixed',
            top: 0,
            left: 0,
        }}>
            {/* Logo */}
            <div style={{ padding: '0 1.25rem 2rem', display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src="/tenurio-logo-black.svg" alt="Tenurio Logo" style={{ height: 28, width: 'auto' }} />
                <span style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--color-text-primary)', letterSpacing: '-0.3px' }}>
                    Tenurio
                </span>
            </div>

            {/* Nav items */}
            <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '0 0.75rem' }}>
                {visible.map(({ href, label, icon: Icon }) => {
                    const active = pathname.startsWith(href);
                    const showBadge = (href === '/settings/team' && pendingCount > 0);
                    
                    return (
                        <Link
                            key={href}
                            href={href}
                            style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '0.6rem 0.75rem',
                                borderRadius: 8,
                                fontSize: '0.875rem',
                                fontWeight: active ? 600 : 400,
                                color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                background: active ? 'var(--color-primary-muted)' : 'transparent',
                                textDecoration: 'none',
                                transition: 'all 0.15s',
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Icon size={16} />
                                {label}
                            </div>
                            
                            {showBadge && (
                                <span style={{
                                    background: 'var(--color-danger)', color: 'white',
                                    padding: '0.1rem 0.4rem', borderRadius: 10,
                                    fontSize: '0.65rem', fontWeight: 700,
                                }}>{pendingCount}</span>
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* User footer */}
            {user && (
                <div style={{ padding: '1rem 1.25rem 0', borderTop: '1px solid var(--color-border)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>
                        {user.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'capitalize' }}>
                        {user.role}
                    </div>
                    <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', fontSize: '0.8rem' }} onClick={logout}>
                        <LogOut size={14} />
                        Sign out
                    </button>
                </div>
            )}
        </aside>
    );
}
