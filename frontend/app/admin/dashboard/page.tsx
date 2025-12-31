'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-basketball-black mb-8">
          Admin Dashboard
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/admin/create-run"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Create Run
            </h2>
            <p className="text-gray-600">
              Create a new basketball run event
            </p>
          </Link>

          <Link
            href="/admin/manage-runs"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Manage Runs
            </h2>
            <p className="text-gray-600">
              View, edit, complete, or delete runs
            </p>
          </Link>

          <Link
            href="/admin/manage-badges"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Manage Badges
            </h2>
            <p className="text-gray-600">
              Assign badges to users (VIP, Regular, Rookie, +1)
            </p>
          </Link>

          <Link
            href="/admin/announcements"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Manage Announcements
            </h2>
            <p className="text-gray-600">
              Create or update site announcements
            </p>
          </Link>

          <Link
            href="/admin/import-data"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Import Historical Data
            </h2>
            <p className="text-gray-600">
              Import past runs from JSON file
            </p>
          </Link>

          <Link
            href="/admin/verify-users"
            className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
          >
            <h2 className="text-xl font-bold text-basketball-black mb-2">
              Verify Users
            </h2>
            <p className="text-gray-600">
              Manage user verification status
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

