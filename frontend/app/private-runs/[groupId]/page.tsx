'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { Run, PrivateGroup } from '@/types';
import RunCard from '@/components/RunCard';
import Link from 'next/link';

const PAST_RUNS_LIMIT = 3;

export default function PrivateGroupRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<PrivateGroup | null>(null);
  const [upcomingRuns, setUpcomingRuns] = useState<Run[]>([]);
  const [pastRuns, setPastRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllPastRuns, setShowAllPastRuns] = useState(false);

  const fetchGroupRuns = useCallback(async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await privateGroupsApi.getGroupRuns(groupId);
      setGroup(data.group);
      setUpcomingRuns(data.upcoming);
      setPastRuns(data.past);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load group runs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchGroupRuns();
  }, [user, authLoading, router, fetchGroupRuns]);

  if (authLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center py-12">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchGroupRuns}
            className="mt-4 bg-basketball-orange text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-4">
        <Link
          href="/private-runs"
          className="text-basketball-orange hover:underline"
        >
          &larr; All Private Groups
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-8 gap-2">
        <div>
          <h1 className="text-2xl md:text-4xl font-bold text-basketball-black">
            {group?.name}
          </h1>
          {group?.description && (
            <p className="text-gray-600 mt-1">{group.description}</p>
          )}
        </div>
        <Link
          href={`/private-runs/${groupId}/community`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 self-start"
        >
          Group Community
          <span className="text-gray-400">&rarr;</span>
        </Link>
      </div>

      {upcomingRuns.length > 0 && (
        <div className="mb-8 md:mb-12">
          <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-3 md:mb-4">
            Upcoming Runs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {upcomingRuns.map((run) => (
              <RunCard key={run.id} run={run} onUpdate={fetchGroupRuns} />
            ))}
          </div>
        </div>
      )}

      {pastRuns.length > 0 && (
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-3 md:mb-4">
            Past Private Group Only Runs
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {(showAllPastRuns ? pastRuns : pastRuns.slice(0, PAST_RUNS_LIMIT)).map((run) => (
              <RunCard key={run.id} run={run} onUpdate={fetchGroupRuns} />
            ))}
          </div>
          {pastRuns.length > PAST_RUNS_LIMIT && (
            <button
              onClick={() => setShowAllPastRuns(!showAllPastRuns)}
              className="mt-6 w-full py-4 text-base md:text-lg font-semibold bg-basketball-orange text-white hover:bg-orange-600 rounded-lg transition-colors shadow-md active:scale-[0.98]"
            >
              {showAllPastRuns
                ? 'Show less'
                : `Show all ${pastRuns.length} past runs`}
            </button>
          )}
        </div>
      )}

      {upcomingRuns.length === 0 && pastRuns.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No runs in this group currently.</p>
        </div>
      )}
    </div>
  );
}
