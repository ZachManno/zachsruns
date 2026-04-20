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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
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
    <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href={`/private-runs/${groupId}`}
            className="text-basketball-orange hover:underline"
          >
            &larr; Back to {group?.name}
          </Link>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold text-basketball-black mb-2 text-center">
          {group?.name} Community
        </h1>
        <p className="text-gray-500 text-center mb-6">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </p>

        {members.length > 5 && (
          <div className="mb-6">
            <input
              type="text"
              placeholder="Search members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
            />
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredMembers.map((member) => (
            <div
              key={member.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
            >
              <div className="flex items-center gap-2 min-w-0">
                {member.badge && (
                  <BadgeIcon
                    badge={member.badge as 'regular' | 'plus_one'}
                    size="small"
                  />
                )}
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">
                    {getDisplayName(member)}
                  </p>
                  <p className="text-xs text-gray-500">@{member.username}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredMembers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {searchTerm ? 'No members match your search.' : 'No members in this group.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
