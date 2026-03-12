'use client';

import { use, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { contractorsApi, contractsApi, eventsApi, accessApi } from '@/lib/api';
import { useAuth } from '@/context/auth-context';
import { ArrowLeft, AlertTriangle, RotateCcw, X, Calendar, ShieldOff } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

const SUSPEND_REASONS = [
    { value: 'compliance', label: 'Compliance Issue' },
    { value: 'performance', label: 'Performance' },
    { value: 'security', label: 'Security Concern' },
    { value: 'other', label: 'Other' },
];

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem',
        }} onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="card" style={{ width: '100%', maxWidth: 440, borderRadius: 'var(--radius-xl)', padding: '1.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                    <h3 style={{ fontWeight: 600, fontSize: '1rem' }}>{title}</h3>
                    <button className="btn btn-ghost" style={{ padding: '0.3rem' }} onClick={onClose}><X size={16} /></button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default function ContractorDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const { user } = useAuth();
    const qc = useQueryClient();
    const isAdmin = user?.role === 'admin' || user?.role === 'security';

    const [modal, setModal] = useState<'suspend' | 'reactivate' | 'extend' | 'terminate' | null>(null);
    const [suspendReason, setSuspendReason] = useState<string>('security');
    const [suspendNote, setSuspendNote] = useState('');
    const [reactivateNote, setReactivateNote] = useState('');
    const [extendDate, setExtendDate] = useState('');
    const [extendNote, setExtendNote] = useState('');
    const [actionLoading, setActionLoading] = useState(false);
    const [actionError, setActionError] = useState('');

    const { data: contractor, isLoading } = useQuery({
        queryKey: ['contractor', id],
        queryFn: async () => (await contractorsApi.get(id)).data,
    });

    const { data: timeline } = useQuery({
        queryKey: ['timeline', id],
        queryFn: async () => (await eventsApi.getContractorTimeline(id)).data,
    });

    const activeContract = contractor?.contracts?.[0];
    const contractorId = contractor?._id;
    const contractId = activeContract?._id;

    const { data: accessData } = useQuery({
        queryKey: ['access', contractId],
        queryFn: async () => contractId ? (await accessApi.getByContract(contractId)).data : null,
        enabled: !!contractId,
    });

    const invalidate = () => {
        qc.invalidateQueries({ queryKey: ['contractor', id] });
        qc.invalidateQueries({ queryKey: ['timeline', id] });
    };

    const doSuspend = async () => {
        setActionLoading(true); setActionError('');
        try {
            await contractsApi.suspend(contractorId, contractId, suspendReason, suspendNote || undefined);
            setModal(null); invalidate();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setActionError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setActionLoading(false); }
    };

    const doReactivate = async () => {
        setActionLoading(true); setActionError('');
        try {
            await contractsApi.reactivate(contractorId, contractId, reactivateNote || undefined);
            setModal(null); invalidate();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setActionError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setActionLoading(false); }
    };

    const doExtend = async () => {
        setActionLoading(true); setActionError('');
        try {
            await contractsApi.extend(contractorId, contractId, extendDate, extendNote || undefined);
            setModal(null); invalidate();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setActionError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setActionLoading(false); }
    };

    const doTerminate = async () => {
        setActionLoading(true); setActionError('');
        try {
            await contractsApi.terminate(contractorId, contractId);
            setModal(null); invalidate();
        } catch (e: unknown) {
            const msg = (e as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setActionError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Failed'));
        } finally { setActionLoading(false); }
    };

    const STATUS_BADGE: Record<string, string> = {
        active: 'badge-active', suspended: 'badge-suspended',
        terminated: 'badge-expired', expired: 'badge-expired',
    };

    const EVENT_COLORS: Record<string, string> = {
        'contractor.created': 'var(--color-success)',
        'contract.suspended': 'var(--color-warning)',
        'contract.reactivated': 'var(--color-success)',
        'contract.extended': 'var(--color-info)',
        'contract.expired': 'var(--color-danger)',
        'contract.terminated': 'var(--color-danger)',
        'access.revoked': 'var(--color-info)',
    };

    if (isLoading) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: i === 1 ? 80 : 160 }} />)}
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 860, margin: '0 auto' }}>
            {/* Back + header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/contractors">
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><ArrowLeft size={16} /></button>
                </Link>
                <div style={{ flex: 1 }}>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>{contractor?.name}</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginTop: 2 }}>
                        {contractor?.job_title} · {contractor?.department}
                    </p>
                </div>
                {activeContract && (
                    <span className={`badge ${STATUS_BADGE[activeContract.status] ?? 'badge-neutral'}`} style={{ fontSize: '0.8rem', padding: '0.3rem 0.9rem' }}>
                        {activeContract.status}
                    </span>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Identity card */}
                    <div className="card">
                        <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Identity</h2>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                            {[
                                ['Email', contractor?.email],
                                ['Phone', contractor?.phone || '—'],
                                ['Department', contractor?.department],
                                ['Job Title', contractor?.job_title],
                            ].map(([label, val]) => (
                                <div key={label}>
                                    <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
                                    <div style={{ fontSize: '0.875rem' }}>{val}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Active contract */}
                    {activeContract && (
                        <div className="card">
                            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Active Contract</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                                {[
                                    ['Start', new Date(activeContract.start_date).toLocaleDateString()],
                                    ['End', new Date(activeContract.end_date).toLocaleDateString()],
                                    ['Status', activeContract.status],
                                    ['Created', new Date(activeContract.createdAt || activeContract.created_at).toLocaleDateString()],
                                ].map(([label, val]) => (
                                    <div key={label}>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginBottom: 2 }}>{label}</div>
                                        <div style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}>{val}</div>
                                    </div>
                                ))}
                            </div>

                            {/* Contract actions */}
                            {isAdmin && (
                                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                                    {activeContract.status === 'active' && (
                                        <>
                                            <button className="btn btn-ghost" onClick={() => { setActionError(''); setModal('suspend'); }} style={{ fontSize: '0.8rem' }}>
                                                <AlertTriangle size={14} /> Suspend
                                            </button>
                                            <button className="btn btn-ghost" onClick={() => { setActionError(''); setModal('extend'); }} style={{ fontSize: '0.8rem' }}>
                                                <Calendar size={14} /> Extend
                                            </button>
                                            <button className="btn btn-danger" onClick={() => { setActionError(''); setModal('terminate'); }} style={{ fontSize: '0.8rem' }}>
                                                <X size={14} /> Terminate
                                            </button>
                                        </>
                                    )}
                                    {activeContract.status === 'suspended' && (
                                        <button className="btn btn-primary" onClick={() => { setActionError(''); setModal('reactivate'); }} style={{ fontSize: '0.8rem' }}>
                                            <RotateCcw size={14} /> Reactivate
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Access provisions */}
                    {accessData?.length > 0 && (
                        <div className="card">
                            <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>
                                <ShieldOff size={13} style={{ display: 'inline', marginRight: 6 }} />App Access
                            </h2>
                            {accessData.map((a: Record<string, unknown>) => {
                                const app = a.tenant_application_id as Record<string, unknown> | undefined;
                                return (
                                    <div key={String(a._id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.625rem 0', borderBottom: '1px solid var(--color-border)' }}>
                                        <div style={{ fontSize: '0.875rem' }}>{app ? String(app.display_name ?? app.app_key ?? '') : '—'}</div>
                                        <span className={`badge ${String(a.status) === 'provisioned' ? 'badge-active' : String(a.status) === 'revoked' ? 'badge-expired' : 'badge-pending'}`} style={{ fontSize: '0.7rem' }}>
                                            {String(a.status)}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Timeline */}
                <div className="card" style={{ padding: '1.25rem' }}>
                    <h2 style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '1rem' }}>Timeline</h2>
                    {timeline?.data?.length === 0 && <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No events yet</p>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                        {timeline?.data?.map((ev: Record<string, unknown>, i: number) => {
                            const color = EVENT_COLORS[String(ev.event_type)] ?? 'var(--color-text-muted)';
                            const actor = ev.actor_id as Record<string, unknown> | undefined;
                            const isLast = i === (timeline.data.length - 1);
                            return (
                                <div key={String(ev._id)} style={{ display: 'flex', gap: 10, position: 'relative' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 4, zIndex: 1 }} />
                                        {!isLast && <div style={{ width: 1, flex: 1, background: 'var(--color-border)', minHeight: 24 }} />}
                                    </div>
                                    <div style={{ paddingBottom: isLast ? 0 : '1rem', flex: 1 }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>
                                            {String(ev.event_type ?? '').replace(/\./g, ' › ')}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                            {actor ? String(actor.email ?? '') : ''}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: 1 }}>
                                            {ev.created_at ? formatDistanceToNow(new Date(String(ev.created_at)), { addSuffix: true }) : ''}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {modal === 'suspend' && (
                <Modal title="Suspend Contract" onClose={() => setModal(null)}>
                    {actionError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{actionError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Reason *</label>
                            <select value={suspendReason} onChange={(e) => setSuspendReason(e.target.value)}>
                                {SUSPEND_REASONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Note (optional)</label>
                            <textarea value={suspendNote} onChange={(e) => setSuspendNote(e.target.value)} rows={3} placeholder="Additional context…" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-danger" onClick={doSuspend} disabled={actionLoading}>{actionLoading ? 'Suspending…' : 'Suspend'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal === 'reactivate' && (
                <Modal title="Reactivate Contract" onClose={() => setModal(null)}>
                    {actionError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{actionError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Note (optional)</label>
                            <textarea value={reactivateNote} onChange={(e) => setReactivateNote(e.target.value)} rows={3} placeholder="Reason for reactivation…" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={doReactivate} disabled={actionLoading}>{actionLoading ? 'Reactivating…' : 'Reactivate'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal === 'extend' && (
                <Modal title="Extend Contract" onClose={() => setModal(null)}>
                    {actionError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{actionError}</div>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>New End Date *</label>
                            <input type="date" value={extendDate} onChange={(e) => setExtendDate(e.target.value)} required />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6 }}>Note (optional)</label>
                            <textarea value={extendNote} onChange={(e) => setExtendNote(e.target.value)} rows={2} placeholder="Reason for extension…" />
                        </div>
                        <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                            <button className="btn btn-primary" onClick={doExtend} disabled={actionLoading || !extendDate}>{actionLoading ? 'Extending…' : 'Extend'}</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal === 'terminate' && (
                <Modal title="Terminate Contract" onClose={() => setModal(null)}>
                    {actionError && <div style={{ color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{actionError}</div>}
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: '1.25rem' }}>
                        This will permanently terminate the contract and trigger access revocation. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem', justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancel</button>
                        <button className="btn btn-danger" onClick={doTerminate} disabled={actionLoading}>{actionLoading ? 'Terminating…' : 'Terminate Contract'}</button>
                    </div>
                </Modal>
            )}
        </div>
    );
}
