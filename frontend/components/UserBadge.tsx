'use client';

import { User } from '@/types';
import BadgeIcon from './BadgeIcon';

interface UserBadgeProps {
  user: User;
}

export default function UserBadge({ user }: UserBadgeProps) {
  const displayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`
    : user.username;
  
  const badgeName = user.badge === 'vip' ? 'VIP' :
                    user.badge === 'regular' ? 'Regular' :
                    user.badge === 'rookie' ? 'Rookie' :
                    user.badge === 'plus_one' ? '+1' : null;

  return (
    <div className="flex items-center gap-2">
      <span className="font-semibold text-basketball-black">{displayName}</span>
      {user.badge && (
        <span className="flex items-center gap-1">
          <BadgeIcon badge={user.badge} size="small" />
          {badgeName && <span className="text-xs text-gray-600">({badgeName})</span>}
        </span>
      )}
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

