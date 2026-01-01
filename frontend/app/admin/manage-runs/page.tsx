'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi, runsApi } from '@/lib/api';
import { Run } from '@/types';
import Link from 'next/link';

export default function ManageRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }

    if (user && user.is_admin) {
      fetchRuns();
    }
  }, [user, authLoading, router]);

  const fetchRuns = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAllRuns();
      setRuns(data.runs);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (runId: string) => {
    if (!confirm('Are you sure you want to delete this run?')) return;

    try {
      await runsApi.delete(runId);
      await fetchRuns();
    } catch (error: any) {
      console.error('Failed to delete run:', error);
      alert(error.message || 'Failed to delete run');
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

  const upcomingRuns = runs.filter(r => !r.is_completed);
  const completedRuns = runs.filter(r => r.is_completed);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-6xl mx-auto">
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
            Manage Runs
          </h1>

          <div className="space-y-8">
            {/* Upcoming Runs */}
            <div>
              <h2 className="text-2xl font-bold text-basketball-black mb-4">
                Upcoming Runs ({upcomingRuns.length})
              </h2>
              {upcomingRuns.length > 0 ? (
                <div className="space-y-4">
                  {upcomingRuns.map((run) => (
                    <RunRow
                      key={run.id}
                      run={run}
                      onDelete={handleDelete}
                      onRefresh={fetchRuns}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No upcoming runs</p>
              )}
            </div>

            {/* Completed Runs */}
            <div>
              <h2 className="text-2xl font-bold text-basketball-black mb-4">
                Completed Runs ({completedRuns.length})
              </h2>
              {completedRuns.length > 0 ? (
                <div className="space-y-4">
                  {completedRuns.map((run) => (
                    <RunRow
                      key={run.id}
                      run={run}
                      onDelete={handleDelete}
                      onRefresh={fetchRuns}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No completed runs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RunRow({ run, onDelete, onRefresh }: { run: Run; onDelete: (id: string) => void; onRefresh: () => void }) {
  const router = useRouter();

  const formatDate = (dateString: string) => {
    // Parse date string (YYYY-MM-DD) directly to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeRange = (start: string, end: string) => {
    const startTime = new Date(`2000-01-01T${start}:00`);
    const endTime = new Date(`2000-01-01T${end}:00`);
    
    const startHour = startTime.getHours();
    const startMin = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMin = endTime.getMinutes();
    
    const formatHour = (hour: number) => {
      if (hour === 0) return '12';
      if (hour > 12) return (hour - 12).toString();
      return hour.toString();
    };
    
    const getPeriod = (hour: number) => hour >= 12 ? 'pm' : 'am';
    
    const startStr = `${formatHour(startHour)}${startMin > 0 ? `:${startMin.toString().padStart(2, '0')}` : ''}${getPeriod(startHour)}`;
    const endStr = `${formatHour(endHour)}${endMin > 0 ? `:${endMin.toString().padStart(2, '0')}` : ''}${getPeriod(endHour)}`;
    
    return `${startStr}-${endStr}`;
  };

  return (
    <div className={`border rounded-lg p-4 ${run.is_completed ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-basketball-black">{run.title}</h3>
            {run.is_completed && (
              <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-semibold">
                Completed
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">
            {formatDate(run.date)} • {formatTimeRange(run.start_time, run.end_time)} • {run.location_name}
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {run.participant_counts?.confirmed || 0} confirmed
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/admin/complete-run/${run.id}`}
            className={`px-3 py-1 rounded text-sm ${
              run.is_completed
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {run.is_completed ? 'Completed' : 'Complete'}
          </Link>
          <Link
            href={`/admin/edit-run/${run.id}`}
            className={`px-3 py-1 rounded text-sm ${
              run.is_completed
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            Edit
          </Link>
          <button
            onClick={() => onDelete(run.id)}
            disabled={run.is_completed}
            className={`px-3 py-1 rounded text-sm ${
              run.is_completed
                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                : 'bg-red-600 text-white hover:bg-red-700'
            }`}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

