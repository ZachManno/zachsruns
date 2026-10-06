'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { Run } from '@/types';
import UserBadge from '@/components/UserBadge';
import RunCard from '@/components/RunCard';
import BadgeIcon from '@/components/BadgeIcon';

export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [runs, setRuns] = useState<{ upcoming: Run[]; history: Run[] }>({
    upcoming: [],
    history: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchRuns();
    }
  }, [user, authLoading, router]);

  // `silent` keeps the run grid mounted when refreshing after an RSVP change
  const fetchRuns = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await usersApi.getMyRuns();
      setRuns(data);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
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

  if (!user) {
    return null;
  }

  const initials = (user.first_name?.[0] || user.username[0] || '?').toUpperCase();

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        {/* Identity card */}
        <div className="card glow-edge card-pad mb-6 md:mb-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-ember-gradient font-display text-2xl font-extrabold text-white shadow-glow-sm">
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="eyebrow">Your profile</p>
              <div className="mt-1.5">
                <UserBadge user={user} />
              </div>
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

        <div className="mb-8 md:mb-10">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="heading-2 shrink-0">My Runs</h2>
            <span className="chip chip-neutral shrink-0">{runs.upcoming.length}</span>
            <span className="accent-rule" />
          </div>
          {runs.upcoming.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {runs.upcoming.map((run) => (
                <RunCard key={run.id} run={run} onUpdate={() => fetchRuns(true)} />
              ))}
            </div>
          ) : (
            <div className="panel-sunken px-4 py-8 text-center text-sm text-zinc-500">
              No upcoming runs.
            </div>
          )}
        </div>

        <div>
          <div className="mb-4 flex items-center gap-4">
            <h2 className="heading-2 shrink-0">Completed Runs</h2>
            <span className="chip chip-neutral shrink-0">{runs.history.length}</span>
            <span className="accent-rule" />
          </div>
          {runs.history.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
              {runs.history.map((run) => (
                <RunCard key={run.id} run={run} onUpdate={() => fetchRuns(true)} />
              ))}
            </div>
          ) : (
            <div className="panel-sunken px-4 py-8 text-center text-sm text-zinc-500">
              No completed runs.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
