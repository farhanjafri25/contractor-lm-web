'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { accessApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { RotateCcw, CheckCheck } from 'lucide-react';

const STATUS_BADGE: Record<string, string> = {
    provisioned: 'badge-active',
    active: 'badge-active',
    pending: 'badge-pending',
    revoked: 'badge-expired',
    failed: 'badge-suspended',
};

const STATUSES = ['', 'active', 'pending', 'revoked', 'failed'];

export default function AccessPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'security';
    const qc = useQueryClient();

    const [statusFilter, setStatusFilter] = useState('');
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['access-all', statusFilter],
        queryFn: async () => {
            const params: Record<string, string> = {};
            if (statusFilter) params.status = statusFilter;
            return (await accessApi.list(params)).data;
        },
    });

    const records: Record<string, unknown>[] = data?.data ?? [];
    const total: number = data?.total ?? records.length;

    const handleRetry = async (id: string) => {
        setActionLoading(id);
        try {
            await accessApi.retryRevocation(id);
            qc.invalidateQueries({ queryKey: ['access-all'] });
        } catch { }
        setActionLoading(null);
    };

    const handleMarkResolved = async (id: string) => {
        setActionLoading(id);
        try {
            await accessApi.markResolved(id);
            qc.invalidateQueries({ queryKey: ['access-all'] });
        } catch { }
        setActionLoading(null);
    };

    // Count by status for summary pills
    const counts = records.reduce<Record<string, number>>((acc, r) => {
        const s = String(r.provisioning_status ?? r.status ?? '');
        acc[s] = (acc[s] ?? 0) + 1;
        return acc;
    }, {});

    const PILL_COLORS: Record<string, string> = {
        active: 'var(--color-success)',
        provisioned: 'var(--color-success)',
        pending: 'var(--color-info)',
        revoked: 'var(--color-text-muted)',
        failed: 'var(--color-danger)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Access Provisions</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        All application access records across contractors&nbsp;·&nbsp;
                        <span style={{ color: 'var(--color-text-muted)' }}>{total.toLocaleString()} total</span>
                    </p>
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    style={{ width: 160 }}
                >
                    {STATUSES.map((s) => (
                        <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All statuses'}</option>
                    ))}
                </select>
            </div>

            {/* Status summary pills */}
            {!isLoading && Object.keys(counts).length > 0 && (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {Object.entries(counts).map(([status, count]) => (
                        <button key={status} onClick={() => setStatusFilter(statusFilter === status ? '' : status)}
                            style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '0.35rem 0.75rem', borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer',
                                background: statusFilter === status ? 'var(--color-primary-muted)' : 'var(--color-surface-2)',
                                border: `1px solid ${statusFilter === status ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                color: statusFilter === status ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                            }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: PILL_COLORS[status] ?? 'var(--color-text-muted)' }} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                            <span style={{ opacity: 0.6 }}>{count}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Contractor', 'Application', 'Status', 'External Account', 'Granted By', isAdmin ? 'Actions' : ''].filter(Boolean).map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {Array.from({ length: isAdmin ? 6 : 5 }).map((_, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                            <div className="skeleton" style={{ height: 13, width: j === 0 ? '70%' : '50%' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : records.length === 0 ? (
                            <tr>
                                <td colSpan={isAdmin ? 6 : 5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No access records found
                                </td>
                            </tr>
                        ) : (
                            records.map((rec) => {
                                const contractor = rec.contractor_id as Record<string, unknown> | undefined;
                                const app = rec.tenant_application_id as Record<string, unknown> | undefined;
                                const grantedBy = rec.granted_by as Record<string, unknown> | undefined;
                                const status = String(rec.provisioning_status ?? rec.status ?? '');
                                const isFailed = status === 'failed';
                                const recId = String(rec._id);
                                const isActing = actionLoading === recId;

                                return (
                                    <tr key={recId}
                                        style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {/* Contractor */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{contractor ? String(contractor.name ?? '—') : '—'}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{contractor ? String(contractor.department ?? '') : ''}</div>
                                        </td>

                                        {/* Application */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                {app ? String(app.application_id ?? app.display_name ?? app.app_key ?? '—') : '—'}
                                            </div>
                                            {Boolean(rec.access_role) && (
                                                <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{String(rec.access_role)}</div>
                                            )}
                                        </td>

                                        {/* Status */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                <span className={`badge ${STATUS_BADGE[status] ?? 'badge-neutral'}`} style={{ width: 'fit-content' }}>
                                                    {status}
                                                </span>
                                                {Boolean(rec.failure_reason) && (
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', maxWidth: 160 }}>
                                                        {String(rec.failure_reason).slice(0, 60)}
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* External account */}
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                                            {rec.external_account_id ? String(rec.external_account_id) : <span style={{ color: 'var(--color-text-muted)', fontFamily: 'inherit' }}>—</span>}
                                        </td>

                                        {/* Granted by */}
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--color-text-secondary)' }}>
                                            {grantedBy ? String(grantedBy.email ?? '—') : 'System'}
                                        </td>

                                        {/* Actions (admin only) */}
                                        {isAdmin && (
                                            <td style={{ padding: '0.9rem 1.25rem' }}>
                                                {isFailed && (
                                                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', gap: 4 }}
                                                            onClick={() => handleRetry(recId)}
                                                            disabled={isActing}
                                                            title="Retry revocation"
                                                        >
                                                            <RotateCcw size={12} /> {isActing ? '…' : 'Retry'}
                                                        </button>
                                                        <button
                                                            className="btn btn-ghost"
                                                            style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem', gap: 4, color: 'var(--color-success)' }}
                                                            onClick={() => handleMarkResolved(recId)}
                                                            disabled={isActing}
                                                            title="Mark as manually resolved"
                                                        >
                                                            <CheckCheck size={12} /> Resolve
                                                        </button>
                                                    </div>
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
        </div>
    );
}
