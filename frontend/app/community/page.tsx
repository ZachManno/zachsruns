'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';

export default function CommunityPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [communityData, setCommunityData] = useState<{
    regular: User[];
    plus_one: User[];
    none: User[];
    unverified: User[];
  }>({
    regular: [],
    plus_one: [],
    none: [],
    unverified: [],
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [badgeFilter, setBadgeFilter] = useState<string>('all');
  const [showUnverified, setShowUnverified] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchCommunity();
    }
  }, [user, authLoading, router]);

  const fetchCommunity = async () => {
    try {
      setLoading(true);
      const data = await usersApi.getCommunity();
      setCommunityData(data.users);
    } catch (error) {
      console.error('Failed to fetch community:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = (users: User[]) => {
    return users.filter((u) => {
      const matchesSearch =
        searchQuery === '' ||
        (u.first_name && u.first_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.last_name && u.last_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        u.username.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesVerified = showUnverified || u.is_verified;
      
      return matchesSearch && matchesVerified;
    });
  };

  const UserCard = ({ user }: { user: User }) => {
    const displayName = user.first_name && user.last_name
      ? `${user.first_name} ${user.last_name}`
      : user.username;

    const handleClick = () => {
      router.push(`/users/${user.id}`);
    };

    return (
      <div 
        className="bg-white rounded-lg shadow-md p-4 border border-gray-200 hover:shadow-lg transition-shadow cursor-pointer"
        onClick={handleClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.badge && <BadgeIcon badge={user.badge} size="medium" />}
            <div>
              <p className="font-semibold text-basketball-black">{displayName}</p>
              <p className="text-sm text-gray-600">@{user.username}</p>
              {user.badge === 'plus_one' && user.referrer && (
                <p className="text-xs text-gray-500 mt-1">
                  Referred by:{' '}
                  <span className="font-medium text-gray-700">
                    {user.referrer.first_name && user.referrer.last_name
                      ? `${user.referrer.first_name} ${user.referrer.last_name}`
                      : user.referrer.username}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-gray-700">
              {user.runs_attended_count || 0} {user.runs_attended_count === 1 ? 'run' : 'runs'} attended
            </p>
            <p className="text-xs text-gray-600">
              {user.attendance_rate !== undefined && user.attendance_rate !== null ? `${user.attendance_rate}%` : '0%'} attendance
            </p>
            {user.is_verified ? (
              <span className="text-xs text-green-600">Verified</span>
            ) : (
              <span className="text-xs text-gray-400">Unverified</span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const BadgeSection = ({
    title,
    users,
    badgeType,
  }: {
    title: string;
    users: User[];
    badgeType: string;
  }) => {
    const filtered = filterUsers(users);
    if (badgeFilter !== 'all' && badgeFilter !== badgeType) {
      return null;
    }
    if (filtered.length === 0) {
      return null;
    }

    return (
      <div className="mb-6 md:mb-8">
        <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-3 md:mb-4">{title}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {filtered.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      </div>
    );
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

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-basketball-black mb-4 md:mb-8 text-center">
          Community
        </h1>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-md p-4 md:p-6 mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Badge
              </label>
              <select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              >
                <option value="all">All Badges</option>
                <option value="regular">Regular</option>
                <option value="plus_one">+1</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showUnverified}
                  onChange={(e) => setShowUnverified(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm text-gray-700">Show Unverified</span>
              </label>
            </div>
          </div>
        </div>

        {/* Badge Sections */}
        <BadgeSection
          title="⭐ Regular Members"
          users={communityData.regular}
          badgeType="regular"
        />
        <BadgeSection
          title="👥 +1 Members"
          users={communityData.plus_one}
          badgeType="plus_one"
        />
        <BadgeSection
          title="👤 Members (No Badge)"
          users={communityData.none}
          badgeType="none"
        />
        {showUnverified && (
          <BadgeSection
            title="⚠️ Unverified Users"
            users={communityData.unverified}
            badgeType="unverified"
          />
        )}
      </div>
    </div>
  );
}

