'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/PageHeader';

const adminLinks: Array<{
  href: string;
  title: string;
  description: string;
}> = [
  {
    href: '/admin/create-run',
    title: 'Create Run',
    description: 'Create a new basketball run event',
  },
  {
    href: '/admin/manage-runs',
    title: 'Manage Runs',
    description: 'View, edit, complete, or delete runs',
  },
  {
    href: '/admin/manage-badges',
    title: 'Manage Badges',
    description: 'Assign badges to users (Regular, +1)',
  },
  {
    href: '/admin/announcements',
    title: 'Manage Announcements',
    description: 'Create or update site announcements',
  },
  {
    href: '/admin/private-groups',
    title: 'Private Groups',
    description: 'Manage private run groups and members',
  },
  {
    href: '/admin/import-data',
    title: 'Import Historical Data',
    description: 'Import past runs from JSON file',
  },
  {
    href: '/admin/verify-users',
    title: 'Manage Users',
    description: 'Manage user verification and active status',
  },
];

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || !user.is_admin)) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (loading || !user || !user.is_admin) {
    return (
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <PageHeader
          eyebrow="Control room"
          title="Admin Dashboard"
          description="Everything you need to run the league."
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5">
          {adminLinks.map((link) => (
            <Link key={link.href} href={link.href} className="card card-interactive group p-5">
              <h2 className="font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-ember-400 md:text-lg">
                {link.title}
              </h2>
              <p className="mt-1 text-sm text-zinc-400">{link.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
