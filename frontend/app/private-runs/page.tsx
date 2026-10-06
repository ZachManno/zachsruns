'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { PrivateGroup } from '@/types';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

export default function PrivateRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchGroups();
  }, [user, authLoading, router]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await privateGroupsApi.getMyGroups();
      setGroups(data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
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

  if (!user) return null;

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Invite only"
          title="Private Groups"
          description="Runs organized for a smaller circle."
        />

        {groups.length === 0 ? (
          <div className="mx-auto max-w-md py-6">
            <div className="card card-pad glow-edge space-y-3 text-center">
              <p className="text-zinc-300">You&apos;re not part of any private run groups yet.</p>
              <p className="text-sm text-zinc-500">An admin can invite you to a private group.</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/private-runs/${group.id}`}
                className="card card-interactive group p-5"
              >
                <h2 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">
                  {group.name}
                </h2>
                {group.description && (
                  <p className="mt-2 text-sm leading-relaxed text-zinc-400">{group.description}</p>
                )}
                <div className="mt-4 border-t border-court-800 pt-3">
                  <span className="chip chip-neutral">
                    {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
