'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { runsApi, locationsApi, privateGroupsApi } from '@/lib/api';
import { Location, PrivateGroup } from '@/types';
import BackLink from '@/components/BackLink';

export default function CreateRunPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [locations, setLocations] = useState<Location[]>([]);
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '19:00',
    end_time: '21:00',
    location_id: '',
    description: '',
    capacity: '15',
    cost: '',
    is_variable_cost: true,
    total_cost: '120',
    private_group_id: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchLocations();
      fetchGroups();
    }
  }, [user]);

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true);
      const data = await locationsApi.getAll();
      setLocations(data);
    } catch (err) {
      console.error('Failed to fetch locations:', err);
      setError('Failed to load locations');
    } finally {
      setLoadingLocations(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const data = await privateGroupsApi.getAllGroups();
      setGroups(data.groups);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
    }
  };

  if (authLoading) {
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
    router.push('/');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const runData: Record<string, any> = {
        title: formData.title,
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location_id: formData.location_id,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        cost: formData.is_variable_cost ? undefined : (formData.cost ? parseFloat(formData.cost) : undefined),
        total_cost: formData.is_variable_cost ? (formData.total_cost ? parseFloat(formData.total_cost) : undefined) : undefined,
        is_variable_cost: formData.is_variable_cost,
        description: formData.description || undefined,
        private_group_id: formData.private_group_id || undefined,
      };

      await runsApi.create(runData);
      router.push('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create run');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">New session</p>
          <h1 className="heading-1 mt-2">Create New Run</h1>
          <div className="accent-rule mt-5" />

          {error && <div className="alert alert-error mt-6">{error}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="title" className="field-label">
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                className="field-input"
              />
            </div>

            {groups.length > 0 && (
              <div>
                <label htmlFor="private_group_id" className="field-label">
                  Private Group
                </label>
                <select
                  id="private_group_id"
                  name="private_group_id"
                  value={formData.private_group_id}
                  onChange={handleChange}
                  className="field-select"
                >
                  <option value="">Public (no group)</option>
                  {groups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
                <p className="field-hint">
                  Leave as &quot;Public&quot; for a regular run, or select a group for a private run.
                </p>
              </div>
            )}

            <div>
              <label htmlFor="date" className="field-label">
                Date *
              </label>
              <input
                id="date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="field-input"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="start_time" className="field-label">
                  Start Time *
                </label>
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
              </div>

              <div>
                <label htmlFor="end_time" className="field-label">
                  End Time *
                </label>
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="field-input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="location_id" className="field-label">
                Location *
              </label>
              {loadingLocations ? (
                <p className="text-sm text-zinc-500">Loading locations...</p>
              ) : (
                <select
                  id="location_id"
                  name="location_id"
                  value={formData.location_id}
                  onChange={handleChange}
                  required
                  className="field-select"
                >
                  <option value="">Select a location</option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name} - {location.address}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label htmlFor="description" className="field-label">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="field-textarea"
              />
            </div>

            <div>
              <label htmlFor="capacity" className="field-label">
                Capacity
              </label>
              <input
                id="capacity"
                name="capacity"
                type="number"
                min="1"
                value={formData.capacity}
                onChange={handleChange}
                className="field-input"
              />
            </div>

            <div className="panel-sunken p-4">
              <label className="field-label">Cost Type</label>
              <div className="grid grid-cols-2 gap-2">
                <label
                  className={`choice-tile ${!formData.is_variable_cost ? 'choice-tile-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="costType"
                    checked={!formData.is_variable_cost}
                    onChange={() => setFormData({ ...formData, is_variable_cost: false })}
                    className="field-radio"
                  />
                  Fixed Cost
                </label>
                <label
                  className={`choice-tile ${formData.is_variable_cost ? 'choice-tile-active' : ''}`}
                >
                  <input
                    type="radio"
                    name="costType"
                    checked={formData.is_variable_cost}
                    onChange={() => setFormData({ ...formData, is_variable_cost: true })}
                    className="field-radio"
                  />
                  Variable Cost
                </label>
              </div>

              {formData.is_variable_cost ? (
                <div className="mt-4">
                  <label htmlFor="total_cost" className="field-label">
                    Total Cost ($)
                  </label>
                  <input
                    id="total_cost"
                    name="total_cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_cost}
                    onChange={handleChange}
                    placeholder="e.g., 250"
                    className="field-input"
                  />
                  <p className="field-hint">
                    Cost per person = Total Cost ÷ Number of confirmed participants
                  </p>
                </div>
              ) : (
                <div className="mt-4">
                  <label htmlFor="cost" className="field-label">
                    Cost per Person ($)
                  </label>
                  <input
                    id="cost"
                    name="cost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.cost}
                    onChange={handleChange}
                    className="field-input"
                  />
                </div>
              )}
            </div>

            <button type="submit" disabled={submitting} className="btn btn-primary btn-block btn-lg">
              {submitting ? 'Creating...' : 'Create Run'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
