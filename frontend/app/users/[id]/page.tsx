'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import Link from 'next/link';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.id as string;

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser, authLoading, userId, router]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getUserProfile(userId);
      setUser(data.user);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError(err.message || 'Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="page">
        <div className="mx-auto max-w-4xl">
          <div className="card card-pad text-center">
            <p className="mb-4 text-red-300">{error || 'User not found'}</p>
            <Link href="/community" className="link-accent">
              ← Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.username;

  const initials = (user.first_name?.[0] || user.username[0] || '?').toUpperCase();

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <Link
            href="/community"
            className="text-sm text-zinc-500 transition-colors hover:text-ember-400"
          >
            ← Back to Community
          </Link>
        </div>

        <div className="card glow-edge card-pad mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ember-gradient font-display text-2xl font-extrabold text-white shadow-glow-sm">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <h1 className="heading-1">{displayName}</h1>
              <p className="mt-1 text-sm text-zinc-500">@{user.username}</p>
              <div className="mt-3 space-y-1 text-sm text-zinc-400">
                <p>{user.email}</p>
                {user.badge === 'plus_one' && user.referrer && (
                  <p>
                    Referred by{' '}
                    <span className="font-semibold text-zinc-200">
                      {user.referrer.first_name && user.referrer.last_name
                        ? `${user.referrer.first_name} ${user.referrer.last_name}`
                        : user.referrer.username}
                    </span>
                  </p>
                )}
                <p className="text-zinc-500">
                  Member since{' '}
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>
            </div>
            {user.badge && (
              <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-court-700 bg-court-900/70 px-3 py-2 sm:self-center">
                <BadgeIcon badge={user.badge} size="large" />
                <span className="font-display text-sm font-bold text-white">
                  {user.badge === 'regular' ? 'Regular' : user.badge === 'plus_one' ? '+1' : ''}
                </span>
              </div>
            )}
          </div>

          {user.runs_attended_count !== undefined && (
            <div className="mt-6 border-t border-court-800 pt-6">
              <h2 className="heading-3 mb-3">Run Statistics</h2>
              <div className="grid grid-cols-2 gap-3 md:gap-4">
                <div className="stat-tile">
                  <p className="stat-label">Runs Attended</p>
                  <p className="stat-value mt-1 text-ember-400">{user.runs_attended_count || 0}</p>
                </div>
                <div className="stat-tile">
                  <p className="stat-label">Attendance Rate</p>
                  <p className="stat-value mt-1">
                    {user.attendance_rate !== undefined && user.attendance_rate !== null
                      ? `${user.attendance_rate}%`
                      : '0%'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
