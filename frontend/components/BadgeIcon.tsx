'use client';

interface BadgeIconProps {
  badge?: 'vip' | 'regular' | 'rookie' | 'plus_one' | null;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const badgeConfig = {
  vip: {
    emoji: '🏆',
    name: 'VIP',
    color: 'text-yellow-500',
  },
  regular: {
    emoji: '⭐',
    name: 'Regular',
    color: 'text-basketball-orange',
  },
  rookie: {
    emoji: '🌱',
    name: 'Rookie',
    color: 'text-green-500',
  },
  plus_one: {
    emoji: '➕',
    name: '+1',
    color: 'text-gray-500',
  },
};

const sizeClasses = {
  small: 'text-xs',
  medium: 'text-base',
  large: 'text-4xl',
};

export default function BadgeIcon({ badge, size = 'medium', showText = false }: BadgeIconProps) {
  if (!badge || !badgeConfig[badge]) {
    return null;
  }

  const config = badgeConfig[badge];
  const sizeClass = sizeClasses[size];

  return (
    <span
      className={`inline-flex items-center gap-1 ${sizeClass} ${config.color}`}
      title={config.name}
    >
      <span>{config.emoji}</span>
      {showText && <span className="text-xs font-semibold">{config.name}</span>}
    </span>
  );
}

