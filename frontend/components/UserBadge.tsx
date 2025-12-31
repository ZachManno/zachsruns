'use client';

import { User } from '@/types';

interface UserBadgeProps {
  user: User;
}

export default function UserBadge({ user }: UserBadgeProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold">{user.username}</span>
      {user.is_verified ? (
        <span className="bg-green-500 text-white px-2 py-1 rounded text-xs">
          Verified
        </span>
      ) : (
        <span className="bg-gray-300 text-gray-700 px-2 py-1 rounded text-xs">
          Unverified
        </span>
      )}
      {user.is_admin && (
        <span className="bg-basketball-orange text-white px-2 py-1 rounded text-xs">
          Admin
        </span>
      )}
    </div>
  );
}

