'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { usersApi } from '@/lib/api';
import { User } from '@/types';
import BadgeIcon from '@/components/BadgeIcon';
import PageHeader from '@/components/PageHeader';

export default function CommunityPage() {
  const { user: currentUser, loading: authLoading } = useAuth();
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
    if (!authLoading && !currentUser) {
      router.push('/login');
      return;
    }

    if (currentUser) {
      fetchCommunity();
    }
  }, [currentUser, authLoading, router]);

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

    const initials = (user.first_name?.[0] || user.username[0] || '?').toUpperCase();

    const handleClick = () => {
      router.push(`/users/${user.id}`);
    };

    return (
      <div
        className="card card-interactive group cursor-pointer p-4"
        onClick={handleClick}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-court-700 bg-court-900 font-display text-sm font-bold text-ember-400 transition-colors group-hover:border-ember-500/40">
              {initials}
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-semibold text-ink">
                {displayName}
                {user.badge && <BadgeIcon badge={user.badge} size="small" />}
              </p>
              <p className="truncate text-xs text-zinc-500">@{user.username}</p>
              {user.badge === 'plus_one' && user.referrer && (
                <p className="mt-1 truncate text-xs text-zinc-500">
                  Referred by{' '}
                  <span className="font-medium text-zinc-400">
                    {user.referrer.first_name && user.referrer.last_name
                      ? `${user.referrer.first_name} ${user.referrer.last_name}`
                      : user.referrer.username}
                  </span>
                </p>
              )}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-display text-lg font-bold leading-none text-ink">
              {user.runs_attended_count || 0}
            </p>
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-500">
              {user.runs_attended_count === 1 ? 'run' : 'runs'}
            </p>
            <p className="mt-1 text-xs text-zinc-400">
              {user.attendance_rate !== undefined && user.attendance_rate !== null
                ? `${user.attendance_rate}%`
                : '0%'}{' '}
              rate
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-court-800 pt-3">
          {user.is_verified ? (
            <span className="chip chip-green">Verified</span>
          ) : (
            <span className="chip chip-neutral">Unverified</span>
          )}
          {currentUser?.is_admin && !user.is_active && (
            <span className="chip chip-red">Inactive</span>
          )}
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
      <div className="mb-8 md:mb-10">
        <div className="mb-4 flex items-center gap-4">
          <h2 className="heading-2 shrink-0">{title}</h2>
          <span className="chip chip-neutral shrink-0">{filtered.length}</span>
          <span className="accent-rule" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4 lg:grid-cols-3">
          {filtered.map((user) => (
            <UserCard key={user.id} user={user} />
          ))}
        </div>
      </div>
    );
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

  if (!currentUser) {
    return null;
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="The roster"
          title="Community"
          description="Everyone who runs with us, grouped by badge and ranked by how often they show up."
        />

        {/* Search and Filter Bar */}
        <div className="card card-pad mb-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label className="field-label">Search</label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name..."
                className="field-input"
              />
            </div>
            <div>
              <label className="field-label">Filter by Badge</label>
              <select
                value={badgeFilter}
                onChange={(e) => setBadgeFilter(e.target.value)}
                className="field-select"
              >
                <option value="all">All Badges</option>
                <option value="regular">Regular</option>
                <option value="plus_one">+1</option>
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2.5 py-2.5">
                <input
                  type="checkbox"
                  checked={showUnverified}
                  onChange={(e) => setShowUnverified(e.target.checked)}
                  className="field-checkbox"
                />
                <span className="text-sm text-zinc-300">Show Unverified</span>
              </label>
            </div>
          </div>
        </div>

        {/* Badge Sections */}
        <BadgeSection
          title="Regular Members"
          users={communityData.regular}
          badgeType="regular"
        />
        <BadgeSection
          title="+1 Members"
          users={communityData.plus_one}
          badgeType="plus_one"
        />
        <BadgeSection
          title="Members"
          users={communityData.none}
          badgeType="none"
        />
        {showUnverified && (
          <BadgeSection
            title="Unverified Users"
            users={communityData.unverified}
            badgeType="unverified"
          />
        )}
      </div>
    </div>
  );
}
