'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { PrivateGroup } from '@/types';
import Link from 'next/link';

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-basketball-black mb-4 md:mb-8 text-center">
          Private Groups
        </h1>

        {groups.length === 0 ? (
          <div className="max-w-md mx-auto py-10">
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 text-center space-y-4">
              <div className="text-4xl">&#128274;</div>
              <p className="text-gray-600 text-base md:text-lg">
                You&apos;re not part of any private run groups yet.
              </p>
              <p className="text-gray-500 text-sm">
                An admin can invite you to a private group.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {groups.map((group) => (
              <Link
                key={group.id}
                href={`/private-runs/${group.id}`}
                className="bg-white rounded-lg shadow-md p-5 md:p-6 hover:shadow-lg transition-shadow border border-gray-100"
              >
                <h2 className="text-lg md:text-xl font-bold text-basketball-black mb-2">
                  {group.name}
                </h2>
                {group.description && (
                  <p className="text-gray-600 text-sm mb-3">{group.description}</p>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{group.member_count} member{group.member_count !== 1 ? 's' : ''}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
