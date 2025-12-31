'use client';

import { Run } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { runsApi } from '@/lib/api';
import { useState } from 'react';

interface RunCardProps {
  run: Run;
  onUpdate?: () => void;
}

export default function RunCard({ run, onUpdate }: RunCardProps) {
  const { user } = useAuth();
  const [updating, setUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState(run.user_status);

  const handleRsvp = async (status: 'confirmed' | 'interested' | 'out') => {
    if (!user) return;

    setUpdating(true);
    try {
      await runsApi.updateRsvp(run.id, status);
      setCurrentStatus(status);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Failed to update RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
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

  const isPast = new Date(run.date) < new Date();

  // Helper function to format participant names
  const formatParticipantNames = (
    participants: Array<{username: string; first_name?: string; last_name?: string}>
  ): string => {
    if (!participants || participants.length === 0) return '';
    
    // Count occurrences of each first name
    const firstNameCounts = new Map<string, number>();
    participants.forEach(p => {
      const firstName = p.first_name || p.username;
      firstNameCounts.set(firstName, (firstNameCounts.get(firstName) || 0) + 1);
    });
    
    // Format names: use first name only unless there are duplicates
    return participants.map(p => {
      const firstName = p.first_name || p.username;
      const lastName = p.last_name || '';
      
      // If this first name appears multiple times, include last name
      if (firstNameCounts.get(firstName)! > 1 && lastName) {
        return `${firstName} ${lastName}`;
      }
      return firstName;
    }).join(', ');
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-basketball-black mb-1">
            {run.title}
          </h3>
          <p className="text-gray-600">{formatDate(run.date)}</p>
          <p className="text-gray-600">
            {formatTimeRange(run.start_time, run.end_time)}
          </p>
        </div>
        {run.is_historical && (
          <span className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm">
            Historical
          </span>
        )}
      </div>

      <div className="mb-4">
        <p className="font-semibold text-basketball-black">{run.location}</p>
        <p className="text-sm text-gray-600">{run.address}</p>
        {run.description && (
          <p className="text-gray-700 mt-2">{run.description}</p>
        )}
        {(run.capacity || run.cost) && (
          <div className="mt-4 flex gap-4">
            {run.capacity && (
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Capacity</p>
                <p className="text-lg font-semibold text-basketball-black">
                  {run.participant_counts?.confirmed || 0}/{run.capacity}
                </p>
              </div>
            )}
            {run.cost && (
              <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500 mb-1">Cost</p>
                <p className="text-lg font-semibold text-basketball-black">
                  ${run.cost}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 border-t pt-4">
        <div className="flex gap-4 text-sm">
          <div>
            <span className="font-semibold text-green-600">
              Confirmed: {run.participant_counts?.confirmed || 0}
            </span>
            {run.participants?.confirmed.length > 0 && (
              <p className="text-gray-600 text-xs mt-1">
                {formatParticipantNames(run.participants.confirmed)}
              </p>
            )}
          </div>
          <div>
            <span className="font-semibold text-yellow-600">
              Interested: {run.participant_counts?.interested || 0}
            </span>
            {run.participants?.interested.length > 0 && (
              <p className="text-gray-600 text-xs mt-1">
                {formatParticipantNames(run.participants.interested)}
              </p>
            )}
          </div>
          <div>
            <span className="font-semibold text-red-600">
              Out: {run.participant_counts?.out || 0}
            </span>
            {run.participants?.out.length > 0 && (
              <p className="text-gray-600 text-xs mt-1">
                {formatParticipantNames(run.participants.out)}
              </p>
            )}
          </div>
        </div>
      </div>

      {user && !isPast && (
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleRsvp('confirmed')}
            disabled={updating}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              currentStatus === 'confirmed'
                ? 'bg-green-600 text-white'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {currentStatus === 'confirmed' ? '✓ Confirmed' : 'Confirm'}
          </button>
          <button
            onClick={() => handleRsvp('interested')}
            disabled={updating}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              currentStatus === 'interested'
                ? 'bg-yellow-600 text-white'
                : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {currentStatus === 'interested' ? '✓ Interested' : 'Interested'}
          </button>
          <button
            onClick={() => handleRsvp('out')}
            disabled={updating}
            className={`flex-1 px-4 py-2 rounded transition-colors ${
              currentStatus === 'out'
                ? 'bg-red-600 text-white'
                : 'bg-red-100 text-red-700 hover:bg-red-200'
            } ${updating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {currentStatus === 'out' ? '✓ Out' : 'Out'}
          </button>
        </div>
      )}
    </div>
  );
}

