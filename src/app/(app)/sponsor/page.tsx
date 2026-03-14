'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { sponsorApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { CheckCircle, XCircle, Clock } from '@/components/icons';
import { formatDistanceToNow } from 'date-fns';

const STATUS_BADGE: Record<string, string> = {
    pending: 'badge-pending',
    approved: 'badge-active',
    rejected: 'badge-expired',
};

function ReviewModal({ id, onClose }: { id: string; onClose: () => void }) {
    const [decision, setDecision] = useState<'approved' | 'rejected'>('approved');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const qc = useQueryClient();

    const submit = async () => {
        setLoading(true); setError('');
        try {
            await sponsorApi.review(id, decision, note || undefined);
            qc.invalidateQueries({ queryKey: ['sponsor-actions'] });
            onClose();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setLoading(false); }
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="card" style={{ width: '100%', maxWidth: 420, borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
                <h3 style={{ fontWeight: 600, marginBottom: '1.25rem' }}>Review Request</h3>
                {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{error}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        {(['approved', 'rejected'] as const).map((d) => (
                            <button key={d} onClick={() => setDecision(d)}
                                style={{
                                    flex: 1, padding: '0.6rem', borderRadius: 8, cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500, border: '2px solid',
                                    borderColor: decision === d ? (d === 'approved' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-border)',
                                    background: decision === d ? (d === 'approved' ? 'var(--color-success-muted)' : 'var(--color-danger-muted)') : 'transparent',
                                    color: decision === d ? (d === 'approved' ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--color-text-secondary)',
                                    textTransform: 'capitalize',
                                }}>
                                {d === 'approved' ? '✓ Approve' : '✕ Reject'}
                            </button>
                        ))}
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Note (optional)</label>
                        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Reason for your decision…" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                        <button className={`btn ${decision === 'approved' ? 'btn-primary' : 'btn-danger'}`} onClick={submit} disabled={loading}>
                            {loading ? 'Submitting…' : `${decision === 'approved' ? 'Approve' : 'Reject'} Request`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function SponsorPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'security';
    const [reviewingId, setReviewingId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState('');

    const { data, isLoading } = useQuery({
        queryKey: ['sponsor-actions', statusFilter],
        queryFn: async () => (await sponsorApi.list({ status: statusFilter || undefined })).data,
    });

    const STATUS_ICON = {
        pending: <Clock size={13} style={{ color: 'var(--color-info)' }} />,
        approved: <CheckCircle size={13} style={{ color: 'var(--color-success)' }} />,
        rejected: <XCircle size={13} style={{ color: 'var(--color-danger)' }} />,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Sponsor Requests</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 4 }}>Extension and change requests from sponsors</p>
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ width: 160 }}>
                    <option value="">All statuses</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                </select>
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--color-border)' }}>
                            {['Contractor', 'Request Type', 'Submitted by', 'Date', 'Status', isAdmin ? 'Action' : ''].map((h) => (
                                <th key={h} style={{ padding: '0.875rem 1.25rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                    {Array.from({ length: 6 }).map((_, j) => (
                                        <td key={j} style={{ padding: '1rem 1.25rem' }}><div className="skeleton" style={{ height: 13, width: j === 0 ? '70%' : '50%' }} /></td>
                                    ))}
                                </tr>
                            ))
                        ) : data?.data?.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>No requests found</td></tr>
                        ) : (
                            data?.data?.map((req: Record<string, unknown>) => {
                                const contract = req.contract_id as Record<string, unknown> | undefined;
                                const contractor = contract?.contractor_id as Record<string, unknown> | undefined;
                                const submitter = req.sponsor_id as Record<string, unknown> | undefined;
                                const status = String(req.status ?? 'pending');
                                const reqDate = req.createdAt || req.created_at;
                                return (
                                    <tr key={String(req._id)} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{contractor ? String(contractor.name ?? '') : '—'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{contractor ? String(contractor.department ?? '') : ''}</div>
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                                            {String(req.action_type ?? '').replace(/_/g, ' ')}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {submitter ? String(submitter.email ?? '—') : '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                            {reqDate ? formatDistanceToNow(new Date(String(reqDate)), { addSuffix: true }) : '—'}
                                        </td>
                                        <td style={{ padding: '1rem 1.25rem' }}>
                                            <span className={`badge ${STATUS_BADGE[status] ?? 'badge-neutral'}`} style={{ gap: 4 }}>
                                                {STATUS_ICON[status as keyof typeof STATUS_ICON]}
                                                {status}
                                            </span>
                                        </td>
                                        {isAdmin && (
                                            <td style={{ padding: '1rem 1.25rem' }}>
                                                {status === 'pending' && (
                                                    <button className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }} onClick={() => setReviewingId(String(req._id))}>
                                                        Review
                                                    </button>
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

            {reviewingId && <ReviewModal id={reviewingId} onClose={() => setReviewingId(null)} />}
        </div>
    );
}
