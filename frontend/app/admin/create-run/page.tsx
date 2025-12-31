'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { runsApi } from '@/lib/api';
import Link from 'next/link';

export default function CreateRunPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    location: '',
    address: '',
    description: '',
    capacity: '',
    cost: '',
    is_variable_cost: false,
    total_cost: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (authLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
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
      const runData = {
        ...formData,
        capacity: formData.capacity ? parseInt(formData.capacity) : undefined,
        cost: formData.is_variable_cost ? undefined : (formData.cost ? parseFloat(formData.cost) : undefined),
        total_cost: formData.is_variable_cost ? (formData.total_cost ? parseFloat(formData.total_cost) : undefined) : undefined,
        is_variable_cost: formData.is_variable_cost,
        description: formData.description || undefined,
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
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-2xl mx-auto">
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
            Create New Run
          </h1>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Title *
              </label>
              <input
                id="title"
                name="title"
                type="text"
                value={formData.title}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="date"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Date *
                </label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="start_time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Start Time *
                </label>
                <input
                  id="start_time"
                  name="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label
                  htmlFor="end_time"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  End Time *
                </label>
                <input
                  id="end_time"
                  name="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="location"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Location *
              </label>
              <input
                id="location"
                name="location"
                type="text"
                value={formData.location}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Address *
              </label>
              <input
                id="address"
                name="address"
                type="text"
                value={formData.address}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
            </div>

            <div>
              <label
                htmlFor="description"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="capacity"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Capacity
                </label>
                <input
                  id="capacity"
                  name="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cost Type
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center text-gray-700">
                    <input
                      type="radio"
                      name="costType"
                      checked={!formData.is_variable_cost}
                      onChange={() => setFormData({ ...formData, is_variable_cost: false })}
                      className="mr-2"
                    />
                    Fixed Cost
                  </label>
                  <label className="flex items-center text-gray-700">
                    <input
                      type="radio"
                      name="costType"
                      checked={formData.is_variable_cost}
                      onChange={() => setFormData({ ...formData, is_variable_cost: true })}
                      className="mr-2"
                    />
                    Variable Cost
                  </label>
                </div>
                {formData.is_variable_cost ? (
                  <div>
                    <label
                      htmlFor="total_cost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Cost per person = Total Cost ÷ Number of confirmed participants
                    </p>
                  </div>
                ) : (
                  <div>
                    <label
                      htmlFor="cost"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
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
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent text-gray-900"
                    />
                  </div>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-basketball-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Creating...' : 'Create Run'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

