'use client';

import { useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';
import { Announcement } from '@/types';

export default function AnnouncementBanner() {
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnnouncement = async () => {
      try {
        const data = await adminApi.getAnnouncement();
        setAnnouncement(data.announcement);
      } catch (error) {
        console.error('Failed to fetch announcement:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncement();
  }, []);

  if (loading || !announcement) {
    return null;
  }

  return (
    <div className="glow-edge animate-fade-in rounded-2xl border border-ember-500/30 bg-gradient-to-r from-ember-500/15 via-ember-500/5 to-transparent px-4 py-3">
      <p className="text-sm text-zinc-200">
        <span className="font-semibold uppercase tracking-wider text-ember-400">Announcement</span>
        <span className="mx-2 text-court-600">/</span>
        <span>{announcement.message}</span>
      </p>
    </div>
  );
}
