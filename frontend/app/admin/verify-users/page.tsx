'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import UserBadge from '@/components/UserBadge';
import Link from 'next/link';

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

  const regulars = users
    .filter((u) => u.badge === 'regular' && u.id !== verifyTarget?.id)
    .sort((a, b) =>
      getDisplayName(a).toLowerCase().localeCompare(getDisplayName(b).toLowerCase())
    );

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="text-basketball-orange hover:underline text-sm md:text-base"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-4 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-basketball-black mb-4 md:mb-6">
            Manage Users
          </h1>

          <div className="space-y-3 md:space-y-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex flex-col md:flex-row md:items-center justify-between p-3 md:p-4 border border-gray-200 rounded-lg gap-3"
              >
                {/* User Info */}
                <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <UserBadge user={u} />
                    {!u.is_active && (
                      <span className="inline-block px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium whitespace-nowrap">
                        Inactive
                      </span>
                    )}
                  </div>
                  <span className="text-gray-600 text-xs md:text-sm truncate">{u.email}</span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-row gap-2">
                  <button
                    onClick={() =>
                      u.is_verified ? handleVerify(u.id, false) : openVerifyModal(u)
                    }
                    disabled={updating === u.id}
                    className={`px-4 py-2 rounded transition-colors text-sm md:text-base whitespace-nowrap ${
                      u.is_verified
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    } ${updating === u.id ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                    className={`px-4 py-2 rounded transition-colors text-sm md:text-base whitespace-nowrap ${
                      u.is_active
                        ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                        : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                    } ${updating === u.id ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-basketball-black mb-1">
              Verify {getDisplayName(verifyTarget)}
            </h2>
            <p className="text-sm text-gray-600 mb-4">Add as Plus 1?</p>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setAddAsPlusOne(true)}
                className={`flex-1 px-4 py-2 rounded border transition-colors ${
                  addAsPlusOne === true
                    ? 'bg-basketball-orange text-white border-basketball-orange'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Yes
              </button>
              <button
                onClick={() => setAddAsPlusOne(false)}
                className={`flex-1 px-4 py-2 rounded border transition-colors ${
                  addAsPlusOne === false
                    ? 'bg-basketball-orange text-white border-basketball-orange'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                No
              </button>
            </div>

            {addAsPlusOne && (
              <div className="mb-4">
                <label
                  htmlFor="referrer"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Who are they a +1 of?
                </label>
                <select
                  id="referrer"
                  value={referrerId}
                  onChange={(e) => setReferrerId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                >
                  <option value="">Select a Regular</option>
                  {regulars.map((r) => (
                    <option key={r.id} value={r.id}>
                      {getDisplayName(r)}
                    </option>
                  ))}
                </select>
                {regulars.length === 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    No users have the Regular badge yet. Assign one in Manage Badges first.
                  </p>
                )}
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setVerifyTarget(null)}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyConfirm}
                disabled={addAsPlusOne === null || (addAsPlusOne && !referrerId)}
                className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addAsPlusOne ? 'Verify & Save +1' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

