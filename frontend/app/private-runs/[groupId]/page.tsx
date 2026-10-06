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

  // `silent` keeps the run grid mounted when refreshing after an RSVP change
  const fetchGroupRuns = useCallback(async (silent = false) => {
    if (!groupId) return;
    try {
      if (!silent) setLoading(true);
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
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  if (error) {
    return (
      <div className="page">
        <div className="py-20 text-center">
          <p className="text-red-300">{error}</p>
          <button onClick={() => fetchGroupRuns()} className="btn btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mb-5">
        <Link
          href="/private-runs"
          className="text-sm text-zinc-500 transition-colors hover:text-ember-400"
        >
          ← All Private Groups
        </Link>
      </div>

      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="eyebrow">Private group</p>
          <h1 className="heading-1 mt-2">{group?.name}</h1>
          {group?.description && (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-400">
              {group.description}
            </p>
          )}
        </div>
        <Link
          href={`/private-runs/${groupId}/community`}
          className="btn btn-secondary self-start"
        >
          Group Community
        </Link>
      </div>
      <div className="accent-rule mb-6 md:mb-8" />

      {upcomingRuns.length > 0 && (
        <div className="mb-10 md:mb-14">
          <div className="mb-4 flex items-center gap-4">
            <h2 className="heading-2 shrink-0">Upcoming Runs</h2>
            <span className="chip chip-neutral shrink-0">{upcomingRuns.length}</span>
            <span className="accent-rule" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {upcomingRuns.map((run) => (
              <RunCard key={run.id} run={run} onUpdate={() => fetchGroupRuns(true)} />
            ))}
          </div>
        </div>
      )}

      {pastRuns.length > 0 && (
        <div>
          <div className="mb-4 flex items-center gap-4">
            <h2 className="heading-2 shrink-0">Past Private Group Only Runs</h2>
            <span className="chip chip-neutral shrink-0">{pastRuns.length}</span>
            <span className="accent-rule" />
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {(showAllPastRuns ? pastRuns : pastRuns.slice(0, PAST_RUNS_LIMIT)).map((run) => (
              <RunCard key={run.id} run={run} onUpdate={() => fetchGroupRuns(true)} />
            ))}
          </div>
          {pastRuns.length > PAST_RUNS_LIMIT && (
            <button
              onClick={() => setShowAllPastRuns(!showAllPastRuns)}
              className="btn btn-secondary btn-block mt-6 py-4 text-base"
            >
              {showAllPastRuns ? 'Show less' : `Show all ${pastRuns.length} past runs`}
            </button>
          )}
        </div>
      )}

      {upcomingRuns.length === 0 && pastRuns.length === 0 && (
        <div className="card card-pad py-16 text-center">
          <p className="text-zinc-500">No runs in this group currently.</p>
        </div>
      )}
    </div>
  );
}
