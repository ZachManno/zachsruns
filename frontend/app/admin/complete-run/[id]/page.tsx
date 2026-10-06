'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { adminApi, runsApi } from '@/lib/api';
import { Run, User } from '@/types';
import Link from 'next/link';
import BadgeIcon from '@/components/BadgeIcon';
import BackLink from '@/components/BackLink';

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
      const confirmedParticipants = runData.run.participants?.confirmed || [];
      const confirmedIds = confirmedParticipants.map(p => {
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
      <div className="page">
        <div className="flex flex-col items-center gap-3 py-20">
          <div className="spinner" />
          <p className="text-sm text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !user.is_admin || !run) {
    return null;
  }

  if (run.is_completed) {
    return (
      <div className="page">
        <div className="mx-auto max-w-4xl">
          <div className="card card-pad">
            <div className="alert alert-warning">This run is already completed.</div>
            <div className="mt-4">
              <BackLink href="/admin/manage-runs" label="Back to Manage Runs" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const confirmedParticipants = run.participants?.confirmed || [];
  const availableUsersForExtra = allUsers.filter(
    u => !confirmedParticipants.some(p => p.username === u.username) && !extraAttendees.includes(u.id)
  );

  const totalAttended = attendedUserIds.size + extraAttendees.length + guestAttendees.length;

  // Row for a confirmed participant, tinted by their current attendance state
  const renderParticipantRow = (
    participant: (typeof confirmedParticipants)[number],
    tone: 'attended' | 'pending' | 'no-show'
  ) => {
    const userId = allUsers.find(u => u.username === participant.username)?.id;
    if (!userId) return null;

    const displayName = participant.first_name && participant.last_name
      ? `${participant.first_name} ${participant.last_name}`
      : participant.username;

    const toneClass = {
      attended: 'border-emerald-500/30 bg-emerald-500/[0.07]',
      pending: 'border-court-700 bg-court-900/60',
      'no-show': 'border-amber-500/30 bg-amber-500/[0.07]',
    }[tone];

    return (
      <div
        key={participant.username}
        className={`flex flex-col gap-3 rounded-xl border p-3 transition-colors sm:flex-row sm:items-center sm:justify-between ${toneClass}`}
      >
        <div className="flex items-center gap-2">
          {participant.badge && <BadgeIcon badge={participant.badge as any} size="small" />}
          <span className="font-medium text-ink">{displayName}</span>
        </div>
        <div className="flex shrink-0 gap-4">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={attendedUserIds.has(userId)}
              onChange={() => handleToggleAttended(userId)}
              className="field-checkbox"
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Attended
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={noShowUserIds.has(userId)}
              onChange={() => handleToggleNoShow(userId)}
              className="field-checkbox"
            />
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              No Show
            </span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5">
          <BackLink href="/admin/manage-runs" label="Back to Manage Runs" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Final whistle</p>
          <h1 className="heading-1 mt-2">Complete Run: {run.title}</h1>
          <p className="mt-2 text-sm text-zinc-400">
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
          <div className="accent-rule mt-5" />

          <div className="alert alert-warning mt-6">
            Once you complete this run, it will be locked from editing. Make sure all attendance
            information is correct.
          </div>

          {/* Attended Participants */}
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-3">
              <h2 className="heading-2 shrink-0">Attended</h2>
              <span className="chip chip-green shrink-0">{totalAttended}</span>
            </div>
            <div className="space-y-2">
              {/* Show confirmed participants who attended */}
              {confirmedParticipants
                .filter((participant) => {
                  const userId = allUsers.find(u => u.username === participant.username)?.id;
                  return userId && attendedUserIds.has(userId);
                })
                .map((participant) => renderParticipantRow(participant, 'attended'))}

              {/* Show confirmed participants who didn't attend yet (for toggling) */}
              {confirmedParticipants
                .filter((participant) => {
                  const userId = allUsers.find(u => u.username === participant.username)?.id;
                  return userId && !attendedUserIds.has(userId) && !noShowUserIds.has(userId);
                })
                .map((participant) => renderParticipantRow(participant, 'pending'))}

              {/* Show no-shows */}
              {confirmedParticipants
                .filter((participant) => {
                  const userId = allUsers.find(u => u.username === participant.username)?.id;
                  return userId && noShowUserIds.has(userId);
                })
                .map((participant) => renderParticipantRow(participant, 'no-show'))}
            </div>
          </div>

          {/* Extra Attendees */}
          <div className="mt-8">
            <h2 className="heading-2 mb-4">Extra Attendees (Didn&apos;t RSVP)</h2>
            
            {/* Existing Users */}
            {extraAttendees.length > 0 && (
              <div className="mb-4 space-y-2">
                <h3 className="stat-label">Existing Users</h3>
                {extraAttendees.map((userId) => {
                  const user = allUsers.find(u => u.id === userId);
                  if (!user) return null;
                  
                  const displayName = user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : user.username;

                  return (
                    <div
                      key={userId}
                      className="flex items-center justify-between rounded-xl border border-emerald-500/30 bg-emerald-500/[0.07] p-3"
                    >
                      <div className="flex items-center gap-2">
                        {user.badge && <BadgeIcon badge={user.badge} size="small" />}
                        <span className="font-medium text-ink">{displayName}</span>
                      </div>
                      <button
                        onClick={() => handleRemoveExtraAttendee(userId)}
                        className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
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
              <div className="mb-4 space-y-2">
                <h3 className="stat-label">Guests (Not Registered)</h3>
                {guestAttendees.map((name, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-sky-500/30 bg-sky-500/[0.07] p-3"
                  >
                    <span className="font-medium text-ink">{name}</span>
                    <button
                      onClick={() => handleRemoveGuest(name)}
                      className="text-xs font-semibold text-red-400 transition-colors hover:text-red-300"
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
                <label className="field-label">Add Existing User</label>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAddExtraAttendee(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="field-select"
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
              <label className="field-label">Add Guest (Not Registered)</label>
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
                  className="field-input flex-1"
                />
                <button onClick={handleAddGuest} className="btn btn-primary shrink-0">
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div className="panel-sunken mt-8 p-4">
            <h3 className="stat-label">Summary</h3>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="stat-tile">
                <p className="stat-label">Total Attended</p>
                <p className="stat-value mt-0.5 text-emerald-400">{totalAttended}</p>
              </div>
              <div className="stat-tile">
                <p className="stat-label">No Shows</p>
                <p className="stat-value mt-0.5 text-amber-400">{noShowUserIds.size}</p>
              </div>
            </div>
            {guestAttendees.length > 0 && (
              <p className="mt-2 text-xs text-zinc-500">
                ({guestAttendees.length} guest{guestAttendees.length !== 1 ? 's' : ''} included)
              </p>
            )}
            {run.is_variable_cost && run.total_cost && (
              <p className="mt-3 text-sm font-semibold text-ink">
                Final Cost:{' '}
                <span className="text-ember-400">
                  ${((Number(run.total_cost) || 0) / (totalAttended || 1)).toFixed(2)}
                </span>{' '}
                per person
              </p>
            )}
            {!run.is_variable_cost && run.cost && (
              <p className="mt-3 text-sm font-semibold text-ink">
                Final Cost: <span className="text-ember-400">${Number(run.cost).toFixed(2)}</span> per
                person
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button onClick={handleComplete} disabled={saving} className="btn btn-primary btn-lg">
              {saving ? 'Completing...' : 'Complete Run'}
            </button>
            <Link href="/admin/manage-runs" className="btn btn-secondary btn-lg">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
