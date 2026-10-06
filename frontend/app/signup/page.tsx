'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';

const EMAIL_WITH_DOMAIN_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignupPage() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim();

    if (!EMAIL_WITH_DOMAIN_PATTERN.test(trimmedEmail)) {
      setError('Please enter a valid email address, like name@example.com.');
      return;
    }

    setLoading(true);

    try {
      await signup(username, trimmedEmail, password, firstName, lastName);
      router.push('/?signup=success');
    } catch (err: any) {
      setError(err.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 md:py-20">
      <div className="mx-auto max-w-md animate-rise-in">
        <div className="card glow-edge p-6 md:p-8">
          <div className="mb-7 text-center">
            <p className="eyebrow">Join the run</p>
            <h1 className="heading-1 mt-2">Sign Up</h1>
          </div>

          {error && <div className="alert alert-error mb-5">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="username" className="field-label">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="field-input"
              />
            </div>

            <div>
              <label htmlFor="email" className="field-label">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                pattern={EMAIL_WITH_DOMAIN_PATTERN.source}
                placeholder="you@example.com"
                title="Enter a valid email address, like you@example.com"
                className="field-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="field-label">
                  First Name *
                </label>
                <input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  className="field-input"
                />
              </div>

              <div>
                <label htmlFor="lastName" className="field-label">
                  Last Name *
                </label>
                <input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="field-label">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="field-input"
              />
              <p className="field-hint">At least 6 characters.</p>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-block btn-lg">
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500">
          Already have an account?{' '}
          <Link href="/login" className="link-accent">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
