'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/lib/api';
import { format, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { ArrowLeft, Clock } from '@/components/icons';

export default function ExpiringPage() {
    const [days, setDays] = useState(30);

    const { data, isLoading } = useQuery({
        queryKey: ['dashboard-expiring-full', days],
        queryFn: async () => (await dashboardApi.getExpiring({ expiring_within_days: days })).data,
    });

    const contracts: Record<string, unknown>[] = data?.data ?? [];

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/dashboard">
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><ArrowLeft size={16} /></button>
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Clock size={20} color="var(--color-warning)" /> Expiring Contracts
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                        Contracts approaching their end date
                    </p>
                </div>
                {/* Days filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>Within</span>
                    {[7, 14, 30, 60, 90].map((d) => (
                        <button key={d} onClick={() => setDays(d)}
                            className={days === d ? 'btn btn-primary' : 'btn btn-ghost'}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}>
                            {d}d
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Contractor', 'Department', 'End Date', 'Days Left', 'Status'].map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {[140, 100, 90, 60, 70].map((w, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                            <div className="skeleton" style={{ height: 13, width: w }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : contracts.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No contracts expiring within {days} days 🎉
                                </td>
                            </tr>
                        ) : (
                            contracts.map((contract) => {
                                const contractor = contract.contractor_id as Record<string, unknown> | undefined;
                                const endDate = contract.end_date ? new Date(String(contract.end_date)) : null;
                                const daysLeft = endDate ? differenceInDays(endDate, new Date()) : null;
                                const urgency = daysLeft !== null
                                    ? daysLeft <= 7 ? 'var(--color-danger)'
                                        : daysLeft <= 14 ? 'var(--color-warning)'
                                            : 'var(--color-text-secondary)'
                                    : 'var(--color-text-muted)';

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
                                            {endDate ? format(endDate, 'MMM d, yyyy') : '—'}
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <span style={{ fontWeight: 600, fontSize: '0.875rem', color: urgency }}>
                                                {daysLeft !== null ? `${daysLeft}d` : '—'}
                                            </span>
                                        </td>
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <span className="badge badge-active">{String(contract.status ?? 'active')}</span>
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
