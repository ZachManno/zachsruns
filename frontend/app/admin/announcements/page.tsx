'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Announcement } from '@/types';
import Link from 'next/link';

export default function AnnouncementsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }

    if (user && user.is_admin) {
      fetchAnnouncement();
    }
  }, [user, authLoading, router]);

  const fetchAnnouncement = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAnnouncement();
      setAnnouncement(data.announcement);
      if (data.announcement) {
        setMessage(data.announcement.message);
      }
    } catch (error) {
      console.error('Failed to fetch announcement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await adminApi.createAnnouncement(message);
      setSuccess('Announcement updated successfully');
      await fetchAnnouncement();
    } catch (err: any) {
      setError(err.message || 'Failed to update announcement');
    } finally {
      setSubmitting(false);
    }
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

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/dashboard"
            className="text-basketball-orange hover:underline"
          >
            ← Back to Dashboard
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-basketball-black mb-6">
            Manage Announcements
          </h1>

          {announcement && (
            <div className="mb-6 p-4 bg-gray-100 rounded">
              <p className="text-sm text-gray-600 mb-2">Current Announcement:</p>
              <p className="text-gray-800">{announcement.message}</p>
              <p className="text-xs text-gray-500 mt-2">
                Created:{' '}
                {new Date(announcement.created_at).toLocaleString()}
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Announcement Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
                placeholder="Enter announcement message..."
              />
              <p className="text-sm text-gray-500 mt-1">
                This will replace any existing announcement.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-basketball-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Updating...' : 'Update Announcement'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

