'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { contractorsApi, tenantApi } from '@/lib/api';
import { ArrowLeft, Plus } from 'lucide-react';
import Link from 'next/link';

export default function NewContractorPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [form, setForm] = useState({
        name: '', email: '', phone: '', department: '', job_title: '', notes: '',
    });
    const [contract, setContract] = useState({
        sponsor_id: '', start_date: '', end_date: '', notes: '',
    });

    const { data: usersData } = useQuery({
        queryKey: ['team'],
        queryFn: async () => (await tenantApi.listUsers()).data,
    });

    const sponsors = usersData?.data?.filter((u: Record<string, unknown>) => u.role === 'sponsor' || u.role === 'admin') ?? [];

    const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));
    const setC = (key: string, val: string) => setContract((c) => ({ ...c, [key]: val }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await contractorsApi.create({
                ...form,
                contract: {
                    sponsor_id: contract.sponsor_id,
                    start_date: contract.start_date,
                    end_date: contract.end_date,
                    notes: contract.notes,
                    create_google_account: false,
                    application_access: [],
                },
            });
            router.push('/contractors');
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
            setError(Array.isArray(msg) ? msg.join(', ') : String(msg ?? 'Something went wrong'));
        } finally {
            setLoading(false);
        }
    };

    const DEPARTMENTS = ['Engineering', 'Design', 'Marketing', 'Sales', 'HR', 'Finance', 'Legal', 'Operations', 'Other'];

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <Link href="/contractors">
                    <button className="btn btn-ghost" style={{ padding: '0.4rem 0.6rem' }}><ArrowLeft size={16} /></button>
                </Link>
                <div>
                    <h1 style={{ fontSize: '1.4rem', fontWeight: 700, letterSpacing: '-0.5px' }}>New Contractor</h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>Create a contractor and their first contract</p>
                </div>
            </div>

            {error && (
                <div style={{ padding: '0.75rem 1rem', background: 'var(--color-danger-muted)', border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)', borderRadius: 8, color: 'var(--color-danger)', fontSize: '0.85rem' }}>
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {/* Identity section */}
                <div className="card">
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Identity</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Full Name *</label>
                            <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Jane Smith" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Work Email *</label>
                            <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="jane@vendor.com" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Phone</label>
                            <input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+1-555-0100" />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Department *</label>
                            <select required value={form.department} onChange={(e) => set('department', e.target.value)}>
                                <option value="">Select department</option>
                                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Job Title *</label>
                            <input required value={form.job_title} onChange={(e) => set('job_title', e.target.value)} placeholder="Senior Engineer" />
                        </div>
                    </div>
                </div>

                {/* Contract section */}
                <div className="card">
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '1.25rem', color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Contract</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Start Date *</label>
                            <input required type="date" value={contract.start_date} onChange={(e) => setC('start_date', e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>End Date *</label>
                            <input required type="date" value={contract.end_date} onChange={(e) => setC('end_date', e.target.value)} />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Sponsor *</label>
                            <select required value={contract.sponsor_id} onChange={(e) => setC('sponsor_id', e.target.value)}>
                                <option value="">Select sponsor</option>
                                {sponsors.map((s: Record<string, unknown>) => (
                                    <option key={String(s._id)} value={String(s._id)}>{String(s.email)} ({String(s.role)})</option>
                                ))}
                            </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>Notes</label>
                            <textarea value={contract.notes} onChange={(e) => setC('notes', e.target.value)} placeholder="Any additional context…" rows={3} style={{ resize: 'vertical' }} />
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                    <Link href="/contractors"><button type="button" className="btn btn-ghost">Cancel</button></Link>
                    <button type="submit" className="btn btn-primary" disabled={loading}>
                        <Plus size={15} /> {loading ? 'Creating…' : 'Create Contractor'}
                    </button>
                </div>
            </form>
        </div>
    );
}
