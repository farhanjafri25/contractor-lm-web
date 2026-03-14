'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi } from '@/lib/api';
import { Plus, Search, Users } from '@/components/icons';
import Link from 'next/link';

const STATUS_BADGE: Record<string, string> = {
    active: 'badge-active',
    suspended: 'badge-suspended',
    terminated: 'badge-expired',
    expired: 'badge-expired',
};

export default function ContractorsPage() {
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['contractors', search, status],
        queryFn: async () =>
            (await contractorsApi.list({ search: search || undefined, status: status || undefined })).data,
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Contractors</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        {data?.pagination?.total ?? '…'} total
                    </p>
                </div>
                <Link href="/contractors/new">
                    <button className="btn btn-primary">
                        <Plus size={16} /> New Contractor
                    </button>
                </Link>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
                    <Search size={15} style={{
                        position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
                        color: 'var(--color-text-muted)',
                    }} />
                    <input
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{ paddingLeft: '2rem' }}
                    />
                </div>
                <select value={status} onChange={(e) => setStatus(e.target.value)} style={{ width: 160 }}>
                    <option value="">All statuses</option>
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="expired">Expired</option>
                    <option value="terminated">Terminated</option>
                </select>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Name', 'Department', 'Sponsor', 'Contract ends', 'Status', ''].map((h) => (
                                <th key={h} style={{
                                    padding: '0.875rem 1.25rem',
                                    textAlign: 'left', fontSize: '0.75rem',
                                    color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                            <div className="skeleton" style={{ height: 14, width: j === 0 ? '70%' : '50%' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data?.data?.length === 0 ? (
                            <tr>
                                <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    <Users size={36} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.3 }} />
                                    No contractors found
                                </td>
                            </tr>
                        ) : (
                            data?.data?.map((c: Record<string, unknown>) => {
                                const activeContract = (c.contracts as Record<string, unknown>[] | undefined)?.[0];
                                const sponsor = c.sponsor_id as Record<string, unknown> | undefined;
                                return (
                                    <tr key={String(c._id)} style={{ borderBottom: '1px solid var(--color-border)', transition: 'background 0.1s' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{String(c.name ?? '')}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{String(c.email ?? '')}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {String(c.department ?? '—')}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {sponsor ? String(sponsor.email ?? '—') : '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {activeContract?.end_date
                                                ? new Date(String(activeContract.end_date)).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span className={`badge ${STATUS_BADGE[String(activeContract?.status ?? '')] ?? 'badge-neutral'}`}>
                                                {String(activeContract?.status ?? 'no contract')}
                                            </span>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                                            <Link href={`/contractors/${String(c._id)}`}>
                                                <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                                                    View
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
    );
}
