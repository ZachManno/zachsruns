'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { Run } from '@/types';
import UserBadge from '@/components/UserBadge';
import RunCard from '@/components/RunCard';

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
          <h1 className="text-3xl font-bold text-basketball-black mb-6">
            Profile
          </h1>
          <UserBadge user={user} />
          <div className="mt-4 text-gray-600">
            <p>Email: {user.email}</p>
            <p className="text-sm mt-2">
              Member since:{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
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
            History
          </h2>
          {runs.history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {runs.history.map((run) => (
                <RunCard key={run.id} run={run} onUpdate={fetchRuns} />
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No past runs.</p>
          )}
        </div>
      </div>
    </div>
  );
}

