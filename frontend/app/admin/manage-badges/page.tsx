'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import BackLink from '@/components/BackLink';

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
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="eyebrow">Recognition</p>
              <h1 className="heading-1 mt-2">Manage Badges</h1>
            </div>
            <button onClick={() => handleBulkAssign('regular')} className="btn btn-secondary self-start">
              Set All to Regular
            </button>
          </div>
          <div className="accent-rule mt-5" />

          <div className="mt-6 overflow-x-auto">
            <table className="data-table min-w-[720px]">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Current Badge</th>
                  <th>Run Count</th>
                  <th>Assign Badge</th>
                  <th>Actions</th>
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
                    <tr key={u.id}>
                      <td>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-ink">{displayName}</span>
                          {u.badge && !change && <BadgeIcon badge={u.badge} size="small" />}
                        </div>
                        <p className="text-xs text-zinc-500">@{u.username}</p>
                      </td>
                      <td>
                        {u.badge ? (
                          <span className="chip chip-neutral">
                            <BadgeIcon badge={u.badge} size="small" />
                            {u.badge === 'regular' ? 'Regular' : u.badge === 'plus_one' ? '+1' : ''}
                          </span>
                        ) : (
                          <span className="text-sm text-zinc-600">None</span>
                        )}
                      </td>
                      <td>
                        <span className="font-display font-semibold text-ink">{u.run_count || 0}</span>
                      </td>
                      <td>
                        <div className="w-44 space-y-2">
                          <select
                            value={currentBadge || 'none'}
                            onChange={(e) => {
                              const newBadge = e.target.value === 'none' ? null : e.target.value;
                              // Preserve referredBy if changing to plus_one and it already exists
                              const existingReferredBy = change?.referredBy;
                              handleBadgeChange(u.id, newBadge as any, newBadge === 'plus_one' ? existingReferredBy : undefined);
                            }}
                            className="field-select py-2 text-xs"
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
                              className="field-select py-2 text-xs"
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
                      <td>
                        {(badgeChanges[u.id] && (badgeChanges[u.id].badge !== undefined || badgeChanges[u.id].referredBy !== undefined)) && (
                          <button
                            onClick={() => handleSave(u.id)}
                            disabled={updating === u.id}
                            className="btn btn-success btn-sm"
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
