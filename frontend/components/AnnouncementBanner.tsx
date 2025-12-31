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
    <div className="bg-basketball-orange text-white py-3 px-4 shadow-md">
      <div className="container mx-auto">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-white">Announcement:</span>
          <span className="text-white">{announcement.message}</span>
        </div>
      </div>
    </div>
  );
}

