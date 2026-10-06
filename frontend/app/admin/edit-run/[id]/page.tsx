'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter, useParams } from 'next/navigation';
import { runsApi, locationsApi, privateGroupsApi } from '@/lib/api';
import { Location, Run, PrivateGroup } from '@/types';
import BackLink from '@/components/BackLink';

export default function EditRunPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;
  
  const [locations, setLocations] = useState<Location[]>([]);
  const [groups, setGroups] = useState<PrivateGroup[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(true);
  const [loadingRun, setLoadingRun] = useState(true);
  const [run, setRun] = useState<Run | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location_id: '',
    description: '',
    capacity: '',
    cost: '',
    is_variable_cost: false,
    total_cost: '',
    private_group_id: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.is_admin && runId) {
      fetchLocations();
      fetchGroups();
      fetchRun();
    }
  }, [user, runId]);

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

  const fetchRun = async () => {
    try {
      setLoadingRun(true);
      const data = await runsApi.getById(runId);
      const runData = data.run;
      setRun(runData);

      // Pre-populate form with existing run data
      // Format date for input (YYYY-MM-DD) - use date string directly to avoid timezone issues
      const dateStr = runData.date ? runData.date.split('T')[0] : '';
      // Format time for input (HH:MM)
      const startTime = runData.start_time ? runData.start_time.substring(0, 5) : '';
      const endTime = runData.end_time ? runData.end_time.substring(0, 5) : '';

      setFormData({
        title: runData.title || '',
        date: dateStr,
        start_time: startTime,
        end_time: endTime,
        location_id: runData.location_id || '',
        description: runData.description || '',
        capacity: runData.capacity?.toString() || '',
        cost: runData.cost?.toString() || '',
        is_variable_cost: runData.is_variable_cost || false,
        total_cost: runData.total_cost?.toString() || '',
        private_group_id: runData.private_group_id || '',
      });
    } catch (err: any) {
      console.error('Failed to fetch run:', err);
      setError(err.message || 'Failed to load run');
    } finally {
      setLoadingRun(false);
    }
  };

  if (authLoading || loadingRun || loadingLocations) {
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

  if (run?.is_completed) {
    return (
      <div className="page">
        <div className="mx-auto max-w-2xl">
          <div className="mb-5">
            <BackLink href="/admin/manage-runs" label="Back to Manage Runs" />
          </div>
          <div className="card card-pad">
            <div className="alert alert-error">Cannot edit completed runs</div>
          </div>
        </div>
      </div>
    );
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
        private_group_id: formData.private_group_id || null,
      };

      await runsApi.update(runId, runData);
      router.push('/admin/manage-runs');
    } catch (err: any) {
      setError(err.message || 'Failed to update run');
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
          <BackLink href="/admin/manage-runs" label="Back to Manage Runs" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Adjustments</p>
          <h1 className="heading-1 mt-2">Edit Run</h1>
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
                <p className="field-hint">Set to &quot;Public&quot; to open this run to everyone.</p>
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
              {submitting ? 'Updating...' : 'Update Run'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
