'use client';

import { useEffect, useState, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { runsApi } from '@/lib/api';
import { Run } from '@/types';
import RunCard from '@/components/RunCard';
import AnnouncementBanner from '@/components/AnnouncementBanner';
import { useAuth } from '@/context/AuthContext';

const PAST_RUNS_LIMIT = 3;

function SectionHeading({ title, count }: { title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-center gap-4">
      <h2 className="heading-2 shrink-0">{title}</h2>
      {count !== undefined && <span className="chip chip-neutral shrink-0">{count}</span>}
      <span className="accent-rule" />
    </div>
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [upcomingRuns, setUpcomingRuns] = useState<Run[]>([]);
  const [pastRuns, setPastRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSignupSuccess, setShowSignupSuccess] = useState(false);
  const [showAllPastRuns, setShowAllPastRuns] = useState(false);

  const canViewRuns = user && (user.is_verified || user.is_admin);

  // `silent` keeps the run grid mounted when refreshing after an RSVP change
  const fetchRuns = useCallback(async (silent = false) => {
    try {
      if (!silent) setLoading(true);
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
  }, []);

  useEffect(() => {
    if (searchParams.get('signup') === 'success') {
      setShowSignupSuccess(true);
      const timer = setTimeout(() => setShowSignupSuccess(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  useEffect(() => {
    if (authLoading) return;
    if (!canViewRuns) {
      setLoading(false);
      return;
    }
    fetchRuns();
  }, [authLoading, canViewRuns, fetchRuns]);

  return (
    <div>
      <div className="container mx-auto px-4 pt-4">
        <AnnouncementBanner />
      </div>

      {/* ── Hero ── */}
      <section className="mt-3 md:mt-4">
        <div className="relative overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center md:hidden"
            style={{ backgroundImage: "url('/images/bball-backdrop-2-mobile.jpg')" }}
            aria-hidden
          />
          <div
            className="absolute inset-0 hidden bg-cover md:block"
            style={{
              backgroundImage: "url('/images/bball-backdrop-2.jpg')",
              backgroundPosition: 'center 40%',
            }}
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(8,8,10,0.12) 0%, rgba(8,8,10,0) 20%, rgba(8,8,10,0) 68%, rgba(8,8,10,0.7) 88%, rgba(8,8,10,1) 100%)',
            }}
            aria-hidden
          />

          <div className="container relative mx-auto flex min-h-[188px] items-center justify-center px-4 py-12 md:min-h-[340px] md:py-16">
            <div className="animate-rise-in mx-auto max-w-3xl text-center">
              <h1 className="inline-block rounded-2xl border border-white/10 bg-court-950/70 px-5 py-3 font-display text-[1.75rem] font-extrabold leading-[1.1] tracking-tight text-white backdrop-blur-md sm:px-8 sm:py-4 sm:text-4xl md:text-5xl">
                Zach&apos;s <span className="text-gradient-ember">Organized Runs</span>
              </h1>

              {!user && !authLoading && (
                <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href="/signup" className="btn btn-primary btn-lg">
                    Get Started
                  </Link>
                  <Link href="/login" className="btn btn-secondary btn-lg">
                    Log In
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="page pt-0">
        {showSignupSuccess && (
          <div className="alert alert-success animate-fade-in">
            <p>The admin will need to verify your account before you can RSVP for runs.</p>
          </div>
        )}

        <div className="mt-2 md:mt-4">
          {authLoading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="spinner" />
              <p className="text-sm text-zinc-500">Loading...</p>
            </div>
          ) : !user ? (
            /* ── Guest (not logged in) ── */
            <div className="mx-auto max-w-md py-6">
              <div className="card card-pad glow-edge space-y-5 text-center">
                <p className="leading-relaxed text-zinc-400">
                  Sign up for an account to see upcoming runs and RSVP once an admin verifies you.
                </p>
                <div className="flex flex-col justify-center gap-3 pt-1 sm:flex-row">
                  <Link href="/signup" className="btn btn-primary">
                    Sign Up
                  </Link>
                  <Link href="/login" className="btn btn-outline">
                    Log In
                  </Link>
                </div>
              </div>
            </div>
          ) : !canViewRuns ? (
            /* ── Logged in but not verified ── */
            <div className="mx-auto max-w-md py-6">
              <div className="card card-pad glow-edge space-y-5 text-center">
                <p className="font-display text-lg font-bold text-white">
                  Your account is pending verification
                </p>
                <p className="text-sm leading-relaxed text-zinc-500">
                  Once an admin verifies you, you&apos;ll be able to see upcoming runs and RSVP.
                </p>
                <Link href="/profile" className="btn btn-outline">
                  View your profile
                </Link>
              </div>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <div className="spinner" />
              <p className="text-sm text-zinc-500">Loading runs...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center">
              <p className="text-red-300">{error}</p>
              <button onClick={() => fetchRuns()} className="btn btn-primary mt-4">
                Retry
              </button>
            </div>
          ) : (
            <>
              {upcomingRuns.length > 0 && (
                <div className="mb-10 md:mb-14">
                  <SectionHeading title="Upcoming Runs" count={upcomingRuns.length} />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {upcomingRuns.map((run) => (
                      <RunCard key={run.id} run={run} onUpdate={() => fetchRuns(true)} />
                    ))}
                  </div>
                </div>
              )}

              {pastRuns.length > 0 && (
                <div>
                  <SectionHeading title="Past Runs" count={pastRuns.length} />
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
                    {(showAllPastRuns ? pastRuns : pastRuns.slice(0, PAST_RUNS_LIMIT)).map((run) => (
                      <RunCard key={run.id} run={run} onUpdate={() => fetchRuns(true)} />
                    ))}
                  </div>
                  {pastRuns.length > PAST_RUNS_LIMIT && (
                    <button
                      onClick={() => setShowAllPastRuns(!showAllPastRuns)}
                      className="btn btn-secondary btn-block mt-6 py-4 text-base"
                    >
                      {showAllPastRuns ? `Show less` : `Show all ${pastRuns.length} past runs`}
                    </button>
                  )}
                </div>
              )}

              {upcomingRuns.length === 0 && pastRuns.length === 0 && (
                <div className="card card-pad py-16 text-center">
                  <p className="text-zinc-500">No runs scheduled yet.</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="flex flex-col items-center gap-3 py-16">
            <div className="spinner" />
            <p className="text-sm text-zinc-500">Loading...</p>
          </div>
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}
