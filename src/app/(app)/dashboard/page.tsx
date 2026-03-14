'use client';

import { useQuery } from '@tanstack/react-query';
import { dashboardApi, eventsApi } from '@/lib/api';
import {
    Users, AlertTriangle, Clock, ShieldOff, TrendingUp, RefreshCw,
} from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';

function StatCard({
    label, value, icon: Icon, color, sub,
}: { label: string; value: number | string; icon: React.ElementType; color: string; sub?: string }) {
    return (
        <div className="card card-hover" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>{label}</span>
                <div style={{
                    padding: 7, borderRadius: 8,
                    background: `color-mix(in srgb, ${color} 12%, transparent)`,
                    color,
                }}>
                    <Icon size={15} />
                </div>
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700, letterSpacing: '-1px', color: 'var(--color-text-primary)' }}>
                {value}
            </div>
            {sub && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{sub}</div>}
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="skeleton" style={{ height: 14, width: '60%' }} />
            <div className="skeleton" style={{ height: 36, width: '40%' }} />
            <div className="skeleton" style={{ height: 12, width: '80%' }} />
        </div>
    );
}

export default function DashboardPage() {
    const { data: summary, isLoading: summaryLoading } = useQuery({
        queryKey: ['dashboard-summary'],
        queryFn: async () => (await dashboardApi.getSummary()).data,
    });

    const { data: expiring, isLoading: expiringLoading } = useQuery({
        queryKey: ['dashboard-expiring'],
        queryFn: async () => (await dashboardApi.getExpiring({ limit: 5 })).data,
    });

    const { data: events } = useQuery({
        queryKey: ['events-recent'],
        queryFn: async () => (await eventsApi.list({ limit: 6 })).data,
    });

    const { data: atRisk } = useQuery({
        queryKey: ['dashboard-at-risk'],
        queryFn: async () => (await dashboardApi.getAtRisk({ limit: 5 })).data,
    });

    const EVENT_COLORS: Record<string, string> = {
        'contractor.created': 'var(--color-success)',
        'contract.suspended': 'var(--color-warning)',
        'contract.expired': 'var(--color-danger)',
        'contract.terminated': 'var(--color-danger)',
        'access.revoked': 'var(--color-info)',
        default: 'var(--color-text-muted)',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Dashboard</h1>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>
                    Contractor lifecycle overview
                </p>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                {summaryLoading ? (
                    Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                ) : summary ? (
                    <>
                        <StatCard label="Active Contractors" value={summary.active_contractors} icon={Users} color="var(--color-success)" sub="Currently active" />
                        <StatCard label="Suspended" value={summary.suspended_contractors} icon={AlertTriangle} color="var(--color-warning)" sub="On hold" />
                        <StatCard label="Expiring Soon" value={summary.expiring_soon} icon={Clock} color="var(--color-warning)" sub={`within ${summary.expiring_within_days} days`} />
                        <StatCard label="Overdue Access" value={summary.overdue_access} icon={ShieldOff} color="var(--color-danger)" sub="Security gap" />
                        <StatCard label="Failed Revocations" value={summary.failed_revocations} icon={RefreshCw} color="var(--color-danger)" sub="Needs attention" />
                        <StatCard label="Total Active" value={summary.active_contractors + summary.suspended_contractors} icon={TrendingUp} color="var(--color-primary)" sub="All engaged" />
                    </>
                ) : null}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Expiring contracts */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Expiring Soon</h2>
                        <a href="/dashboard/expiring" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>View all</a>
                    </div>
                    {expiringLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} style={{ marginBottom: 12 }}>
                                <div className="skeleton" style={{ height: 12, width: '70%', marginBottom: 6 }} />
                                <div className="skeleton" style={{ height: 10, width: '40%' }} />
                            </div>
                        ))
                    ) : expiring?.data?.length === 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No contracts expiring soon 🎉</p>
                    ) : (
                        expiring?.data?.map((item: Record<string, unknown>) => {
                            const contractor = item.contractor_id as Record<string, unknown> | undefined;
                            return (
                                <div key={String(item._id)} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '0.625rem 0',
                                    borderBottom: '1px solid var(--color-border)',
                                }}>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                                            {contractor ? String(contractor.name ?? '') : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {contractor ? String(contractor.department ?? '') : ''}
                                        </div>
                                    </div>
                                    <span className="badge badge-warning" style={{ fontSize: '0.7rem' }}>
                                        {item.end_date ? new Date(String(item.end_date)).toLocaleDateString() : '—'}
                                    </span>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Recent events */}
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                        <h2 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Recent Activity</h2>
                        <a href="/events" style={{ fontSize: '0.8rem', color: 'var(--color-primary)', textDecoration: 'none' }}>Audit log</a>
                    </div>
                    {events?.data?.map((ev: Record<string, unknown>) => {
                        const color = EVENT_COLORS[String(ev.event_type)] ?? EVENT_COLORS.default;
                        const contractor = ev.contractor_id as Record<string, unknown> | undefined;
                        return (
                            <div key={String(ev._id)} style={{
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                                padding: '0.5rem 0',
                                borderBottom: '1px solid var(--color-border)',
                            }}>
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%',
                                    background: color, marginTop: 5, flexShrink: 0,
                                }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                        {String(ev.event_type ?? '').replace(/\./g, ' › ')}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)' }}>
                                        {contractor ? String(contractor.name ?? '') : ''}{' '}
                                        · {ev.created_at ? formatDistanceToNow(new Date(String(ev.created_at)), { addSuffix: true }) : ''}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {!events?.data?.length && (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>No events yet</p>
                    )}
                </div>
            </div>

            {/* At-risk section */}
            {atRisk?.data?.length > 0 && (
                <div className="card" style={{ border: '1px solid color-mix(in srgb, var(--color-danger) 25%, transparent)' }}>
                    <h2 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--color-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <AlertTriangle size={16} /> At-Risk Contractors
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' }}>
                        {atRisk.data.map((item: Record<string, unknown>) => {
                            const contractor = item.contractor_id as Record<string, unknown> | undefined;
                            return (
                                <a key={String(item._id)} href={`/contractors/${contractor ? String(contractor._id ?? '') : ''}`} style={{ textDecoration: 'none' }}>
                                    <div className="card card-hover" style={{ padding: '0.875rem', background: 'var(--color-surface-2)' }}>
                                        <div style={{ fontWeight: 500, fontSize: '0.875rem', marginBottom: 4 }}>
                                            {contractor ? String(contractor.name ?? '') : '—'}
                                        </div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                                            {contractor ? String(contractor.department ?? '') : ''}
                                        </div>
                                        <span className={`badge badge-${String(item.status)}`} style={{ marginTop: 8, fontSize: '0.7rem' }}>
                                            {String(item.status ?? '')}
                                        </span>
                                    </div>
                                </a>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
