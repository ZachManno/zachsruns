'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { locationsApi } from '@/lib/api';
import { Location } from '@/types';
import PageHeader from '@/components/PageHeader';

export default function LocationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    if (user) {
      fetchLocations();
    }
  }, [user, authLoading, router]);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch (err: any) {
      console.error('Failed to fetch locations:', err);
      setError(err.message || 'Failed to load locations');
    } finally {
      setLoading(false);
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

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="page">
        <div className="py-20 text-center">
          <p className="text-red-300">{error}</p>
          <button onClick={fetchLocations} className="btn btn-primary mt-4">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          eyebrow="Where we play"
          title="Locations"
          description="The gyms and courts we run at."
        />

        {locations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-3">
            {locations.map((location) => (
              <div key={location.id} className="card card-interactive overflow-hidden">
                {location.image_url && (
                  <div className="relative h-44 w-full overflow-hidden bg-court-900 md:h-52">
                    <img
                      src={location.image_url}
                      alt={location.name}
                      className="h-full w-full object-cover opacity-80 saturate-[0.85] transition-all duration-300 hover:scale-[1.03] hover:opacity-100 hover:saturate-100"
                      onError={(e) => {
                        // Hide image container if image fails to load
                        const container = (e.target as HTMLImageElement).parentElement;
                        if (container) {
                          container.style.display = 'none';
                        }
                      }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-court-950 via-court-950/20 to-transparent" />
                  </div>
                )}
                <div className="p-4 md:p-5">
                  <h2 className="font-display text-lg font-bold tracking-tight text-white md:text-xl">
                    {location.name}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">{location.address}</p>
                  {location.description && (
                    <p className="mt-3 border-t border-court-800 pt-3 text-sm leading-relaxed text-zinc-400">
                      {location.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="card card-pad py-16 text-center">
            <p className="text-zinc-500">No locations available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
