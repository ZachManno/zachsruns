'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await authApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="container mx-auto px-4 py-12 md:py-20">
        <div className="mx-auto max-w-md animate-rise-in">
          <div className="card glow-edge p-6 md:p-8">
            <div className="mb-6 text-center">
              <p className="eyebrow">Almost there</p>
              <h1 className="heading-1 mt-2">Check Your Email</h1>
            </div>

            <div className="alert alert-success mb-5 text-center">
              If an account with that email exists, we&apos;ve sent a password reset link.
            </div>

            <p className="mb-6 text-center text-sm text-zinc-500">
              The link will expire in 15 minutes. Check your spam folder if you don&apos;t see it.
            </p>

            <Link href="/login" className="btn btn-primary btn-block btn-lg">
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md animate-rise-in">
        <div className="card glow-edge p-6 md:p-8">
          <div className="mb-6 text-center">
            <p className="eyebrow">Account recovery</p>
            <h1 className="heading-1 mt-2">Forgot Password</h1>
          </div>

          <p className="mb-6 text-center text-sm leading-relaxed text-zinc-400">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>

          {error && <div className="alert alert-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="field-label">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="field-input"
              />
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Remember your password?{' '}
          <Link href="/login" className="link-accent">
            Back to Login
          </Link>
        </p>
      </div>
    </div>
  );
}
