'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { PrivateGroup } from '@/types';
import Link from 'next/link';
import BackLink from '@/components/BackLink';

export default function AdminPrivateGroupsPage() {
  const { user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }
    if (user && user.is_admin) {
      fetchGroups();
    }
  }, [user, authLoading, router]);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const data = await privateGroupsApi.getAllGroups();
      setGroups(data.groups);
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreating(true);
    try {
      await privateGroupsApi.createGroup({
        name: newGroupName.trim(),
        description: newGroupDescription.trim() || undefined,
      });
      await refreshUser();
      setNewGroupName('');
      setNewGroupDescription('');
      setShowCreateForm(false);
      await fetchGroups();
    } catch (error: any) {
      alert(error.message || 'Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (groupId: string) => {
    setDeleting(true);
    try {
      await privateGroupsApi.deleteGroup(groupId);
      await refreshUser();
      setDeleteConfirm(null);
      await fetchGroups();
    } catch (error: any) {
      alert(error.message || 'Failed to delete group');
    } finally {
      setDeleting(false);
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

  if (!user || !user.is_admin) return null;

  const groupToDelete = groups.find((g) => g.id === deleteConfirm);

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Invite only</p>
              <h1 className="heading-1 mt-2">Private Groups</h1>
            </div>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className={`btn self-start ${showCreateForm ? 'btn-secondary' : 'btn-primary'}`}
            >
              {showCreateForm ? 'Cancel' : 'Create Group'}
            </button>
          </div>
          <div className="accent-rule mt-5" />

          {showCreateForm && (
            <form onSubmit={handleCreate} className="panel-sunken mt-6 animate-rise-in p-4">
              <div className="space-y-4">
                <div>
                  <label className="field-label">Group Name *</label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Thursday Night Crew"
                    required
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Description</label>
                  <input
                    type="text"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Optional description"
                    className="field-input"
                  />
                </div>
                <button type="submit" disabled={creating} className="btn btn-primary">
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}

          {groups.length === 0 ? (
            <p className="py-10 text-center text-sm text-zinc-500">
              No private groups yet. Create one to get started.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="panel flex flex-col justify-between gap-3 p-4 transition-colors hover:border-court-600 md:flex-row md:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="font-display font-bold text-ink">{group.name}</h3>
                    {group.description && (
                      <p className="mt-0.5 text-sm text-zinc-400">{group.description}</p>
                    )}
                    <p className="mt-1.5 text-xs text-zinc-500">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Link
                      href={`/admin/private-groups/${group.id}`}
                      className="btn btn-secondary btn-sm px-3 py-2"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(group.id)}
                      className="btn btn-danger btn-sm px-3 py-2"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && groupToDelete && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md animate-rise-in">
            <h3 className="font-display text-xl font-bold text-red-300">Delete Group</h3>
            <p className="mt-3 text-sm leading-relaxed text-zinc-300">
              Are you sure you&apos;d like to delete the entire group{' '}
              <strong className="text-ink">&quot;{groupToDelete.name}&quot;</strong>? All runs in
              this group will be permanently deleted.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="btn btn-danger"
              >
                {deleting ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
