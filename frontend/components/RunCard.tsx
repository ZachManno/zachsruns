'use client';

import { Run } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { runsApi } from '@/lib/api';
import { isLateDropWindow } from '@/lib/dropLock';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import BadgeIcon from './BadgeIcon';
import ModalPortal from './ModalPortal';

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
        <div key={index} className="flex flex-wrap items-center gap-1">
          <span className="text-zinc-300">{displayName}</span>
          {p.badge && <BadgeIcon badge={p.badge as any} size="small" />}
          {p.pending_drop_status && (
            <span className="rounded border border-amber-500/35 bg-amber-500/10 px-1 py-0.5 text-[10px] font-semibold leading-none text-amber-300">
              Drop pending
            </span>
          )}
        </div>
      );
    });
  };

  const rsvpButtonClass = (
    active: boolean,
    pending: boolean,
    tone: 'green' | 'amber' | 'red',
    disabled = false
  ) => {
    const base =
      'flex-1 min-w-0 truncate rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-150 border sm:text-sm active:scale-[0.97]';

    if (disabled) {
      return `${base} border-court-700 bg-court-800/60 text-zinc-600 cursor-not-allowed`;
    }
    if (pending) {
      return `${base} border-amber-500/50 bg-amber-500/15 text-amber-300`;
    }

    const tones = {
      green: active
        ? 'border-emerald-400/60 bg-emerald-500/90 text-white shadow-[0_6px_18px_-8px_rgba(16,185,129,0.9)]'
        : 'border-court-700 bg-court-800/70 text-emerald-300/80 hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-300',
      amber: active
        ? 'border-amber-400/60 bg-amber-500/90 text-basketball-black shadow-[0_6px_18px_-8px_rgba(245,158,11,0.9)]'
        : 'border-court-700 bg-court-800/70 text-amber-300/80 hover:border-amber-500/50 hover:bg-amber-500/10 hover:text-amber-300',
      red: active
        ? 'border-red-400/60 bg-red-500/90 text-white shadow-[0_6px_18px_-8px_rgba(239,68,68,0.9)]'
        : 'border-court-700 bg-court-800/70 text-red-300/80 hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300',
    };

    return `${base} ${tones[tone]} ${updating ? 'opacity-50 cursor-not-allowed' : ''}`;
  };

  const showStats =
    (run.capacity || isCompleted) ||
    (run.cost !== undefined &&
      run.cost !== null &&
      (!run.is_variable_cost || (run.participant_counts?.confirmed || 0) >= 10 || isCompleted));

  return (
    <div className="card card-interactive glow-edge flex flex-col p-4 md:p-5">
      {/* Header: title, date, time */}
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg font-bold leading-tight tracking-tight text-ink md:text-xl">
            {run.title}
          </h3>
          <div className="mt-2 space-y-1 text-sm">
            <p className="text-zinc-400">{formatDate(run.date)}</p>
            <p className="text-zinc-400">{formatTimeRange(run.start_time, run.end_time)}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {run.is_historical && <span className="chip chip-neutral">Historical</span>}
          {isCompleted && <span className="chip chip-green">Completed</span>}
        </div>
      </div>

      {/* Location, description, stats */}
      <div className="mb-4">
        {run.location_name && (
          <Link
            href="/locations"
            className="font-semibold text-zinc-100 transition-colors hover:text-ember-400"
          >
            {run.location_name}
          </Link>
        )}
        {run.location_address && (
          <p className="mt-0.5 text-sm text-zinc-500">{run.location_address}</p>
        )}
        {run.description && <p className="mt-3 text-sm leading-relaxed text-zinc-400">{run.description}</p>}

        {showStats && (
          <div className="mt-4 flex gap-3">
            {(run.capacity || isCompleted) && (
              <div className="stat-tile flex-1">
                {isCompleted ? (
                  <>
                    <p className="stat-label">Attended</p>
                    <p className="stat-value mt-0.5">
                      {run.participant_counts?.attended || 0}
                      <span className="text-sm font-medium text-zinc-500">/{run.capacity || 0}</span>
                    </p>
                  </>
                ) : (
                  <>
                    <p className="stat-label">Capacity</p>
                    <p className="stat-value mt-0.5">
                      <span className={isAtCapacity ? 'text-ember-400' : ''}>
                        {run.participant_counts?.confirmed || 0}
                      </span>
                      <span className="text-sm font-medium text-zinc-500">/{run.capacity}</span>
                    </p>
                  </>
                )}
              </div>
            )}
            {run.cost !== undefined &&
              run.cost !== null &&
              // For variable cost runs, show cost if at least 10 people have confirmed OR if run is completed
              (!run.is_variable_cost || (run.participant_counts?.confirmed || 0) >= 10 || isCompleted) && (
                <div className="stat-tile flex-1">
                  <p className="stat-label">{isCompleted ? 'Final Cost' : 'Cost'}</p>
                  <p className="stat-value mt-0.5 text-ember-400">${Number(run.cost).toFixed(2)}</p>
                </div>
              )}
          </div>
        )}
      </div>

      {/* Roster */}
      <div className="mt-auto border-t border-court-800 pt-4">
        {isCompleted ? (
          // For completed runs, only show attended
          <div className="flex flex-col gap-3 text-sm md:flex-row md:gap-4">
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Attended · {run.participant_counts?.attended || 0}
              </span>
              {run.participants?.attended && run.participants.attended.length > 0 && (
                <div className="mt-1.5 space-y-1 text-xs">
                  {formatParticipantNames(run.participants.attended)}
                </div>
              )}
              {run.guest_attendees && run.guest_attendees.length > 0 && (
                <div className="mt-1 space-y-1 text-xs text-zinc-500">
                  {run.guest_attendees.map((guest, idx) => (
                    <div key={idx}>{guest}</div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // For non-completed runs, show all statuses
          <div className="flex flex-col gap-3 text-sm md:flex-row md:gap-4">
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Confirmed · {run.participant_counts?.confirmed || 0}
              </span>
              {run.participants?.confirmed && run.participants.confirmed.length > 0 && (
                <div className="mt-1.5 space-y-1 text-xs">
                  {formatParticipantNames(run.participants.confirmed)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Interested · {run.participant_counts?.interested || 0}
              </span>
              {run.participants?.interested && run.participants.interested.length > 0 && (
                <div className="mt-1.5 space-y-1 text-xs">
                  {formatParticipantNames(run.participants.interested)}
                </div>
              )}
            </div>
            <div className="flex-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-red-400">
                Out · {run.participant_counts?.out || 0}
              </span>
              {run.participants?.out && run.participants.out.length > 0 && (
                <div className="mt-1.5 space-y-1 text-xs">
                  {formatParticipantNames(run.participants.out)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* RSVP controls */}
      {user && !isPast && !isCompleted && (
        <div className="mt-4">
          {!user.is_verified ? (
            <div className="alert alert-warning text-center text-xs">
              Please notify the admin to verify your account in order to RSVP for runs
            </div>
          ) : (
            <div className="flex gap-2 overflow-hidden">
              <button
                onClick={() => handleRsvp('confirmed')}
                disabled={updating || isConfirmDisabled}
                className={rsvpButtonClass(
                  currentStatus === 'confirmed',
                  false,
                  'green',
                  isConfirmDisabled
                )}
              >
                {currentStatus === 'confirmed' ? '✓ Confirmed' : 'Confirm'}
              </button>
              <button
                onClick={() => handleRsvp('interested')}
                disabled={updating}
                className={rsvpButtonClass(
                  currentStatus === 'interested',
                  pendingDropStatus === 'interested' && currentStatus !== 'interested',
                  'amber'
                )}
              >
                {currentStatus === 'interested'
                  ? '✓ Interested'
                  : pendingDropStatus === 'interested'
                  ? 'Pending'
                  : 'Interested'}
              </button>
              <button
                onClick={() => handleRsvp('out')}
                disabled={updating}
                className={rsvpButtonClass(
                  currentStatus === 'out',
                  pendingDropStatus === 'out' && currentStatus !== 'out',
                  'red'
                )}
              >
                {currentStatus === 'out' ? '✓ Out' : pendingDropStatus === 'out' ? 'Pending' : 'Out'}
              </button>
            </div>
          )}
          {user.is_verified && currentStatus === 'confirmed' && pendingDropStatus && (
            <p className="alert alert-warning mt-2 text-xs">
              Your late cancellation from <span className="font-semibold text-emerald-400">Confirmed</span> to{' '}
              {pendingDropStatus === 'interested' ? (
                <span className="font-semibold text-amber-400">Interested</span>
              ) : (
                <span className="font-semibold text-red-400">Out</span>
              )}{' '}
              is pending admin verification.
            </p>
          )}
        </div>
      )}

      {dropPromptStatus && (
        <ModalPortal>
          <div className="modal-overlay">
            <div className="modal-panel max-w-md animate-rise-in" role="dialog" aria-modal="true">
              <h4 className="heading-3 mb-2">Late drop needs approval</h4>
              <p className="text-sm leading-relaxed text-zinc-400">
                You are attempting to drop within 1 hour of the run starting time, this requires admin verification. Please notify the admin in order to get this approved. Continue?
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDropPromptStatus(null)}
                  disabled={updating}
                  className="btn btn-secondary"
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
                  className="btn btn-primary"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
