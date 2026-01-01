'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usersApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import Link from 'next/link';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = params.id as string;

  useEffect(() => {
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchUserProfile();
    }
  }, [currentUser, authLoading, userId, router]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getUserProfile(userId);
      setUser(data.user);
    } catch (err: any) {
      console.error('Failed to fetch user profile:', err);
      setError(err.message || 'Failed to load user profile');
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

  if (error || !user) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <p className="text-red-600 mb-4">{error || 'User not found'}</p>
            <Link
              href="/community"
              className="text-basketball-orange hover:underline"
            >
              ← Back to Community
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.username;

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/community"
            className="text-basketball-orange hover:underline"
          >
            ← Back to Community
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div className="flex items-center gap-4 mb-6">
            <h1 className="text-3xl font-bold text-basketball-black">
              {displayName}
            </h1>
            {user.badge && (
              <div className="flex items-center gap-2">
                <BadgeIcon badge={user.badge} size="large" />
                <span className="text-lg font-semibold text-gray-700">
                  {user.badge === 'regular' ? 'Regular' :
                   user.badge === 'plus_one' ? '+1' : ''}
                </span>
              </div>
            )}
          </div>
          
          <div className="mt-4 text-gray-600">
            <p>Email: {user.email}</p>
            {user.badge === 'plus_one' && user.referrer && (
              <p className="text-sm mt-2">
                Referred by:{' '}
                <span className="font-semibold text-basketball-black">
                  {user.referrer.first_name && user.referrer.last_name
                    ? `${user.referrer.first_name} ${user.referrer.last_name}`
                    : user.referrer.username}
                </span>
              </p>
            )}
            <p className="text-sm mt-2">
              Member since:{' '}
              {new Date(user.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          
          {(user.runs_attended_count !== undefined) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h2 className="text-xl font-bold text-basketball-black mb-4">Run Statistics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Runs Attended</p>
                  <p className="text-2xl font-bold text-basketball-black">
                    {user.runs_attended_count || 0}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-1">Attendance Rate</p>
                  <p className="text-2xl font-bold text-gray-500">
                    {user.attendance_rate !== undefined && user.attendance_rate !== null ? `${user.attendance_rate}%` : '0%'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

