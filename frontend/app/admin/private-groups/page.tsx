'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { privateGroupsApi } from '@/lib/api';
import { PrivateGroup } from '@/types';
import Link from 'next/link';

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.is_admin) return null;

  const groupToDelete = groups.find((g) => g.id === deleteConfirm);

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="text-basketball-orange hover:underline"
          >
            &larr; Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-basketball-black">
              Private Groups
            </h1>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-basketball-orange text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors text-sm md:text-base"
            >
              {showCreateForm ? 'Cancel' : 'Create Group'}
            </button>
          </div>

          {showCreateForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Group Name *
                  </label>
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="e.g., Thursday Night Crew"
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newGroupDescription}
                    onChange={(e) => setNewGroupDescription(e.target.value)}
                    placeholder="Optional description"
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-basketball-orange text-white px-6 py-2 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          )}

          {groups.length === 0 ? (
            <p className="text-gray-600 text-center py-8">
              No private groups yet. Create one to get started.
            </p>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <h3 className="font-semibold text-basketball-black">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-600 mt-0.5">{group.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      {group.member_count} member{group.member_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/private-groups/${group.id}`}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Manage
                    </Link>
                    <button
                      onClick={() => setDeleteConfirm(group.id)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded text-sm hover:bg-red-700"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-red-700 mb-3">
              Delete Group
            </h3>
            <p className="text-gray-700 mb-4">
              Are you sure you&apos;d like to delete the entire group <strong>&quot;{groupToDelete.name}&quot;</strong>?
              All runs in this group will be permanently deleted.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
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
