'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import { Announcement } from '@/types';
import BackLink from '@/components/BackLink';

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

  const handleClear = async () => {
    if (!announcement) return;
    
    if (!confirm('Are you sure you want to clear the current announcement? This will remove it from the banner.')) {
      return;
    }

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await adminApi.clearAnnouncement();
      setSuccess('Announcement cleared successfully');
      setAnnouncement(null);
      setMessage('');
      await fetchAnnouncement();
    } catch (err: any) {
      setError(err.message || 'Failed to clear announcement');
    } finally {
      setSubmitting(false);
    }
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

  if (!user || !user.is_admin) {
    return null;
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Broadcast</p>
          <h1 className="heading-1 mt-2">Manage Announcements</h1>
          <div className="accent-rule mt-5" />

          {announcement && (
            <div className="panel-sunken mt-6 p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="stat-label">Current Announcement</p>
                  <p className="mt-2 text-sm text-zinc-200">{announcement.message}</p>
                  <p className="mt-2 text-xs text-zinc-500">
                    Created {new Date(announcement.created_at).toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={handleClear}
                  disabled={submitting}
                  className="btn btn-danger btn-sm shrink-0"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          {error && <div className="alert alert-error mt-6">{error}</div>}
          {success && <div className="alert alert-success mt-6">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="message" className="field-label">
                Announcement Message
              </label>
              <textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                required
                className="field-textarea"
                placeholder="Enter announcement message..."
              />
              <p className="field-hint">This will replace any existing announcement.</p>
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg">
              {submitting ? 'Updating...' : 'Update Announcement'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
