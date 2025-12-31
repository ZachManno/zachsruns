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

  const fetchRuns = async () => {
    try {
      setLoading(true);
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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-basketball-black">
              Profile
            </h1>
            {user.badge && (
              <div className="flex items-center gap-2">
                <BadgeIcon badge={user.badge} size="large" />
                <span className="text-lg font-semibold text-gray-700">
                  {user.badge === 'vip' ? 'VIP' :
                   user.badge === 'regular' ? 'Regular' :
                   user.badge === 'rookie' ? 'Rookie' :
                   user.badge === 'plus_one' ? '+1' : ''}
                </span>
              </div>
            )}
          </div>
          <UserBadge user={user} />
          <div className="mt-4 text-gray-600">
            <p>Email: {user.email}</p>
            {user.badge === 'plus_one' && user.referrer && (
              <p className="text-sm mt-2">
                Referred by:{' '}
                <span className="font-semibold text-basketball-black">
                  {user.referrer.first_name && user.referrer.last_name
                    ? `${user.referrer.first_name} ${user.referrer.last_name}`
                    : user.referrer.username}
                </span>
              </p>
            )}
            <p className="text-sm mt-2">
              Member since:{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          
          {(user.runs_attended_count !== undefined || user.no_shows_count !== undefined) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-basketball-black mb-4">Run Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Runs Attended</p>
                  <p className="text-2xl font-bold text-basketball-black">
                    {user.runs_attended_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">No Shows</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {user.no_shows_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-500">
                    {user.attendance_rate !== undefined && user.attendance_rate !== null ? `${user.attendance_rate}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-basketball-black mb-4">
            My Runs
          </h2>
          {runs.upcoming.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {runs.upcoming.map((run) => (
                <RunCard key={run.id} run={run} onUpdate={fetchRuns} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No upcoming runs.</p>
          )}
        </div>

        <div>
          <h2 className="text-2xl font-bold text-basketball-black mb-4">
            Completed Runs
          </h2>
          {runs.history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {runs.history.map((run) => (
                <RunCard key={run.id} run={run} onUpdate={fetchRuns} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No completed runs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

