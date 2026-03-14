'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { format, formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from '@/components/icons';

export default function OverduePage() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-overdue'],
        queryFn: async () => (await dashboardApi.getOverdue()).data,
    });

    const contracts: Record<string, unknown>[] = data?.data ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/dashboard">
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><ArrowLeft size={16} /></button>
                </Link>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <AlertTriangle size={20} color="var(--color-danger)" /> Overdue Access
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                        Expired contracts that still have un-revoked application access — needs immediate action
                    </p>
                </div>
            </div>

            {contracts.length > 0 && (
                <div style={{ padding: '0.75rem 1rem', background: 'color-mix(in srgb, var(--color-danger) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', borderRadius: 8, color: 'var(--color-danger)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={14} />
                    {contracts.length} contract{contracts.length !== 1 ? 's have' : ' has'} expired but access has not been fully revoked. Review and remediate immediately.
                </div>
            )}

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Contractor', 'Department', 'Expired', 'Access Records', 'Status'].map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {[140, 100, 100, 70, 80].map((w, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                            <div className="skeleton" style={{ height: 13, width: w }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : contracts.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No overdue access found ✓
                                </td>
                            </tr>
                        ) : (
                            contracts.map((contract) => {
                                const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                                const endDate = contract.end_date ? new Date(String(contract.end_date)) : null;
                                const accessCount = contract.active_access_count ?? contract.access_count ?? '—';

                                return (
                                    <tr key={String(contract._id)}
                                        style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s', cursor: 'pointer' }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                        onClick={() => contractor && (window.location.href = `/contractors/${String(contractor._id ?? '')}`)}>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{contractor ? String(contractor.name ?? '—') : '—'}</div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{contractor ? String(contractor.job_title ?? '') : ''}</div>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {contractor ? String(contractor.department ?? '—') : '—'}
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ fontSize: '0.875rem', color: 'var(--color-danger)', fontWeight: 500 }}>
                                                {endDate ? formatDistanceToNow(endDate, { addSuffix: true }) : '—'}
                                            </div>
                                            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                                {endDate ? format(endDate, 'MMM d, yyyy') : ''}
                                            </div>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <span style={{ fontWeight: 600, color: 'var(--color-danger)' }}>{String(accessCount)}</span>
                                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginLeft: 4 }}>active</span>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <span className="badge badge-expired">{String(contract.status ?? 'expired')}</span>
                                        </td>
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
