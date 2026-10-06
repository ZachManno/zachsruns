'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { privateGroupsApi, adminApi } from '@/lib/api';
import { PrivateGroup, User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import BackLink from '@/components/BackLink';

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
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
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
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <BackLink href="/admin/private-groups" label="Back to Private Groups" />
        </div>

        <div className="card glow-edge card-pad">
          {/* Group Info */}
          {editingName ? (
            <div className="space-y-3">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="field-input font-display text-xl font-bold"
              />
              <input
                type="text"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Description (optional)"
                className="field-input"
              />
              <div className="flex gap-2">
                <button onClick={handleSaveEdit} disabled={saving} className="btn btn-primary btn-sm px-4 py-2">
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setEditName(group.name);
                    setEditDescription(group.description || '');
                  }}
                  className="btn btn-secondary btn-sm px-4 py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">Private group</p>
                <h1 className="heading-1 mt-2">{group.name}</h1>
                {group.description && <p className="mt-2 text-sm text-zinc-400">{group.description}</p>}
              </div>
              <button onClick={() => setEditingName(true)} className="btn btn-secondary btn-sm shrink-0 px-3 py-2">
                Edit
              </button>
            </div>
          )}

          <div className="accent-rule mt-5" />

          {/* Add Member */}
          <div className="panel-sunken mt-6 p-4">
            <h3 className="stat-label">Add Member</h3>
            <div className="mt-2 flex flex-col gap-2 md:flex-row">
              <select
                value={addingUserId}
                onChange={(e) => setAddingUserId(e.target.value)}
                className="field-select flex-1 py-2 text-sm"
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
                className="btn btn-primary btn-sm whitespace-nowrap px-5 py-2"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
            </div>
            {verifiedNonMembers.length === 0 && (
              <p className="field-hint">All verified users are already members.</p>
            )}
          </div>

          {/* Members List */}
          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <h3 className="heading-3 shrink-0">Members</h3>
              <span className="chip chip-neutral shrink-0">{group.members?.length || 0}</span>
            </div>

            {(group.members?.length || 0) > 5 && (
              <div className="mb-3">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="field-input py-2 text-sm"
                />
              </div>
            )}

            <div className="space-y-2">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className="panel flex items-center justify-between p-3 transition-colors hover:border-court-600"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {member.badge && (
                      <BadgeIcon badge={member.badge as 'regular' | 'plus_one'} size="small" />
                    )}
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-white">{getDisplayName(member)}</span>
                      <span className="ml-2 text-xs text-zinc-500">@{member.username}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    disabled={removingUserId === member.user_id}
                    className="ml-2 whitespace-nowrap text-xs font-semibold text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
                  >
                    {removingUserId === member.user_id ? '...' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>

            {filteredMembers.length === 0 && (
              <p className="py-6 text-center text-sm text-zinc-500">
                {searchTerm ? 'No members match your search.' : 'No members yet.'}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
