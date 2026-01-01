'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { locationsApi } from '@/lib/api';
import { Location } from '@/types';

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
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={fetchLocations}
            className="mt-4 bg-basketball-orange text-white px-4 py-2 rounded hover:bg-orange-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 md:py-12">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-4xl font-bold text-basketball-black mb-4 md:mb-8 text-center">
          Locations
        </h1>

        {locations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {locations.map((location) => (
              <div
                key={location.id}
                className="bg-white rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl md:text-2xl font-bold text-basketball-black mb-2 md:mb-3">
                  {location.name}
                </h2>
                <p className="text-gray-700 mb-2">
                  <span className="font-semibold">Address:</span> {location.address}
                </p>
                {location.description && (
                  <p className="text-gray-600 text-sm mt-4">
                    {location.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No locations available.</p>
          </div>
        )}
      </div>
    </div>
  );
}

