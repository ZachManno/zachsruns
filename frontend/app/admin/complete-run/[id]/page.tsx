'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { adminApi, runsApi } from '@/lib/api';
import { Run, User } from '@/types';
import Link from 'next/link';
import BadgeIcon from '@/components/BadgeIcon';

export default function CompleteRunPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const runId = params.id as string;
  
  const [run, setRun] = useState<Run | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Track attendance
  const [attendedUserIds, setAttendedUserIds] = useState<Set<string>>(new Set());
  const [noShowUserIds, setNoShowUserIds] = useState<Set<string>>(new Set());
  const [extraAttendees, setExtraAttendees] = useState<string[]>([]);  // User IDs
  const [guestAttendees, setGuestAttendees] = useState<string[]>([]);  // Guest names
  const [newGuestName, setNewGuestName] = useState('');

  useEffect(() => {
    if (!authLoading && (!user || !user.is_admin)) {
      router.push('/');
      return;
    }

    if (user && user.is_admin && runId) {
      fetchData();
    }
  }, [user, authLoading, router, runId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [runData, usersData] = await Promise.all([
        runsApi.getById(runId),
        adminApi.getUsers(),
      ]);
      
      setRun(runData.run);
      setAllUsers(usersData.users);
      
      // Initialize with all confirmed participants as attended by default
      const confirmedIds = runData.run.participants?.confirmed.map(p => {
        // Find user ID from username
        const user = usersData.users.find(u => u.username === p.username);
        return user?.id;
      }).filter(Boolean) as string[];
      
      setAttendedUserIds(new Set(confirmedIds));
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAttended = (userId: string) => {
    const newAttended = new Set(attendedUserIds);
    const newNoShow = new Set(noShowUserIds);
    
    if (newAttended.has(userId)) {
      newAttended.delete(userId);
    } else {
      newAttended.add(userId);
      newNoShow.delete(userId);
    }
    
    setAttendedUserIds(newAttended);
    setNoShowUserIds(newNoShow);
  };

  const handleToggleNoShow = (userId: string) => {
    const newAttended = new Set(attendedUserIds);
    const newNoShow = new Set(noShowUserIds);
    
    if (newNoShow.has(userId)) {
      newNoShow.delete(userId);
    } else {
      newNoShow.add(userId);
      newAttended.delete(userId);
    }
    
    setAttendedUserIds(newAttended);
    setNoShowUserIds(newNoShow);
  };

  const handleAddExtraAttendee = (userId: string) => {
    if (userId && !extraAttendees.includes(userId)) {
      setExtraAttendees([...extraAttendees, userId]);
    }
  };

  const handleRemoveExtraAttendee = (userId: string) => {
    setExtraAttendees(extraAttendees.filter(id => id !== userId));
  };

  const handleAddGuest = () => {
    const trimmedName = newGuestName.trim();
    if (trimmedName && !guestAttendees.includes(trimmedName)) {
      setGuestAttendees([...guestAttendees, trimmedName]);
      setNewGuestName('');
    }
  };

  const handleRemoveGuest = (name: string) => {
    setGuestAttendees(guestAttendees.filter(n => n !== name));
  };

  const handleComplete = async () => {
    if (!run) return;
    
    if (!confirm('Are you sure you want to complete this run? This action cannot be undone and the run will be locked from editing.')) {
      return;
    }

    try {
      setSaving(true);
      await adminApi.completeRun(
        runId,
        Array.from(attendedUserIds),
        Array.from(noShowUserIds),
        extraAttendees,
        guestAttendees
      );
      router.push('/admin/manage-runs');
    } catch (error: any) {
      console.error('Failed to complete run:', error);
      alert(error.message || 'Failed to complete run');
    } finally {
      setSaving(false);
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

  if (!user || !user.is_admin || !run) {
    return null;
  }

  if (run.is_completed) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <p className="text-yellow-800">This run is already completed.</p>
            <Link href="/admin/manage-runs" className="text-basketball-orange hover:underline mt-2 inline-block">
              ← Back to Manage Runs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const confirmedParticipants = run.participants?.confirmed || [];
  const availableUsersForExtra = allUsers.filter(
    u => !confirmedParticipants.some(p => p.username === u.username) && !extraAttendees.includes(u.id)
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link
            href="/admin/manage-runs"
            className="text-basketball-orange hover:underline"
          >
            ← Back to Manage Runs
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-basketball-black mb-2">
            Complete Run: {run.title}
          </h1>
          <p className="text-gray-600 mb-6">
            {(() => {
              // Parse date string (YYYY-MM-DD) directly to avoid timezone issues
              const [year, month, day] = run.date.split('T')[0].split('-').map(Number);
              const date = new Date(year, month - 1, day);
              return date.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              });
            })()}
          </p>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-sm">
              ⚠️ Once you complete this run, it will be locked from editing. Make sure all attendance information is correct.
            </p>
          </div>

          {/* Confirmed Participants */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-basketball-black mb-4">
              Confirmed Participants ({confirmedParticipants.length})
            </h2>
            <div className="space-y-2">
              {confirmedParticipants.map((participant) => {
                const userId = allUsers.find(u => u.username === participant.username)?.id;
                if (!userId) return null;
                
                const displayName = participant.first_name && participant.last_name
                  ? `${participant.first_name} ${participant.last_name}`
                  : participant.username;

                return (
                  <div
                    key={participant.username}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {participant.badge && <BadgeIcon badge={participant.badge as any} size="small" />}
                      <span className="font-medium text-gray-900">{displayName}</span>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={attendedUserIds.has(userId)}
                          onChange={() => handleToggleAttended(userId)}
                          className="rounded"
                        />
                        <span className="text-sm text-green-600">Attended</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={noShowUserIds.has(userId)}
                          onChange={() => handleToggleNoShow(userId)}
                          className="rounded"
                        />
                        <span className="text-sm text-orange-600">No Show</span>
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Extra Attendees */}
          <div className="mb-8">
            <h2 className="text-xl font-bold text-basketball-black mb-4">
              Extra Attendees (Didn't RSVP)
            </h2>
            
            {/* Existing Users */}
            {extraAttendees.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing Users</h3>
                {extraAttendees.map((userId) => {
                  const user = allUsers.find(u => u.id === userId);
                  if (!user) return null;
                  
                  const displayName = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username;

                  return (
                    <div
                      key={userId}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-green-50"
                    >
                      <div className="flex items-center gap-3">
                        {user.badge && <BadgeIcon badge={user.badge} size="small" />}
                        <span className="font-medium text-gray-900">{displayName}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveExtraAttendee(userId)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Guest Attendees (Non-users) */}
            {guestAttendees.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Guests (Not Registered)</h3>
                {guestAttendees.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-lg bg-blue-50"
                  >
                    <span className="font-medium text-gray-900">{name}</span>
                    <button
                      onClick={() => handleRemoveGuest(name)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {/* Add Existing User */}
            {availableUsersForExtra.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Add Existing User
                </label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddExtraAttendee(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                >
                  <option value="">Select a user...</option>
                  {availableUsersForExtra.map((user) => {
                    const displayName = user.first_name && user.last_name
                      ? `${user.first_name} ${user.last_name}`
                      : user.username;
                    return (
                      <option key={user.id} value={user.id}>
                        {displayName} (@{user.username})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            
            {/* Add Guest (Non-user) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Add Guest (Not Registered)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddGuest();
                    }
                  }}
                  placeholder="Enter guest name..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                />
                <button
                  onClick={handleAddGuest}
                  className="bg-basketball-orange text-white px-4 py-2 rounded-md hover:bg-orange-600 transition-colors"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-basketball-black mb-2">Summary</h3>
            <p className="text-sm text-gray-600">
              Attended: {attendedUserIds.size + extraAttendees.length + guestAttendees.length} • No Shows: {noShowUserIds.size}
            </p>
            {guestAttendees.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                ({guestAttendees.length} guest{guestAttendees.length !== 1 ? 's' : ''} included)
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={handleComplete}
              disabled={saving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Completing...' : 'Complete Run'}
            </button>
            <Link
              href="/admin/manage-runs"
              className="bg-gray-300 text-gray-700 px-6 py-2 rounded hover:bg-gray-400"
            >
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

