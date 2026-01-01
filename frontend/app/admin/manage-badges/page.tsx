'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import Link from 'next/link';

export default function ManageBadgesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [badgeChanges, setBadgeChanges] = useState<Record<string, { badge: string | null; referredBy?: string }>>({});
  const [referrers, setReferrers] = useState<User[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }

    if (user && user.is_admin) {
      fetchUsers();
    }
  }, [user, authLoading, router]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getUsers();
      setUsers(data.users);
      
      // Get Regular users for referrer dropdown
      const regularUsers = data.users.filter(
        (u) => u.badge === 'regular'
      );
      setReferrers(regularUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBadgeChange = (userId: string, badge: string | null, referredBy?: string) => {
    console.log('handleBadgeChange called:', { userId, badge, referredBy });
    setBadgeChanges({
      ...badgeChanges,
      [userId]: { badge, referredBy },
    });
  };

  const handleSave = async (userId: string) => {
    const change = badgeChanges[userId];
    if (!change) return;

    // Determine badge to save: if referrer is selected, badge must be plus_one
    // Otherwise use the badge from change
    let badgeToSave: string | null = null;
    if (change.referredBy) {
      // If referrer is selected, badge must be plus_one
      badgeToSave = 'plus_one';
    } else if (change.badge !== undefined) {
      // Use the badge from the change
      badgeToSave = change.badge;
    } else {
      // No badge change and no referrer - nothing to save
      alert('Please select a badge or referrer');
      return;
    }
    
    // Validate that plus_one badge has a referrer
    if (badgeToSave === 'plus_one' && !change.referredBy) {
      alert('Please select a referrer for the +1 badge');
      return;
    }

    console.log('Saving badge:', { userId, badgeToSave, referredBy: change.referredBy, change });

    setUpdating(userId);
    try {
      const result = await adminApi.assignBadge(
        userId,
        badgeToSave as any,
        change.referredBy
      );
      console.log('Badge assignment result:', result);
      await fetchUsers();
      // Remove from changes
      const newChanges = { ...badgeChanges };
      delete newChanges[userId];
      setBadgeChanges(newChanges);
    } catch (error: any) {
      console.error('Failed to update badge:', error);
      const errorMessage = error.message || error.error || 'Failed to update badge';
      alert(`Error: ${errorMessage}`);
    } finally {
      setUpdating(null);
    }
  };

  const handleBulkAssign = async (badge: 'regular') => {
    if (!confirm(`Set all users to ${badge} badge?`)) return;

    try {
      const userIds = users.map((u) => u.id);
      await adminApi.bulkAssignBadge(userIds, badge);
      await fetchUsers();
      setBadgeChanges({});
      alert(`All users set to ${badge} badge`);
    } catch (error: any) {
      console.error('Failed to bulk assign:', error);
      alert(error.message || 'Failed to bulk assign badges');
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

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="text-basketball-orange hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-basketball-black">
              Manage Badges
            </h1>
            <button
              onClick={() => handleBulkAssign('regular')}
              className="bg-basketball-orange text-white px-4 py-2 rounded hover:bg-orange-600 transition-colors"
            >
              Set All to Regular
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Current Badge</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Run Count</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Assign Badge</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const displayName = u.first_name && u.last_name
                    ? `${u.first_name} ${u.last_name}`
                    : u.username;
                  
                  const change = badgeChanges[u.id];
                  const currentBadge = change?.badge !== undefined ? change.badge : u.badge;
                  const needsReferrer = currentBadge === 'plus_one' || change?.badge === 'plus_one';

                  return (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-900">{displayName}</span>
                          {u.badge && !change && (
                            <BadgeIcon badge={u.badge} size="small" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500">@{u.username}</p>
                      </td>
                      <td className="py-3 px-4">
                        {u.badge ? (
                          <span className="flex items-center gap-1">
                            <BadgeIcon badge={u.badge} size="small" />
                            <span className="text-sm">
                              {u.badge === 'regular' ? 'Regular' :
                               u.badge === 'plus_one' ? '+1' : ''}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm">{u.run_count || 0}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-2">
                          <select
                            value={currentBadge || 'none'}
                            onChange={(e) => {
                              const newBadge = e.target.value === 'none' ? null : e.target.value;
                              // Preserve referredBy if changing to plus_one and it already exists
                              const existingReferredBy = change?.referredBy;
                              handleBadgeChange(u.id, newBadge as any, newBadge === 'plus_one' ? existingReferredBy : undefined);
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900 text-sm"
                          >
                            <option value="none">None</option>
                            <option value="regular">Regular</option>
                            <option value="plus_one">+1</option>
                          </select>
                          {needsReferrer && (
                            <select
                              value={change?.referredBy !== undefined ? (change.referredBy || '') : (u.referred_by || '')}
                              onChange={(e) => {
                                const referrerId = e.target.value || undefined;
                                // Always set badge to plus_one when referrer is selected
                                handleBadgeChange(u.id, 'plus_one', referrerId);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900 text-sm"
                            >
                              <option value="">Select Referrer</option>
                              {referrers.map((ref) => (
                                <option key={ref.id} value={ref.id}>
                                  {ref.first_name && ref.last_name
                                    ? `${ref.first_name} ${ref.last_name}`
                                    : ref.username} (Regular)
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {(badgeChanges[u.id] && (badgeChanges[u.id].badge !== undefined || badgeChanges[u.id].referredBy !== undefined)) && (
                          <button
                            onClick={() => handleSave(u.id)}
                            disabled={updating === u.id}
                            className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50"
                          >
                            {updating === u.id ? 'Saving...' : 'Save'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

