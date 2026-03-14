'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import { authApi } from '@/lib/api';
import { Eye, EyeOff, CheckCircle } from 'lucide-react';
import Link from 'next/link';

function parseJwt(token: string) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

export default function SignupPage() {
    const router = useRouter();
    const { login } = useAuth(); // for auto-login after OTP success, though the backend does return tokens

    const [step, setStep] = useState<1 | 2 | 3>(1);
    
    // Step 1 Details
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);

    // Step 2 Details
    const [otp, setOtp] = useState('');

    // Step 3 Details
    const [successMessage, setSuccessMessage] = useState('');
    const [tenantName, setTenantName] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignup = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await authApi.signup(email.trim(), name.trim(), password);
            setStep(2);
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'An error occurred during sign up');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOtp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await authApi.verifyOtp(email.trim(), otp.trim());
            
            if (res.data.status === 'pending_approval') {
                // Auto-joined existing org, now pending
                setSuccessMessage(res.data.message);
                setTenantName(res.data.tenant_name);
                setStep(3);
            } else {
                // Created new org, returns auth tokens immediately
                localStorage.setItem('access_token', res.data.access_token);
                localStorage.setItem('refresh_token', res.data.refresh_token);
                localStorage.setItem('user', JSON.stringify(res.data.user));
                
                let tId = res.data.user?.tenant_id;
                if (!tId && res.data.access_token) {
                    const decoded = parseJwt(res.data.access_token);
                    if (decoded && decoded.tenant_id) {
                        tId = decoded.tenant_id;
                    }
                }

                if (tId) {
                    localStorage.setItem('tenant_id', tId);
                }
                
                // Force reload to pick up the new auth state properly
                window.location.href = '/dashboard';
            }
        } catch (err: unknown) {
            const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
            setError(typeof msg === 'string' ? msg : 'Invalid OTP code');
        } finally {
            setLoading(false);
        }
    };

    const resetFlow = () => {
        setStep(1);
        setOtp('');
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `
        radial-gradient(ellipse 60% 50% at 50% -10%, rgba(99,102,241,0.15) 0%, transparent 70%),
        var(--color-background)
      `,
        }}>
            <div style={{ width: '100%', maxWidth: 420, padding: '0 1.5rem' }}>
                <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
                    <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: '1rem',
                    }}>
                        <img src="/tenurio-logo-white.svg" alt="Tenurio Logo" style={{ height: 56, width: 'auto', display: 'block' }} />
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                        Create a workspace or join an existing one
                    </p>
                </div>

                <div className="card" style={{ borderRadius: 'var(--radius-xl)', padding: '2rem' }}>
                    
                    {error && (
                        <div style={{
                            padding: '0.75rem 1rem', background: 'var(--color-danger-muted)',
                            border: '1px solid color-mix(in srgb, var(--color-danger) 30%, transparent)',
                            borderRadius: 8, color: 'var(--color-danger)', fontSize: '0.85rem', marginBottom: '1rem',
                        }}>
                            {error}
                        </div>
                    )}

                    {step === 1 && (
                        <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                                    Full Name
                                </label>
                                <input
                                    required value={name} onChange={(e) => setName(e.target.value)}
                                    placeholder="Jane Doe"
                                />
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                                    Work Email
                                </label>
                                <input
                                    type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                    placeholder="jane@company.com"
                                />
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: 6 }}>
                                    Your email domain determines your workspace.
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500 }}>
                                    Password
                                </label>
                                <div style={{ position: 'relative' }}>
                                    <input
                                        type={showPw ? 'text' : 'password'}
                                        required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
                                        placeholder="••••••••" style={{ paddingRight: '2.5rem' }}
                                    />
                                    <button
                                        type="button" onClick={() => setShowPw(!showPw)}
                                        style={{
                                            position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', cursor: 'pointer',
                                            color: 'var(--color-text-muted)', padding: 0,
                                        }}
                                    >
                                        {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', height: 44, marginTop: 4, fontSize: '0.9rem' }}>
                                {loading ? 'Sending code…' : 'Continue'}
                            </button>
                        </form>
                    )}

                    {step === 2 && (
                        <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                                <p style={{ fontSize: '0.95rem', fontWeight: 500 }}>Verify your email</p>
                                <p style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginTop: 4 }}>
                                    We sent a 6-digit code to <strong>{email}</strong>
                                </p>
                            </div>

                            <div>
                                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--color-text-secondary)', marginBottom: 6, fontWeight: 500, textAlign: 'center' }}>
                                    Verification Code
                                </label>
                                <input
                                    type="text" required maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.25rem', height: 50 }}
                                />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={loading || otp.length !== 6} style={{ width: '100%', height: 44, marginTop: 4, fontSize: '0.9rem' }}>
                                {loading ? 'Verifying…' : 'Verify & Join'}
                            </button>

                            <button type="button" onClick={resetFlow} className="btn btn-ghost" style={{ width: '100%', fontSize: '0.85rem' }}>
                                Back to sign up
                            </button>
                        </form>
                    )}

                    {step === 3 && (
                        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
                            <div style={{
                                width: 64, height: 64, borderRadius: '50%', background: 'var(--color-success-muted)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-success)'
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <div>
                                <h2 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 8 }}>Success!</h2>
                                <p style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                                    {successMessage}
                                </p>
                            </div>
                            
                            <div style={{ 
                                background: 'color-mix(in srgb, var(--color-background) 60%, transparent)', 
                                padding: '1rem', borderRadius: 8, width: '100%', border: '1px solid var(--color-border)' 
                            }}>
                                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Workspace</p>
                                <p style={{ fontWeight: 500 }}>{tenantName}</p>
                            </div>

                            <Link href="/login" passHref style={{ width: '100%' }}>
                                <button className="btn btn-primary" style={{ width: '100%', height: 44 }}>
                                    Return to login
                                </button>
                            </Link>
                        </div>
                    )}
                </div>

                {step === 1 && (
                    <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '1.5rem' }}>
                        Already have an account? <Link href="/login" style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 500 }}>Sign in</Link>
                    </p>
                )}
            </div>
        </div>
    );
}
