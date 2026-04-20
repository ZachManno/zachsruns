'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { privateGroupsApi, adminApi } from '@/lib/api';
import { PrivateGroup, User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import Link from 'next/link';

export default function AdminManageGroupPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const params = useParams();
  const groupId = params?.id as string;

  const [group, setGroup] = useState<PrivateGroup | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingUserId, setAddingUserId] = useState('');
  const [adding, setAdding] = useState(false);
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }
    if (user && user.is_admin && groupId) {
      fetchData();
    }
  }, [user, authLoading, router, groupId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [groupData, usersData] = await Promise.all([
        privateGroupsApi.getGroup(groupId),
        adminApi.getUsers(),
      ]);
      setGroup(groupData.group);
      setAllUsers(usersData.users);
      setEditName(groupData.group.name);
      setEditDescription(groupData.group.description || '');
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await privateGroupsApi.updateGroup(groupId, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
      });
      setEditingName(false);
      await fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to update group');
    } finally {
      setSaving(false);
    }
  };

  const handleAddMember = async () => {
    if (!addingUserId) return;
    setAdding(true);
    try {
      await privateGroupsApi.addMember(groupId, addingUserId);
      await refreshUser();
      setAddingUserId('');
      await fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to add member');
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setRemovingUserId(userId);
    try {
      await privateGroupsApi.removeMember(groupId, userId);
      await refreshUser();
      await fetchData();
    } catch (error: any) {
      alert(error.message || 'Failed to remove member');
    } finally {
      setRemovingUserId(null);
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

  if (!user || !user.is_admin || !group) return null;

  const memberUserIds = new Set(group.members?.map((m) => m.user_id) || []);
  const verifiedNonMembers = allUsers
    .filter((u) => u.is_verified && !memberUserIds.has(u.id))
    .sort((a, b) => ((a.first_name || a.username) || '').localeCompare((b.first_name || b.username) || ''));

  const getDisplayName = (u: { first_name?: string; last_name?: string; username?: string }) => {
    if (u.first_name && u.last_name) return `${u.first_name} ${u.last_name}`;
    return u.username || '';
  };

  const filteredMembers = (group.members || []).filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (m.first_name?.toLowerCase() || '').includes(term) ||
      (m.last_name?.toLowerCase() || '').includes(term) ||
      (m.username?.toLowerCase() || '').includes(term)
    );
  });

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/private-groups"
            className="text-basketball-orange hover:underline"
          >
            &larr; Back to Private Groups
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
          {/* Group Info */}
          {editingName ? (
            <div className="mb-6 space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900 text-xl font-bold"
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="px-4 py-2 bg-basketball-orange text-white rounded-md hover:bg-orange-600 disabled:opacity-50 text-sm"
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setEditName(group.name);
                    setEditDescription(group.description || '');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-basketball-black">
                  {group.name}
                </h1>
                {group.description && (
                  <p className="text-gray-600 mt-1">{group.description}</p>
                )}
              </div>
              <button
                onClick={() => setEditingName(true)}
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Edit
              </button>
            </div>
          )}

          {/* Add Member */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h3 className="text-sm font-semibold text-basketball-black mb-2">
              Add Member
            </h3>
            <div className="flex flex-col md:flex-row gap-2">
              <select
                value={addingUserId}
                onChange={(e) => setAddingUserId(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
              >
                <option value="">Select a verified user...</option>
                {verifiedNonMembers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {getDisplayName(u)} (@{u.username})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!addingUserId || adding}
                className="px-4 py-2 bg-basketball-orange text-white rounded text-sm hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {verifiedNonMembers.length === 0 && (
              <p className="text-xs text-gray-500 mt-2">All verified users are already members.</p>
            )}
          </div>

          {/* Members List */}
          <div>
            <h3 className="text-lg font-bold text-basketball-black mb-3">
              Members ({group.members?.length || 0})
            </h3>

            {(group.members?.length || 0) > 5 && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
                />
              </div>
            )}

            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {member.badge && (
                      <BadgeIcon
                        badge={member.badge as 'regular' | 'plus_one'}
                        size="small"
                      />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-gray-900">
                        {getDisplayName(member)}
                      </span>
                      <span className="text-xs text-gray-500 ml-2">
                        @{member.username}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingUserId === member.user_id}
                    className="text-red-600 hover:text-red-800 text-xs font-medium disabled:opacity-50 whitespace-nowrap ml-2"
                  >
                    {removingUserId === member.user_id ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>

            {filteredMembers.length === 0 && (
              <p className="text-gray-600 text-center py-4 text-sm">
                {searchTerm ? 'No members match your search.' : 'No members yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
