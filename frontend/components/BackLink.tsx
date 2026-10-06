import Link from 'next/link';

interface BackLinkProps {
  href: string;
  label: string;
}

export default function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link
      href={href}
      className="text-sm text-zinc-500 transition-colors hover:text-ember-400"
    >
      ← {label}
    </Link>
  );
}
