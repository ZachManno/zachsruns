'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import UserBadge from '@/components/UserBadge';
import BackLink from '@/components/BackLink';
import ModalPortal from '@/components/ModalPortal';

const getDisplayName = (u: User) =>
  u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username;

export default function VerifyUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [verifyTarget, setVerifyTarget] = useState<User | null>(null);
  const [addAsPlusOne, setAddAsPlusOne] = useState<boolean | null>(null);
  const [referrerId, setReferrerId] = useState('');

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
      // Sort users: unverified first, then verified
      const sortedUsers = [...data.users].sort((a, b) => {
        // Unverified users come first (false < true)
        if (a.is_verified !== b.is_verified) {
          return a.is_verified ? 1 : -1;
        }
        // If same verification status, sort alphabetically by name
        return getDisplayName(a).toLowerCase().localeCompare(getDisplayName(b).toLowerCase());
      });
      setUsers(sortedUsers);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (userId: string, isVerified: boolean) => {
    setUpdating(userId);
    try {
      await adminApi.verifyUser(userId, isVerified);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update verification:', error);
      alert('Failed to update verification status');
    } finally {
      setUpdating(null);
    }
  };

  const openVerifyModal = (u: User) => {
    setVerifyTarget(u);
    setAddAsPlusOne(u.badge === 'plus_one' ? true : null);
    setReferrerId(u.badge === 'plus_one' ? u.referred_by || '' : '');
  };

  const handleVerifyConfirm = async () => {
    if (!verifyTarget) return;

    const target = verifyTarget;
    const plusOneReferrerId = addAsPlusOne ? referrerId : '';
    setVerifyTarget(null);
    setUpdating(target.id);

    try {
      await adminApi.verifyUser(target.id, true);
    } catch (error) {
      console.error('Failed to update verification:', error);
      alert('Failed to update verification status');
      setUpdating(null);
      return;
    }

    if (plusOneReferrerId) {
      try {
        await adminApi.assignBadge(target.id, 'plus_one', plusOneReferrerId);
      } catch (error) {
        console.error('Failed to assign +1 badge:', error);
        alert(
          `${getDisplayName(target)} was verified, but the +1 badge could not be saved. Assign it in Manage Badges.`
        );
      }
    }

    await fetchUsers();
    setUpdating(null);
  };

  const handleSetActive = async (userId: string, isActive: boolean) => {
    if (!isActive) {
      const confirmed = window.confirm(
        'Mark this user inactive?\n\nThis will:\n- Remove their RSVPs from upcoming runs\n- Send them a notification email\n- Stop them from receiving future emails\n- Block them from RSVPing until reactivated\n\nThey can still view runs.'
      );
      if (!confirmed) return;
    }
    setUpdating(userId);
    try {
      await adminApi.setUserActive(userId, isActive);
      await fetchUsers();
    } catch (error) {
      console.error('Failed to update active status:', error);
      alert('Failed to update active status');
    } finally {
      setUpdating(null);
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

  const regulars = users
    .filter((u) => u.badge === 'regular' && u.id !== verifyTarget?.id)
    .sort((a, b) =>
      getDisplayName(a).toLowerCase().localeCompare(getDisplayName(b).toLowerCase())
    );

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Access control</p>
          <h1 className="heading-1 mt-2">Manage Users</h1>
          <div className="accent-rule mt-5" />

          <div className="mt-6 space-y-3">
            {users.map((u) => (
              <div
                key={u.id}
                className="panel flex flex-col justify-between gap-3 p-3 transition-colors hover:border-court-600 md:flex-row md:items-center md:p-4"
              >
                {/* User Info */}
                <div className="flex min-w-0 flex-col gap-1 md:flex-row md:items-center md:gap-4">
                  <div className="flex items-center gap-2">
                    <UserBadge user={u} />
                    {!u.is_active && <span className="chip chip-red whitespace-nowrap">Inactive</span>}
                  </div>
                  <span className="truncate text-xs text-zinc-500 md:text-sm">{u.email}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex shrink-0 flex-row gap-2">
                  <button
                    onClick={() =>
                      u.is_verified ? handleVerify(u.id, false) : openVerifyModal(u)
                    }
                    disabled={updating === u.id}
                    className={`btn btn-sm whitespace-nowrap px-4 py-2 text-sm ${
                      u.is_verified ? 'btn-danger' : 'btn-success'
                    }`}
                  >
                    {updating === u.id
                      ? 'Updating...'
                      : u.is_verified
                      ? 'Unverify'
                      : 'Verify'}
                  </button>
                  <button
                    onClick={() => handleSetActive(u.id, !u.is_active)}
                    disabled={updating === u.id}
                    className={`btn btn-sm whitespace-nowrap px-4 py-2 text-sm ${
                      u.is_active ? 'btn-outline' : 'btn-secondary'
                    }`}
                  >
                    {u.is_active ? 'Mark Inactive' : 'Mark Active'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {verifyTarget && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-panel max-w-md animate-rise-in">
              <h2 className="heading-2">Verify {getDisplayName(verifyTarget)}</h2>
              <p className="mb-4 mt-1 text-sm text-zinc-400">Add as Plus 1?</p>

              <div className="mb-5 flex gap-2">
                <button
                  onClick={() => setAddAsPlusOne(true)}
                  className={`btn flex-1 ${addAsPlusOne === true ? 'btn-primary' : 'btn-secondary'}`}
                >
                  Yes
                </button>
                <button
                  onClick={() => setAddAsPlusOne(false)}
                  className={`btn flex-1 ${addAsPlusOne === false ? 'btn-primary' : 'btn-secondary'}`}
                >
                  No
                </button>
              </div>

              {addAsPlusOne && (
                <div className="mb-5">
                  <label htmlFor="referrer" className="field-label">
                    Who are they a +1 of?
                  </label>
                  <select
                    id="referrer"
                    value={referrerId}
                    onChange={(e) => setReferrerId(e.target.value)}
                    className="field-select"
                  >
                    <option value="">Select a Regular</option>
                    {regulars.map((r) => (
                      <option key={r.id} value={r.id}>
                        {getDisplayName(r)}
                      </option>
                    ))}
                  </select>
                  {regulars.length === 0 && (
                    <p className="field-hint">
                      No users have the Regular badge yet. Assign one in Manage Badges first.
                    </p>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button onClick={() => setVerifyTarget(null)} className="btn btn-secondary">
                  Cancel
                </button>
                <button
                  onClick={handleVerifyConfirm}
                  disabled={addAsPlusOne === null || (addAsPlusOne && !referrerId)}
                  className="btn btn-primary"
                >
                  {addAsPlusOne ? 'Verify & Save +1' : 'Verify'}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
