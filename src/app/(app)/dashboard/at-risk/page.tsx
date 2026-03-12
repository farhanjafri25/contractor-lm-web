'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { format } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function AtRiskPage() {
    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-at-risk'],
        queryFn: async () => (await dashboardApi.getAtRisk()).data,
    });

    const suspended: Record<string, unknown>[] = data?.suspended_contracts?.data ?? [];
    const failed: Record<string, unknown>[] = data?.failed_revocations?.data ?? [];

    const totalCount = suspended.length + failed.length;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/dashboard">
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><ArrowLeft size={16} /></button>
                </Link>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <ShieldAlert size={20} color="var(--color-warning)" /> At-Risk Items
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                        Suspended contractors and failed revocations needing manual action
                    </p>
                </div>
            </div>

            {totalCount === 0 && !isLoading && (
                <div style={{ padding: '0.75rem 1rem', background: 'color-mix(in srgb, var(--color-success) 10%, transparent)', border: '1px solid color-mix(in srgb, var(--color-success) 30%, transparent)', borderRadius: 8, color: 'var(--color-success)', fontSize: '0.85rem' }}>
                    ✓ No at-risk items — all clear
                </div>
            )}

            {/* Suspended Contracts */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Suspended Contracts
                    </h2>
                    {suspended.length > 0 && (
                        <span className="badge badge-suspended">{suspended.length}</span>
                    )}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {['Contractor', 'Department', 'Suspended On', 'Reason', 'Status'].map((h) => (
                                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        {[140, 100, 100, 160, 80].map((w, j) => (
                                            <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                                <div className="skeleton" style={{ height: 13, width: w }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : suspended.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No suspended contracts
                                    </td>
                                </tr>
                            ) : (
                                suspended.map((contract) => {
                                    const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                                    const suspendedAt = contract.suspended_at ? new Date(String(contract.suspended_at)) : null;

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
                                            <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                {suspendedAt ? format(suspendedAt, 'MMM d, yyyy') : '—'}
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--color-text-muted)', maxWidth: 200 }}>
                                                {Boolean(contract.suspension_reason) ? String(contract.suspension_reason).slice(0, 80) : '—'}
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem' }}>
                                                <span className="badge badge-suspended">{String(contract.status ?? 'suspended')}</span>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Failed Revocations */}
            <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Failed Revocations
                    </h2>
                    {failed.length > 0 && (
                        <span className="badge badge-suspended">{failed.length}</span>
                    )}
                </div>
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                                {['Contractor', 'Application', 'Attempts', 'Failure Reason', 'Action'].map((h) => (
                                    <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                Array.from({ length: 2 }).map((_, i) => (
                                    <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        {[140, 100, 60, 180, 90].map((w, j) => (
                                            <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                                <div className="skeleton" style={{ height: 13, width: w }} />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : failed.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No failed revocations
                                    </td>
                                </tr>
                            ) : (
                                failed.map((rec) => {
                                    const contractor = rec.contractor_id as Record<string, unknown> | undefined;
                                    const app = rec.tenant_application_id as Record<string, unknown> | undefined;

                                    return (
                                        <tr key={String(rec._id)}
                                            style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.12s' }}
                                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
                                            <td style={{ padding: '0.9rem 1.25rem' }}>
                                                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{contractor ? String(contractor.name ?? '—') : '—'}</div>
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                                {app ? String(app.application_id ?? '—') : '—'}
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem', fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.875rem' }}>
                                                {String(rec.revocation_attempts ?? '—')}
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.78rem', color: 'var(--color-text-muted)', maxWidth: 220 }}>
                                                {Boolean(rec.failure_reason) ? String(rec.failure_reason).slice(0, 100) : '—'}
                                            </td>
                                            <td style={{ padding: '0.9rem 1.25rem' }}>
                                                <Link href="/access">
                                                    <button className="btn btn-ghost" style={{ fontSize: '0.75rem', padding: '0.3rem 0.65rem' }}>
                                                        Go to Access →
                                                    </button>
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
