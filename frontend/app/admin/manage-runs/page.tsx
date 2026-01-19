'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi, runsApi } from '@/lib/api';
import { Run } from '@/types';
import Link from 'next/link';
import BadgeIcon from '@/components/BadgeIcon';

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

  return (
    <div className={`border rounded-lg ${run.is_completed ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200'}`}>
      <div className="p-3 md:p-4">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Run Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start md:items-center gap-2 flex-wrap">
              <h3 className="text-base md:text-lg font-semibold text-basketball-black">{run.title}</h3>
              {run.is_completed && (
                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap">
                  Completed
                </span>
              )}
            </div>
            <p className="text-xs md:text-sm text-gray-600 mt-1">
              {formatDate(run.date)} • {formatTimeRange(run.start_time, run.end_time)} • {run.location_name}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {run.participant_counts?.confirmed || 0} confirmed
              {run.capacity && ` / ${run.capacity}`}
            </p>
          </div>
          
          {/* Action Buttons - Grid on mobile, flex on desktop */}
          <div className="grid grid-cols-3 md:flex gap-1.5 md:gap-2">
            {!run.is_completed && (
              <button
                onClick={handleToggleExpand}
                className="px-2 md:px-3 py-1.5 md:py-1 rounded text-xs md:text-sm bg-basketball-orange text-white hover:bg-orange-600 whitespace-nowrap"
              >
                {expanded ? 'Hide' : 'RSVPs'}
              </button>
            )}
            <Link
              href={`/admin/complete-run/${run.id}`}
              className={`px-2 md:px-3 py-1.5 md:py-1 rounded text-xs md:text-sm text-center ${
                run.is_completed
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {run.is_completed ? 'Done' : 'Complete'}
            </Link>
            <Link
              href={`/admin/edit-run/${run.id}`}
              className={`px-2 md:px-3 py-1.5 md:py-1 rounded text-xs md:text-sm text-center ${
                run.is_completed
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              Edit
            </Link>
            <button
              onClick={() => setShowRemindModal(true)}
              disabled={run.is_completed}
              className={`px-2 md:px-3 py-1.5 md:py-1 rounded text-xs md:text-sm ${
                run.is_completed
                  ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              Remind
            </button>
            <button
              onClick={() => onDelete(run.id)}
              disabled={run.is_completed}
              className={`px-2 md:px-3 py-1.5 md:py-1 rounded text-xs md:text-sm ${
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

      {/* Expandable RSVP Management Section */}
      {expanded && !run.is_completed && (
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          {loadingRsvps ? (
            <p className="text-gray-600 text-sm">Loading RSVPs...</p>
          ) : rsvpData ? (
            <div className="space-y-4">
              {/* Capacity Warning */}
              {isAtCapacity && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-2 text-sm text-yellow-800">
                  Run is at capacity ({rsvpData.capacity})
                </div>
              )}

              {/* Confirmed Section */}
              <div>
                <h4 className="text-sm font-semibold text-green-700 mb-2">
                  Confirmed ({rsvpData.participants.confirmed.length})
                </h4>
                {rsvpData.participants.confirmed.length > 0 ? (
                  <div className="space-y-1">
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
                  <p className="text-xs text-gray-500">No confirmed users</p>
                )}
              </div>

              {/* Interested Section */}
              <div>
                <h4 className="text-sm font-semibold text-blue-700 mb-2">
                  Interested ({rsvpData.participants.interested.length})
                </h4>
                {rsvpData.participants.interested.length > 0 ? (
                  <div className="space-y-1">
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
                  <p className="text-xs text-gray-500">No interested users</p>
                )}
              </div>

              {/* Out Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-2">
                  Out ({rsvpData.participants.out.length})
                </h4>
                {rsvpData.participants.out.length > 0 ? (
                  <div className="space-y-1">
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
                  <p className="text-xs text-gray-500">No users marked as out</p>
                )}
              </div>

              {/* Add User Section */}
              {rsvpData.available_users.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-basketball-black mb-2">
                    Add User
                  </h4>
                  <div className="flex flex-col md:flex-row gap-2">
                    <select
                      id={`add-user-${run.id}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
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
                        className="flex-1 md:flex-none px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
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
                        className="px-4 py-2 bg-basketball-orange text-white rounded text-sm hover:bg-orange-600 whitespace-nowrap"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">Failed to load RSVPs</p>
          )}
        </div>
      )}

      {/* Remind Modal */}
      {showRemindModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-basketball-black mb-4">
              Send Reminder: {run.title}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Message <span className="text-red-500">*</span>
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
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                maxLength={100}
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1">
                {reminderMessage.length}/100 characters
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowRemindModal(false);
                  setReminderMessage('');
                }}
                disabled={sendingReminder}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRemind}
                disabled={sendingReminder || !reminderMessage.trim()}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
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
    <div className="flex flex-col md:flex-row md:items-center justify-between p-2 bg-white rounded border border-gray-200 gap-2">
      {/* User Info */}
      <div className="flex items-center gap-2 min-w-0">
        {user.badge && <BadgeIcon badge={user.badge as 'regular' | 'plus_one'} size="small" />}
        <span className="text-sm text-gray-900 truncate">{displayName}</span>
        <span className="text-xs text-gray-500 hidden md:inline">@{user.username}</span>
      </div>
      {/* Controls */}
      <div className="flex items-center gap-2 justify-end">
        <select
          value={currentStatus}
          onChange={(e) => {
            const newStatus = e.target.value as 'confirmed' | 'interested' | 'out';
            if (newStatus !== currentStatus) {
              onStatusChange(user.id, newStatus, displayName, currentStatus);
            }
          }}
          disabled={isUpdating}
          className="px-2 py-1.5 border border-gray-300 rounded text-xs text-gray-900 focus:ring-2 focus:ring-basketball-orange focus:border-transparent disabled:opacity-50"
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
          className="text-red-600 hover:text-red-800 text-xs disabled:opacity-50 whitespace-nowrap"
          title="Remove RSVP"
        >
          Remove
        </button>
        {isUpdating && (
          <span className="text-xs text-gray-500">...</span>
        )}
      </div>
    </div>
  );
}

