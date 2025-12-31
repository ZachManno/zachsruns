'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { User } from '@/types';
import UserBadge from '@/components/UserBadge';
import Link from 'next/link';

export default function VerifyUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

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
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="text-basketball-orange hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-basketball-black mb-6">
            Verify Users
          </h1>

          <div className="space-y-4">
            {users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <UserBadge user={u} />
                  <span className="text-gray-600 text-sm">{u.email}</span>
                </div>

                <button
                  onClick={() => handleVerify(u.id, !u.is_verified)}
                  disabled={updating === u.id}
                  className={`px-4 py-2 rounded transition-colors ${
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
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

