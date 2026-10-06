'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi, runsApi } from '@/lib/api';
import { DropRequest, Run } from '@/types';
import Link from 'next/link';
import BadgeIcon from '@/components/BadgeIcon';
import BackLink from '@/components/BackLink';

function formatRunDate(dateString: string) {
  const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatRunTime(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const hour12 = hours % 12 || 12;
  const ampm = hours >= 12 ? 'pm' : 'am';
  return minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
}

function runStartMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + (minutes || 0);
}

function compareRunStart(a: Run, b: Run) {
  const dateDiff = a.date.split('T')[0].localeCompare(b.date.split('T')[0]);
  if (dateDiff !== 0) return dateDiff;
  return runStartMinutes(a.start_time) - runStartMinutes(b.start_time);
}

export default function ManageRunsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [runs, setRuns] = useState<Run[]>([]);
  const [dropRequests, setDropRequests] = useState<DropRequest[]>([]);
  const [resolvingDropId, setResolvingDropId] = useState<string | null>(null);
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

  const fetchRuns = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const [runsData, dropsData] = await Promise.all([
        adminApi.getAllRuns(),
        adminApi.getDropRequests(),
      ]);
      setRuns(runsData.runs);
      setDropRequests(dropsData.drop_requests);
    } catch (error) {
      console.error('Failed to fetch runs:', error);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleResolveDrop = async (requestId: string, action: 'approve' | 'deny') => {
    setResolvingDropId(requestId);
    try {
      if (action === 'approve') {
        await adminApi.approveDropRequest(requestId);
      } else {
        await adminApi.denyDropRequest(requestId);
      }
      await fetchRuns(true);
    } catch (error: any) {
      console.error('Failed to update drop request:', error);
      alert(error.message || 'Failed to update drop request');
    } finally {
      setResolvingDropId(null);
    }
  };

  const handleDelete = async (runId: string) => {
    if (!confirm("Are you sure you'd like to delete this entire run?")) return;

    try {
      await runsApi.delete(runId);
      await fetchRuns(true);
    } catch (error: any) {
      console.error('Failed to delete run:', error);
      alert(error.message || 'Failed to delete run');
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

  const upcomingRuns = runs.filter(r => !r.is_completed).sort((a, b) => compareRunStart(a, b));
  const completedRuns = runs.filter(r => r.is_completed).sort((a, b) => compareRunStart(b, a));

  return (
    <div className="page">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Scheduling</p>
          <h1 className="heading-1 mt-2">Manage Runs</h1>
          <div className="accent-rule mt-5" />

          <div className="mt-8">
            <div className="mb-1 flex items-center gap-3">
              <h2 className="heading-2 shrink-0">Pending drops</h2>
              <span className={`chip shrink-0 ${dropRequests.length > 0 ? 'chip-amber' : 'chip-neutral'}`}>
                {dropRequests.length}
              </span>
            </div>
            <p className="mb-4 text-sm text-zinc-500">
              They stay confirmed until you approve. Approval emails everyone still confirmed or interested.
            </p>
            {dropRequests.length > 0 ? (
              <div className="space-y-3">
                {dropRequests.map((request) => {
                  const name = [request.first_name, request.last_name].filter(Boolean).join(' ') || request.username;
                  const requestedLabel = request.requested_status === 'interested' ? 'Interested' : 'Out';
                  return (
                    <div
                      key={request.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-4 md:flex-row md:items-center"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-ink">
                          {name} wants to drop to {requestedLabel}
                        </p>
                        <p className="mt-0.5 text-sm text-zinc-400">
                          {request.run_title} · {formatRunDate(request.run_date)} · {formatRunTime(request.run_start_time)}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => handleResolveDrop(request.id, 'approve')}
                          disabled={resolvingDropId === request.id}
                          className="btn btn-success btn-sm px-3 py-2"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveDrop(request.id, 'deny')}
                          disabled={resolvingDropId === request.id}
                          className="btn btn-danger btn-sm px-3 py-2"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-500">No pending drop requests</p>
            )}
          </div>

          <div className="mt-10 space-y-10">
            {/* Upcoming Runs */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="heading-2 shrink-0">Upcoming Runs</h2>
                <span className="chip chip-neutral shrink-0">{upcomingRuns.length}</span>
              </div>
              {upcomingRuns.length > 0 ? (
                <div className="space-y-3">
                  {upcomingRuns.map((run) => (
                    <RunRow
                      key={run.id}
                      run={run}
                      onDelete={handleDelete}
                      onRefresh={() => fetchRuns(true)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No upcoming runs</p>
              )}
            </div>

            {/* Completed Runs */}
            <div>
              <div className="mb-4 flex items-center gap-3">
                <h2 className="heading-2 shrink-0">Completed Runs</h2>
                <span className="chip chip-neutral shrink-0">{completedRuns.length}</span>
              </div>
              {completedRuns.length > 0 ? (
                <div className="space-y-3">
                  {completedRuns.map((run) => (
                    <RunRow
                      key={run.id}
                      run={run}
                      onDelete={handleDelete}
                      onRefresh={() => fetchRuns(true)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">No completed runs</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface RsvpUser {
  id: string;
  username: string;
  first_name?: string;
  last_name?: string;
  badge?: string;
  status?: string;
}

interface RsvpData {
  participants: {
    confirmed: RsvpUser[];
    interested: RsvpUser[];
    out: RsvpUser[];
  };
  available_users: RsvpUser[];
  capacity: number | null;
}

function RunRow({ run, onDelete, onRefresh }: { run: Run; onDelete: (id: string) => void; onRefresh: () => void }) {
  const [showRemindModal, setShowRemindModal] = useState(false);
  const [reminderMessage, setReminderMessage] = useState('');
  const [sendingReminder, setSendingReminder] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [rsvpData, setRsvpData] = useState<RsvpData | null>(null);
  const [loadingRsvps, setLoadingRsvps] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

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

  const handleRemind = async () => {
    if (!reminderMessage.trim()) {
      alert('Please enter a reminder message');
      return;
    }

    if (reminderMessage.length > 100) {
      alert('Reminder message must be 100 characters or less');
      return;
    }

    setSendingReminder(true);
    try {
      await adminApi.sendRunReminder(run.id, reminderMessage);
      setShowRemindModal(false);
      setReminderMessage('');
      alert('Reminder sent successfully!');
    } catch (error: any) {
      console.error('Failed to send reminder:', error);
      alert(error.message || 'Failed to send reminder');
    } finally {
      setSendingReminder(false);
    }
  };

  const fetchRsvps = async () => {
    setLoadingRsvps(true);
    try {
      const data = await adminApi.getRunRsvps(run.id);
      setRsvpData(data);
    } catch (error) {
      console.error('Failed to fetch RSVPs:', error);
    } finally {
      setLoadingRsvps(false);
    }
  };

  const handleToggleExpand = () => {
    if (!expanded && !rsvpData) {
      fetchRsvps();
    }
    setExpanded(!expanded);
  };

  const handleStatusChange = async (
    userId: string, 
    newStatus: 'confirmed' | 'interested' | 'out' | null,
    userName: string,
    previousStatus: 'confirmed' | 'interested' | 'out' | null
  ) => {
    setUpdatingUserId(userId);
    try {
      await adminApi.setUserRsvp(run.id, userId, newStatus);
      await fetchRsvps();
      onRefresh(); // Refresh the run data to update participant counts
      
      // Show success message
      const formatStatus = (status: string | null) => {
        if (!status) return 'None';
        return status.charAt(0).toUpperCase() + status.slice(1);
      };
      
      if (newStatus === null) {
        alert(`Successfully removed ${userName}'s RSVP (was ${formatStatus(previousStatus)})`);
      } else {
        alert(`Successfully changed ${userName}'s RSVP from ${formatStatus(previousStatus)} to ${formatStatus(newStatus)}`);
      }
    } catch (error: any) {
      console.error('Failed to update RSVP:', error);
      alert(error.message || 'Failed to update RSVP');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleAddUser = async (userId: string, status: 'confirmed' | 'interested' | 'out', userName: string) => {
    await handleStatusChange(userId, status, userName, null);
  };

  const getDisplayName = (user: RsvpUser) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    return user.username;
  };

  const confirmedCount = rsvpData?.participants.confirmed.length || 0;
  const isAtCapacity = rsvpData?.capacity ? confirmedCount >= rsvpData.capacity : false;

  const lockedButtonClass =
    'btn btn-sm cursor-not-allowed border border-court-700 bg-court-800/60 text-zinc-600 px-2 py-2 md:px-3 text-xs md:text-sm';

  return (
    <div
      className={`rounded-xl border transition-colors ${
        run.is_completed
          ? 'border-court-800 bg-court-900/50'
          : 'border-court-700 bg-court-850/70 hover:border-court-600'
      }`}
    >
      <div className="p-3 md:p-4">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Run Info */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start gap-2 md:items-center">
              <h3 className="font-display text-base font-bold tracking-tight text-ink md:text-lg">
                {run.title}
              </h3>
              {run.private_group_name && (
                <span className="chip chip-blue whitespace-nowrap">{run.private_group_name}</span>
              )}
              {run.is_completed && <span className="chip chip-green whitespace-nowrap">Completed</span>}
            </div>
            <p className="mt-1 text-xs text-zinc-400 md:text-sm">
              {formatDate(run.date)} • {formatTimeRange(run.start_time, run.end_time)} • {run.location_name}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              {run.participant_counts?.confirmed || 0} confirmed
              {run.capacity && ` / ${run.capacity}`}
            </p>
          </div>
          
          {/* Action Buttons - Grid on mobile, flex on desktop */}
          <div className="grid shrink-0 grid-cols-3 gap-1.5 md:flex md:gap-2">
            {!run.is_completed && (
              <button
                onClick={handleToggleExpand}
                className="btn btn-sm whitespace-nowrap px-2 py-2 text-xs md:px-3 md:text-sm btn-outline"
              >
                {expanded ? 'Hide' : 'RSVPs'}
              </button>
            )}
            <Link
              href={`/admin/complete-run/${run.id}`}
              className={
                run.is_completed
                  ? `${lockedButtonClass} text-center`
                  : 'btn btn-success btn-sm px-2 py-2 text-center text-xs md:px-3 md:text-sm'
              }
            >
              {run.is_completed ? 'Done' : 'Complete'}
            </Link>
            <Link
              href={`/admin/edit-run/${run.id}`}
              className={
                run.is_completed
                  ? `${lockedButtonClass} text-center`
                  : 'btn btn-secondary btn-sm px-2 py-2 text-center text-xs md:px-3 md:text-sm'
              }
            >
              Edit
            </Link>
            <button
              onClick={() => setShowRemindModal(true)}
              disabled={run.is_completed}
              className={
                run.is_completed
                  ? lockedButtonClass
                  : 'btn btn-sm border border-violet-500/40 bg-violet-500/10 px-2 py-2 text-xs text-violet-300 hover:border-violet-500/70 hover:bg-violet-500/20 hover:text-violet-200 md:px-3 md:text-sm'
              }
            >
              Remind
            </button>
            <button
              onClick={() => onDelete(run.id)}
              disabled={run.is_completed}
              className={
                run.is_completed
                  ? lockedButtonClass
                  : 'btn btn-danger btn-sm px-2 py-2 text-xs md:px-3 md:text-sm'
              }
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Expandable RSVP Management Section */}
      {expanded && !run.is_completed && (
        <div className="animate-fade-in border-t border-court-800 bg-court-900/60 p-4">
          {loadingRsvps ? (
            <p className="text-sm text-zinc-500">Loading RSVPs...</p>
          ) : rsvpData ? (
            <div className="space-y-5">
              {/* Capacity Warning */}
              {isAtCapacity && (
                <div className="alert alert-warning text-xs">
                  Run is at capacity ({rsvpData.capacity})
                </div>
              )}

              {/* Confirmed Section */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Confirmed ({rsvpData.participants.confirmed.length})
                </h4>
                {rsvpData.participants.confirmed.length > 0 ? (
                  <div className="space-y-1.5">
                    {rsvpData.participants.confirmed.map((user) => (
                      <UserRsvpRow
                        key={user.id}
                        user={user}
                        currentStatus="confirmed"
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingUserId === user.id}
                        isAtCapacity={false}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No confirmed users</p>
                )}
              </div>

              {/* Interested Section */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Interested ({rsvpData.participants.interested.length})
                </h4>
                {rsvpData.participants.interested.length > 0 ? (
                  <div className="space-y-1.5">
                    {rsvpData.participants.interested.map((user) => (
                      <UserRsvpRow
                        key={user.id}
                        user={user}
                        currentStatus="interested"
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingUserId === user.id}
                        isAtCapacity={isAtCapacity}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No interested users</p>
                )}
              </div>

              {/* Out Section */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                  Out ({rsvpData.participants.out.length})
                </h4>
                {rsvpData.participants.out.length > 0 ? (
                  <div className="space-y-1.5">
                    {rsvpData.participants.out.map((user) => (
                      <UserRsvpRow
                        key={user.id}
                        user={user}
                        currentStatus="out"
                        onStatusChange={handleStatusChange}
                        isUpdating={updatingUserId === user.id}
                        isAtCapacity={isAtCapacity}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">No users marked as out</p>
                )}
              </div>

              {/* Add User Section */}
              {rsvpData.available_users.length > 0 && (
                <div className="border-t border-court-800 pt-4">
                  <h4 className="field-label">Add User</h4>
                  <div className="flex flex-col gap-2 md:flex-row">
                    <select
                      id={`add-user-${run.id}`}
                      className="field-select flex-1 py-2 text-xs"
                      defaultValue=""
                    >
                      <option value="" disabled>Select a user...</option>
                      {rsvpData.available_users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getDisplayName(user)} (@{user.username})
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <select
                        id={`add-status-${run.id}`}
                        className="field-select flex-1 py-2 text-xs md:flex-none"
                        defaultValue="confirmed"
                      >
                        <option value="confirmed" disabled={isAtCapacity}>Confirmed</option>
                        <option value="interested">Interested</option>
                        <option value="out">Out</option>
                      </select>
                      <button
                        onClick={() => {
                          const userSelect = document.getElementById(`add-user-${run.id}`) as HTMLSelectElement;
                          const statusSelect = document.getElementById(`add-status-${run.id}`) as HTMLSelectElement;
                          const userId = userSelect.value;
                          const status = statusSelect.value as 'confirmed' | 'interested' | 'out';
                          if (userId) {
                            const selectedOption = userSelect.options[userSelect.selectedIndex];
                            const userName = selectedOption.text.split(' (@')[0]; // Extract name from "Name (@username)"
                            handleAddUser(userId, status, userName);
                            userSelect.value = '';
                          }
                        }}
                        className="btn btn-primary btn-sm whitespace-nowrap px-4 py-2"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-500">Failed to load RSVPs</p>
          )}
        </div>
      )}

      {/* Remind Modal */}
      {showRemindModal && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-md animate-rise-in">
            <h3 className="heading-2 mb-4">Send Reminder: {run.title}</h3>
            <div className="mb-5">
              <label className="field-label">
                Reminder Message <span className="text-ember-400">*</span>
              </label>
              <input
                type="text"
                value={reminderMessage}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setReminderMessage(e.target.value);
                  }
                }}
                placeholder="Enter reminder message (max 100 characters)"
                className="field-input"
                maxLength={100}
                autoFocus
              />
              <p className="field-hint">{reminderMessage.length}/100 characters</p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowRemindModal(false);
                  setReminderMessage('');
                }}
                disabled={sendingReminder}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleRemind}
                disabled={sendingReminder || !reminderMessage.trim()}
                className="btn btn-primary"
              >
                {sendingReminder ? 'Sending...' : 'Send Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserRsvpRow({
  user,
  currentStatus,
  onStatusChange,
  isUpdating,
  isAtCapacity,
}: {
  user: RsvpUser;
  currentStatus: 'confirmed' | 'interested' | 'out';
  onStatusChange: (userId: string, status: 'confirmed' | 'interested' | 'out' | null, userName: string, previousStatus: 'confirmed' | 'interested' | 'out' | null) => void;
  isUpdating: boolean;
  isAtCapacity: boolean;
}) {
  const displayName = user.first_name && user.last_name
    ? `${user.first_name} ${user.last_name}`
    : user.username;

  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-court-700 bg-court-850/80 p-2 md:flex-row md:items-center">
      {/* User Info */}
      <div className="flex min-w-0 items-center gap-2 pl-1">
        {user.badge && <BadgeIcon badge={user.badge as 'regular' | 'plus_one'} size="small" />}
        <span className="truncate text-sm text-zinc-100">{displayName}</span>
        <span className="hidden text-xs text-zinc-500 md:inline">@{user.username}</span>
      </div>
      {/* Controls */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <select
          value={currentStatus}
          onChange={(e) => {
            const newStatus = e.target.value as 'confirmed' | 'interested' | 'out';
            if (newStatus !== currentStatus) {
              onStatusChange(user.id, newStatus, displayName, currentStatus);
            }
          }}
          disabled={isUpdating}
          className="field-select w-32 py-1.5 text-xs"
        >
          <option value="confirmed" disabled={isAtCapacity && currentStatus !== 'confirmed'}>
            Confirmed
          </option>
          <option value="interested">Interested</option>
          <option value="out">Out</option>
        </select>
        <button
          onClick={() => onStatusChange(user.id, null, displayName, currentStatus)}
          disabled={isUpdating}
          className="whitespace-nowrap text-xs font-semibold text-red-400 transition-colors hover:text-red-300 disabled:opacity-50"
          title="Remove RSVP"
        >
          Remove
        </button>
        {isUpdating && <span className="text-xs text-zinc-500">...</span>}
      </div>
    </div>
  );
}
