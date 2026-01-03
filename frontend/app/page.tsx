'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { runsApi } from '@/lib/api';
import { Run } from '@/types';
import RunCard from '@/components/RunCard';
import AnnouncementBanner from '@/components/AnnouncementBanner';

export default function Home() {
  const searchParams = useSearchParams();
  const [upcomingRuns, setUpcomingRuns] = useState<Run[]>([]);
  const [pastRuns, setPastRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await runsApi.getAll();
      setUpcomingRuns(data.upcoming);
      setPastRuns(data.past);
      setError(null);
    } catch (err) {
      setError('Failed to load runs');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRuns();
    
    // Check for signup success parameter
    if (searchParams.get('signup') === 'success') {
      setShowSignupSuccess(true);
      // Auto-dismiss after 10 seconds
      const timer = setTimeout(() => {
        setShowSignupSuccess(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      <AnnouncementBanner />
      
      {showSignupSuccess && (
        <div className="mt-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          <p className="text-sm md:text-base">
            The admin will need to verify your account before you can RSVP for runs.
          </p>
        </div>
      )}
      
      <div className="mt-4 md:mt-8">
        <h1 className="text-2xl md:text-4xl font-bold text-basketball-black mb-4 md:mb-8 text-center">
          Zach&apos;s Organized Runs
        </h1>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Loading runs...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchRuns}
              className="mt-4 bg-basketball-orange text-white px-4 py-2 rounded hover:bg-orange-600"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {upcomingRuns.length > 0 && (
              <div className="mb-8 md:mb-12">
                <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-3 md:mb-4">
                  Upcoming Runs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {upcomingRuns.map((run) => (
                    <RunCard key={run.id} run={run} onUpdate={fetchRuns} />
                  ))}
                </div>
              </div>
            )}

            {pastRuns.length > 0 && (
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-3 md:mb-4">
                  Past Runs
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {pastRuns.map((run) => (
                    <RunCard key={run.id} run={run} onUpdate={fetchRuns} />
                  ))}
                </div>
              </div>
            )}

            {upcomingRuns.length === 0 && pastRuns.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-600">No runs scheduled yet.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

