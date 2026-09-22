'use client';

import { Run } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { runsApi } from '@/lib/api';
import { isLateDropWindow } from '@/lib/dropLock';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BadgeIcon from './BadgeIcon';

interface RunCardProps {
  run: Run;
  onUpdate?: () => void;
}

export default function RunCard({ run, onUpdate }: RunCardProps) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(run.user_status);
  const [pendingDropStatus, setPendingDropStatus] = useState<'interested' | 'out' | null>(
    run.pending_drop_status ?? null
  );
  const [dropPromptStatus, setDropPromptStatus] = useState<'interested' | 'out' | null>(null);

  // Sync local RSVP state when run data changes
  useEffect(() => {
    setCurrentStatus(run.user_status);
    setPendingDropStatus(run.pending_drop_status ?? null);
  }, [run.user_status, run.pending_drop_status]);

  const submitRsvp = async (
    status: 'confirmed' | 'interested' | 'out',
    confirmLateDrop = false
  ) => {
    setUpdating(true);
    try {
      const data = await runsApi.updateRsvp(run.id, status, confirmLateDrop);
      if (data.pending_drop) {
        setCurrentStatus('confirmed');
        setPendingDropStatus(status === 'confirmed' ? null : status);
      } else {
        setCurrentStatus(status);
        setPendingDropStatus(null);
      }
      if (onUpdate) {
        onUpdate();
      }
    } catch (error: any) {
      if (
        error?.code === 'late_drop_confirmation_required' &&
        (status === 'interested' || status === 'out')
      ) {
        setDropPromptStatus(status);
        return;
      }
      console.error('Failed to update RSVP:', error);
      const errorMessage = error?.message || 'Failed to update RSVP. Please try again.';
      alert(errorMessage);
    } finally {
      setUpdating(false);
    }
  };

  const handleRsvp = (status: 'confirmed' | 'interested' | 'out') => {
    if (!user || updating) return;

    if (status === 'confirmed') {
      if (currentStatus === 'confirmed' && !pendingDropStatus) return;
      submitRsvp('confirmed');
      return;
    }

    if (pendingDropStatus === status || (currentStatus === status && !pendingDropStatus)) {
      return;
    }

    const inLateWindow = Boolean(run.drop_locked) || isLateDropWindow(run.date, run.start_time);
    const leavingConfirmed = currentStatus === 'confirmed' && !user.is_admin && inLateWindow;
    if (leavingConfirmed && !pendingDropStatus) {
      setDropPromptStatus(status);
      return;
    }
    if (leavingConfirmed && pendingDropStatus) {
      submitRsvp(status, true);
      return;
    }

    submitRsvp(status);
  };

  const formatDate = (dateString: string) => {
    // Parse date string (YYYY-MM-DD) directly to avoid timezone issues
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeString: string) => {
    // Parse time string (e.g., "19:00" or "19:00:00")
    const [hours, minutes] = timeString.split(':').map(Number);
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'pm' : 'am';
    // Only show minutes if they're not 00
    return minutes === 0 ? `${hour12}${ampm}` : `${hour12}:${minutes.toString().padStart(2, '0')}${ampm}`;
  };

  const formatTimeRange = (startTime: string, endTime: string) => {
    const start = formatTime(startTime);
    const end = formatTime(endTime);
    // Extract AM/PM from both times
    const startAmPm = start.slice(-2);
    const endAmPm = end.slice(-2);
    
    // If both have the same AM/PM, only show it once at the end
    if (startAmPm === endAmPm) {
      return `${start.slice(0, -2)}-${end}`;
    }
    return `${start}-${end}`;
  };

  // Check if run is past - compare dates only, not times
  const [year, month, day] = run.date.split('T')[0].split('-').map(Number);
  const runDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set to midnight for date-only comparison
  const isPast = runDate < today; // Only past if run date is BEFORE today (not same day)
  const isCompleted = run.is_completed || false;
  
  // Check if run is at capacity
  const isAtCapacity = run.capacity !== undefined && run.capacity !== null && 
    (run.participant_counts?.confirmed || 0) >= run.capacity;
  
  // Check if user is already confirmed (they should still be able to interact with the button)
  const isUserConfirmed = currentStatus === 'confirmed';
  
  // Disable confirm button if at capacity and user is not already confirmed
  const isConfirmDisabled = isAtCapacity && !isUserConfirmed;

  // Helper function to format participant names with badges
  const formatParticipantNames = (
    participants: Array<{username: string; first_name?: string; last_name?: string; badge?: string; pending_drop_status?: 'interested' | 'out' | null}>
  ) => {
    if (!participants || participants.length === 0) return null;
    
    // Count occurrences of each first name
    const firstNameCounts = new Map<string, number>();
    participants.forEach(p => {
      const firstName = p.first_name || p.username;
      firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
    });
    
    // Format names: use first name only unless there are duplicates
    return participants.map((p, index) => {
      const firstName = p.first_name || p.username;
      const lastName = p.last_name || '';
      const displayName = firstNameCounts.get(firstName)! > 1 && lastName
        ? `${firstName} ${lastName}`
        : firstName;
      
      return (
        <div key={index} className="flex items-center gap-1 flex-wrap">
          <span className="text-gray-900">{displayName}</span>
          {p.badge && <BadgeIcon badge={p.badge as any} size="small" />}
          {p.pending_drop_status && (
            <span className="text-[10px] leading-none font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
              Drop pending
            </span>
          )}
        </div>
      );
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-4 md:p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1 min-w-0 pr-2">
          <h3 className="text-lg md:text-xl font-bold text-basketball-black mb-1">
            {run.title}
          </h3>
          <p className="text-sm md:text-base text-gray-600">{formatDate(run.date)}</p>
          <p className="text-sm md:text-base text-gray-600">
            {formatTimeRange(run.start_time, run.end_time)}
          </p>
        </div>
        {run.is_historical && (
          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs md:text-sm flex-shrink-0">
            Historical
          </span>
        )}
      </div>

      <div className="mb-4">
        {run.location_name && (
          <Link 
            href="/locations" 
            className="font-semibold text-basketball-black hover:text-basketball-orange hover:underline transition-colors inline-block"
          >
            {run.location_name}
          </Link>
        )}
        <p className="text-sm text-gray-600">{run.location_address}</p>
        {run.description && (
          <p className="text-gray-700 mt-2">{run.description}</p>
        )}
        {((run.capacity || isCompleted) || (run.cost !== undefined && run.cost !== null && (!run.is_variable_cost || (run.participant_counts?.confirmed || 0) >= 10 || isCompleted))) && (
          <div className="mt-4 flex gap-4">
            {(run.capacity || isCompleted) && (
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                {isCompleted ? (
                  <>
                    <p className="text-xs text-gray-500 mb-1">Attended</p>
                    <p className="text-lg font-semibold text-basketball-black">
                      {run.participant_counts?.attended || 0}/{run.capacity || 0}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-xs text-gray-500 mb-1">Capacity</p>
                    <p className="text-lg font-semibold text-basketball-black">
                      {run.participant_counts?.confirmed || 0}/{run.capacity}
                    </p>
                  </>
                )}
              </div>
            )}
            {(run.cost !== undefined && run.cost !== null) && 
             // For variable cost runs, show cost if at least 10 people have confirmed OR if run is completed
             (!run.is_variable_cost || (run.participant_counts?.confirmed || 0) >= 10 || isCompleted) && (
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">{isCompleted ? 'Final Cost' : 'Cost'}</p>
                <p className="text-lg font-semibold text-basketball-black">
                  ${Number(run.cost).toFixed(2)}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 border-t pt-4">
        {isCompleted && (
          <div className="mb-2">
            <span className="inline-block bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-semibold">
              ✓ Completed
            </span>
          </div>
        )}
        {isCompleted ? (
          // For completed runs, only show attended
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 text-sm">
            <div className="flex-1">
              <span className="font-semibold text-green-600">
                Attended: {run.participant_counts?.attended || 0}
              </span>
              {run.participants?.attended && run.participants.attended.length > 0 && (
                <div className="text-gray-600 text-xs mt-1 space-y-1">
                  {formatParticipantNames(run.participants.attended)}
                </div>
              )}
              {run.guest_attendees && run.guest_attendees.length > 0 && (
                <div className="text-gray-600 text-xs mt-1 space-y-1">
                  {run.guest_attendees.map((guest, idx) => (
                    <div key={idx}>{guest}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // For non-completed runs, show all statuses
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 text-sm">
            <div className="flex-1">
              <span className="font-semibold text-green-600">
                Confirmed: {run.participant_counts?.confirmed || 0}
              </span>
              {run.participants?.confirmed && run.participants.confirmed.length > 0 && (
                <div className="text-gray-600 text-xs mt-1 space-y-1">
                  {formatParticipantNames(run.participants.confirmed)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="font-semibold text-yellow-600">
                Interested: {run.participant_counts?.interested || 0}
              </span>
              {run.participants?.interested && run.participants.interested.length > 0 && (
                <div className="text-gray-600 text-xs mt-1 space-y-1">
                  {formatParticipantNames(run.participants.interested)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="font-semibold text-red-600">
                Out: {run.participant_counts?.out || 0}
              </span>
              {run.participants?.out && run.participants.out.length > 0 && (
                <div className="text-gray-600 text-xs mt-1 space-y-1">
                  {formatParticipantNames(run.participants.out)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {user && !isPast && !isCompleted && (
        <div className="mt-4">
          {!user.is_verified ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-center">
              <p className="text-sm text-yellow-800">
                Please notify the admin to verify your account in order to RSVP for runs
              </p>
            </div>
          ) : (
            <div className="flex gap-2 overflow-hidden">
              <button
                onClick={() => handleRsvp('confirmed')}
                disabled={updating || isConfirmDisabled}
                className={`flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm rounded transition-all truncate ${
                  currentStatus === 'confirmed'
                    ? 'bg-green-600 text-white border-2 border-green-700 ring-2 ring-green-300'
                    : isConfirmDisabled
                    ? 'bg-gray-200 text-gray-500 border-2 border-transparent cursor-not-allowed'
                    : 'bg-green-100 text-green-700 hover:bg-green-200 border-2 border-transparent'
                } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStatus === 'confirmed' ? '✓ Confirmed' : 'Confirm'}
              </button>
              <button
                onClick={() => handleRsvp('interested')}
                disabled={updating}
                className={`flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm rounded transition-all truncate ${
                  currentStatus === 'interested'
                    ? 'bg-yellow-600 text-white border-2 border-yellow-700 ring-2 ring-yellow-300'
                    : pendingDropStatus === 'interested'
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                    : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-2 border-transparent'
                } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStatus === 'interested' ? '✓ Interested' : pendingDropStatus === 'interested' ? 'Pending' : 'Interested'}
              </button>
              <button
                onClick={() => handleRsvp('out')}
                disabled={updating}
                className={`flex-1 min-w-0 px-2 py-2 text-xs sm:text-sm rounded transition-all truncate ${
                  currentStatus === 'out'
                    ? 'bg-red-600 text-white border-2 border-red-700 ring-2 ring-red-300'
                    : pendingDropStatus === 'out'
                    ? 'bg-amber-100 text-amber-800 border-2 border-amber-400'
                    : 'bg-red-100 text-red-700 hover:bg-red-200 border-2 border-transparent'
                } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {currentStatus === 'out' ? '✓ Out' : pendingDropStatus === 'out' ? 'Pending' : 'Out'}
              </button>
            </div>
          )}
          {user.is_verified && currentStatus === 'confirmed' && pendingDropStatus && (
            <p className="mt-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded p-2">
              Your late cancellation from <span className="font-semibold text-green-600">Confirmed</span> to{' '}
              {pendingDropStatus === 'interested' ? (
                <span className="font-semibold text-yellow-600">Interested</span>
              ) : (
                <span className="font-semibold text-red-600">Out</span>
              )}{' '}
              is pending admin verification.
            </p>
          )}
        </div>
      )}
      {dropPromptStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6" role="dialog" aria-modal="true">
            <p className="text-gray-800">
              You are attempting to drop within 1 hour of the run starting time, this requires admin verification. Please notify the admin in order to get this approved. Continue?
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setDropPromptStatus(null)}
                disabled={updating}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const status = dropPromptStatus;
                  setDropPromptStatus(null);
                  submitRsvp(status, true);
                }}
                disabled={updating}
                className="px-4 py-2 rounded bg-basketball-orange text-white hover:opacity-90"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

