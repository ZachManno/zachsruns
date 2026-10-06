'use client';

interface BadgeIconProps {
  badge?: 'regular' | 'plus_one' | null;
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const StarGlyph = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M12 2.6l2.64 5.86 6.36.72-4.74 4.3 1.3 6.28L12 16.6l-5.56 3.16 1.3-6.28L3 9.18l6.36-.72L12 2.6z" />
  </svg>
);

const PlusOneGlyph = ({ className }: { className: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
    <path d="M9 11.2a3.9 3.9 0 100-7.8 3.9 3.9 0 000 7.8zM9 12.8c-3.4 0-6.2 1.9-6.2 4.2v2.2a.8.8 0 00.8.8h10.8a.8.8 0 00.8-.8V17c0-2.3-2.8-4.2-6.2-4.2z" />
    <path d="M18.4 7.6v2.1h2.1a.9.9 0 010 1.8h-2.1v2.1a.9.9 0 01-1.8 0v-2.1h-2.1a.9.9 0 010-1.8h2.1V7.6a.9.9 0 011.8 0z" />
  </svg>
);

const badgeConfig = {
  regular: {
    Glyph: StarGlyph,
    name: 'Regular',
    color: 'text-ember-400',
  },
  plus_one: {
    Glyph: PlusOneGlyph,
    name: '+1',
    color: 'text-sky-400',
  },
};

const glyphSizes = {
  small: 'h-3.5 w-3.5',
  medium: 'h-4 w-4',
  large: 'h-7 w-7',
};

export default function BadgeIcon({ badge, size = 'medium', showText = false }: BadgeIconProps) {
  if (!badge || !badgeConfig[badge]) {
    return null;
  }

  const { Glyph, name, color } = badgeConfig[badge];

  return (
    <span className={`inline-flex items-center gap-1 ${color}`} title={name}>
      <Glyph className={glyphSizes[size]} />
      {showText && <span className="text-xs font-semibold">{name}</span>}
    </span>
  );
}
