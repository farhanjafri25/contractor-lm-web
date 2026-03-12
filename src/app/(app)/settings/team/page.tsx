'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { tenantApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { UserPlus, ShieldCheck, Users } from 'lucide-react';

const ROLE_BADGE: Record<string, string> = {
    admin: 'badge-pending',
    security: 'badge-active',
    sponsor: 'badge-neutral',
    viewer: 'badge-neutral',
};

const ROLES = ['admin', 'security', 'sponsor', 'viewer'];

function InviteModal({ onClose }: { onClose: () => void }) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('sponsor');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const qc = useQueryClient();

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true); setError('');
        try {
            await tenantApi.inviteUser({ email: email.toLowerCase(), role });
            qc.invalidateQueries({ queryKey: ['team-users'] });
            onClose();
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setLoading(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="card" style={{ width: '100%', maxWidth: 400, borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Invite Team Member</h3>
                {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}
                <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Email *</label>
                        <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@company.io" />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Role *</label>
                        <select value={role} onChange={(e) => setRole(e.target.value)}>
                            {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                        </select>
                        <p style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                            {role === 'admin' ? 'Full access — manage contractors, approve requests, manage team' :
                                role === 'security' ? 'Can view everything and manage access provisions' :
                                    role === 'sponsor' ? 'Can create and manage assigned contractors' :
                                        'Read-only access'}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            <UserPlus size={14} /> {loading ? 'Inviting…' : 'Send Invite'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function TeamPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';
    const [showInvite, setShowInvite] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const qc = useQueryClient();

    const { data, isLoading } = useQuery({
        queryKey: ['team-users'],
        queryFn: async () => (await tenantApi.listUsers()).data,
    });

    const { data: stats } = useQuery({
        queryKey: ['tenant-stats'],
        queryFn: async () => (await tenantApi.getProfile()).data,
    });

    const handleRoleChange = async (id: string, role: string) => {
        setUpdatingId(id);
        try {
            await tenantApi.updateRole(id, role);
            qc.invalidateQueries({ queryKey: ['team-users'] });
        } catch { }
        setUpdatingId(null);
    };

    const handleDeactivate = async (id: string) => {
        try {
            await tenantApi.deactivateUser(id);
            qc.invalidateQueries({ queryKey: ['team-users'] });
        } catch { }
    };

    const handleReactivate = async (id: string) => {
        try {
            await tenantApi.reactivateUser(id);
            qc.invalidateQueries({ queryKey: ['team-users'] });
        } catch { }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Team</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        Manage workspace members and roles
                    </p>
                </div>
                {isAdmin && (
                    <button className="btn btn-primary" onClick={() => setShowInvite(true)}>
                        <UserPlus size={15} /> Invite Member
                    </button>
                )}
            </div>

            {/* Stats row */}
            {stats && (
                <div style={{ display: 'flex', gap: '1rem' }}>
                    {[
                        { label: 'Plan', value: String(stats.plan ?? '—'), icon: ShieldCheck },
                        { label: 'Status', value: String(stats.billing_status ?? '—'), icon: Users },
                        { label: 'Contractor limit', value: stats.contractor_seat_limit ?? '∞', icon: Users },
                    ].map(({ label, value, icon: Icon }) => (
                        <div key={label} className="card" style={{ flex: 1, padding: '1rem', display: 'flex', gap: 12, alignItems: 'center' }}>
                            <div style={{ padding: 8, borderRadius: 8, background: 'var(--color-primary-muted)', color: 'var(--color-primary)' }}>
                                <Icon size={15} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{label}</div>
                                <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>{String(value)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Members table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Member', 'Role', 'Status', isAdmin ? 'Actions' : ''].map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 3 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {Array.from({ length: 4 }).map((_, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}><div className="skeleton" style={{ height: 14, width: j === 0 ? '60%' : '40%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            data?.data?.map((member: Record<string, unknown>) => {
                                const isSelf = member._id === user?._id;
                                const isActive = member.status === 'active';
                                return (
                                    <tr key={String(member._id)} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                {String(member.email ?? '')}
                                                {isSelf && <span className="badge badge-neutral" style={{ fontSize: '0.65rem' }}>you</span>}
                                            </div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            {isAdmin && !isSelf ? (
                                                <select
                                                    value={String(member.role ?? '')}
                                                    onChange={(e) => handleRoleChange(String(member._id), e.target.value)}
                                                    disabled={updatingId === String(member._id)}
                                                    style={{ width: 130, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }}
                                                >
                                                    {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
                                                </select>
                                            ) : (
                                                <span className={`badge ${ROLE_BADGE[String(member.role ?? '')] ?? 'badge-neutral'}`} style={{ textTransform: 'capitalize' }}>
                                                    {String(member.role ?? '')}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span className={`badge ${isActive ? 'badge-active' : 'badge-expired'}`}>
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                {!isSelf && (
                                                    isActive
                                                        ? <button className="btn btn-danger" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }} onClick={() => handleDeactivate(String(member._id))}>Deactivate</button>
                                                        : <button className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '0.3rem 0.75rem' }} onClick={() => handleReactivate(String(member._id))}>Reactivate</button>
                                                )}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {showInvite && <InviteModal onClose={() => setShowInvite(false)} />}
        </div>
    );
}
