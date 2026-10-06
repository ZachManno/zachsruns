'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { PrivateGroup, GroupCommunityMember } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import Link from 'next/link';

export default function PrivateGroupCommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.groupId as string;

  const [group, setGroup] = useState<PrivateGroup | null>(null);
  const [members, setMembers] = useState<GroupCommunityMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchCommunity();
  }, [user, authLoading, router, groupId]);

  const fetchCommunity = async () => {
    if (!groupId) return;
    try {
      setLoading(true);
      const data = await privateGroupsApi.getGroupCommunity(groupId);
      setGroup(data.group);
      setMembers(data.members);
    } catch (error) {
      console.error('Failed to fetch group community:', error);
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

  const filteredMembers = members.filter((m) => {
    const term = searchTerm.toLowerCase();
    return (
      (m.first_name?.toLowerCase() || '').includes(term) ||
      (m.last_name?.toLowerCase() || '').includes(term) ||
      m.username.toLowerCase().includes(term)
    );
  });

  const getDisplayName = (member: GroupCommunityMember) => {
    if (member.first_name && member.last_name) {
      return `${member.first_name} ${member.last_name}`;
    }
    return member.username;
  };

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <Link
            href={`/private-runs/${groupId}`}
            className="text-sm text-zinc-500 transition-colors hover:text-ember-400"
          >
            ← Back to {group?.name}
          </Link>
        </div>

        <div className="mb-6">
          <p className="eyebrow">Group roster</p>
          <h1 className="heading-1 mt-2">{group?.name} Community</h1>
          <p className="mt-2 text-sm text-zinc-500">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
          <div className="accent-rule mt-5" />
        </div>

        {members.length > 5 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="field-input"
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {filteredMembers.map((member) => (
            <div key={member.id} className="card card-interactive p-4">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-court-700 bg-court-900 font-display text-xs font-bold text-ember-400">
                  {(member.first_name?.[0] || member.username[0] || '?').toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate font-medium text-ink">
                    {getDisplayName(member)}
                    {member.badge && (
                      <BadgeIcon badge={member.badge as 'regular' | 'plus_one'} size="small" />
                    )}
                  </p>
                  <p className="truncate text-xs text-zinc-500">@{member.username}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="card card-pad py-12 text-center">
            <p className="text-zinc-500">
              {searchTerm ? 'No members match your search.' : 'No members in this group.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
