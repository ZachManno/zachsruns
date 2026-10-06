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
  
  const badgeName = user.badge === 'regular' ? 'Regular' :
                    user.badge === 'plus_one' ? '+1' : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-display text-lg font-bold tracking-tight text-white">{displayName}</span>
      {user.badge && (
        <span className="chip chip-neutral">
          <BadgeIcon badge={user.badge} size="small" />
          {badgeName && <span>{badgeName}</span>}
        </span>
      )}
      {user.is_verified ? (
        <span className="chip chip-green">Verified</span>
      ) : (
        <span className="chip chip-neutral">Unverified</span>
      )}
      {user.is_admin && <span className="chip chip-orange">Admin</span>}
    </div>
  );
}
