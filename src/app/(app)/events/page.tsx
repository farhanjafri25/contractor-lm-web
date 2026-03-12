'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventsApi } from '@/lib/api';
import { formatDistanceToNow, format } from 'date-fns';

const EVENT_TYPE_MAP: Record<string, { label: string; color: string }> = {
    'contractor.created': { label: 'Contractor Created', color: 'var(--color-success)' },
    'contractor.updated': { label: 'Contractor Updated', color: 'var(--color-info)' },
    'contract.extended': { label: 'Contract Extended', color: 'var(--color-info)' },
    'contract.suspended': { label: 'Contract Suspended', color: 'var(--color-warning)' },
    'contract.reactivated': { label: 'Contract Reactivated', color: 'var(--color-success)' },
    'contract.expired': { label: 'Contract Expired', color: 'var(--color-danger)' },
    'contract.terminated': { label: 'Contract Terminated', color: 'var(--color-danger)' },
    'access.provisioned': { label: 'Access Provisioned', color: 'var(--color-success)' },
    'access.revoked': { label: 'Access Revoked', color: 'var(--color-danger)' },
    'sponsor.action.submitted': { label: 'Sponsor Request', color: 'var(--color-info)' },
    'sponsor.action.approved': { label: 'Request Approved', color: 'var(--color-success)' },
    'sponsor.action.rejected': { label: 'Request Rejected', color: 'var(--color-danger)' },
};

const CATEGORIES = ['', 'contractor', 'contract', 'access', 'sponsor'];

const PAGE_SIZE = 25;

export default function AuditLogPage() {
    const [eventType, setEventType] = useState('');
    const [category, setCategory] = useState('');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [page, setPage] = useState(1);

    const params: Record<string, unknown> = { page, limit: PAGE_SIZE };
    if (eventType) params.event_type = eventType;
    if (category) params.category = category;
    if (from) params.from = from;
    if (to) params.to = to;

    const { data, isLoading, isFetching } = useQuery({
        queryKey: ['events', params],
        queryFn: async () => (await eventsApi.list(params)).data,
        placeholderData: (prev) => prev,
    });

    const { data: statsData } = useQuery({
        queryKey: ['event-stats'],
        queryFn: async () => (await eventsApi.getStats()).data,
        staleTime: 60_000,
    });

    const events: Record<string, unknown>[] = data?.data ?? [];
    const total: number = data?.total ?? 0;
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const resetFilters = () => {
        setEventType(''); setCategory(''); setFrom(''); setTo(''); setPage(1);
    };

    const hasFilters = eventType || category || from || to;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Audit Log</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                        Immutable record of all platform events&nbsp;·&nbsp;
                        <span style={{ color: 'var(--color-text-muted)' }}>{total.toLocaleString()} total</span>
                    </p>
                </div>
                {hasFilters && (
                    <button className="btn btn-ghost" onClick={resetFilters} style={{ fontSize: '0.8rem' }}>
                        Clear filters
                    </button>
                )}
            </div>

            {/* Stats pills */}
            {statsData?.by_type && (
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                    {Object.entries(statsData.by_type as Record<string, number>)
                        .sort(([, a], [, b]) => b - a)
                        .slice(0, 8)
                        .map(([type, count]) => {
                            const meta = EVENT_TYPE_MAP[type];
                            return (
                                <button key={type} onClick={() => { setEventType(eventType === type ? '' : type); setPage(1); }}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 6, padding: '0.35rem 0.75rem',
                                        borderRadius: 999, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.15s',
                                        background: eventType === type ? 'var(--color-primary-muted)' : 'var(--color-surface-2)',
                                        border: `1px solid ${eventType === type ? 'var(--color-primary)' : 'var(--color-border)'}`,
                                        color: eventType === type ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                                    }}>
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta?.color ?? 'var(--color-text-muted)', flexShrink: 0 }} />
                                    {meta?.label ?? type.replace(/\./g, ' ')}
                                    <span style={{ opacity: 0.6 }}>{count}</span>
                                </button>
                            );
                        })}
                </div>
            )}

            {/* Filter bar */}
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ width: 160 }}>
                    <option value="">All categories</option>
                    {CATEGORIES.filter(Boolean).map((c) => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                </select>

                <select value={eventType} onChange={(e) => { setEventType(e.target.value); setPage(1); }} style={{ width: 220 }}>
                    <option value="">All event types</option>
                    {Object.entries(EVENT_TYPE_MAP).map(([v, m]) => <option key={v} value={v}>{m.label}</option>)}
                </select>

                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} style={{ width: 155 }} placeholder="From" />
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>→</span>
                    <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} style={{ width: 155 }} placeholder="To" />
                </div>
            </div>

            {/* Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden', opacity: isFetching ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Event', 'Contractor', 'Actor', 'Timestamp'].map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.72rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {[140, 110, 120, 90].map((w, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}>
                                            <div className="skeleton" style={{ height: 12, width: w }} />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : events.length === 0 ? (
                            <tr>
                                <td colSpan={4} style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                    No events match the current filters
                                </td>
                            </tr>
                        ) : (
                            events.map((ev) => {
                                const type = String(ev.event_type ?? '');
                                const meta = EVENT_TYPE_MAP[type];
                                const contractor = ev.contractor_id as Record<string, unknown> | undefined;
                                const actor = ev.actor_id as Record<string, unknown> | undefined;
                                const createdAt = ev.created_at ? new Date(String(ev.created_at)) : null;

                                return (
                                    <tr key={String(ev._id)} style={{
                                        borderBottom: '1px solid var(--color-border)',
                                        transition: 'background 0.12s',
                                    }}
                                        onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-surface-2)')}
                                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                                    >
                                        {/* Event type */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: meta?.color ?? 'var(--color-text-muted)', flexShrink: 0 }} />
                                                <div>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{meta?.label ?? type.replace(/\./g, ' › ')}</div>
                                                    {ev.metadata && typeof ev.metadata === 'object' && Object.keys(ev.metadata as object).length > 0 && (
                                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                                            {Object.entries(ev.metadata as Record<string, unknown>)
                                                                .slice(0, 2)
                                                                .map(([k, v]) => `${k}: ${v}`)
                                                                .join(' · ')}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contractor */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            {contractor ? (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem' }}>{String(contractor.name ?? '—')}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>{String(contractor.department ?? '')}</div>
                                                </div>
                                            ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>—</span>}
                                        </td>

                                        {/* Actor */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            {actor ? (
                                                <div>
                                                    <div style={{ fontSize: '0.85rem' }}>{String(actor.email ?? '—')}</div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{String(actor.role ?? '')}</div>
                                                </div>
                                            ) : <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>System</span>}
                                        </td>

                                        {/* Timestamp */}
                                        <td style={{ padding: '0.9rem 1.25rem' }}>
                                            {createdAt ? (
                                                <div>
                                                    <div style={{ fontSize: '0.82rem' }}>{formatDistanceToNow(createdAt, { addSuffix: true })}</div>
                                                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                                                        {format(createdAt, 'MMM d, yyyy · HH:mm')}
                                                    </div>
                                                </div>
                                            ) : '—'}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                        Page {page} of {totalPages} · {total.toLocaleString()} events
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                            disabled={page === 1} onClick={() => setPage(page - 1)}>← Prev</button>
                        <button className="btn btn-ghost" style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }}
                            disabled={page === totalPages} onClick={() => setPage(page + 1)}>Next →</button>
                    </div>
                </div>
            )}
        </div>
    );
}
