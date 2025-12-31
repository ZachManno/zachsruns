'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import Link from 'next/link';

export default function ImportDataPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jsonData, setJsonData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        setJsonData(content);
        setError('');
      } catch (err) {
        setError('Failed to read file');
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const data = JSON.parse(jsonData);
      const result = await adminApi.importRuns(data);
      setSuccess(
        `Successfully imported ${result.imported_count} runs. ${
          result.errors.length > 0
            ? `Errors: ${result.errors.join(', ')}`
            : ''
        }`
      );
      setJsonData('');
    } catch (err: any) {
      setError(
        err.message || 'Failed to import data. Please check the JSON format.'
      );
    } finally {
      setSubmitting(false);
    }
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
            Import Historical Data
          </h1>

          <p className="text-gray-600 mb-6">
            Upload a JSON file with historical runs data. Format:
          </p>

          <pre className="bg-gray-100 p-4 rounded mb-6 text-sm overflow-x-auto">
            {`{
  "runs": [
    {
      "title": "Tuesday January 6th Run",
      "date": "2024-01-06",
      "start_time": "19:00",
      "end_time": "21:00",
      "location": "Phield House",
      "address": "123 Main St, City, State",
      "description": "Optional description",
      "capacity": 20,
      "participants": {
        "confirmed": ["Alec", "Zach", "Allen"],
        "interested": ["Steve", "Mike"],
        "out": ["AJ", "Jim"]
      }
    }
  ]
}`}
          </pre>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="file"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Upload JSON File
              </label>
              <input
                id="file"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="json"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Or paste JSON data
              </label>
              <textarea
                id="json"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                rows={15}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-basketball-orange focus:border-transparent font-mono text-sm text-gray-900"
                placeholder='{"runs": [...]}'
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !jsonData}
              className="w-full bg-basketball-orange text-white py-2 px-4 rounded-md hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Importing...' : 'Import Data'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

