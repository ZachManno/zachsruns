'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { adminApi } from '@/lib/api';
import BackLink from '@/components/BackLink';

export default function ImportDataPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jsonData, setJsonData] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

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
    <div className="page">
      <div className="mx-auto max-w-2xl">
        <div className="mb-5">
          <BackLink href="/admin/dashboard" label="Back to Dashboard" />
        </div>

        <div className="card glow-edge card-pad">
          <p className="eyebrow">Migration</p>
          <h1 className="heading-1 mt-2">Import Historical Data</h1>
          <div className="accent-rule mt-5" />

          <p className="mt-6 text-sm text-zinc-400">
            Upload a JSON file with historical runs data. Format:
          </p>

          <pre className="panel-sunken mt-3 overflow-x-auto p-4 text-xs leading-relaxed text-zinc-400">
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

          {error && <div className="alert alert-error mt-6">{error}</div>}
          {success && <div className="alert alert-success mt-6">{success}</div>}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label htmlFor="file" className="field-label">
                Upload JSON File
              </label>
              <input
                id="file"
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="w-full cursor-pointer rounded-xl border border-court-600 bg-court-900/80 px-4 py-2.5 text-sm text-zinc-400
                  file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:bg-court-700 file:px-3 file:py-1.5
                  file:text-xs file:font-semibold file:uppercase file:tracking-wider file:text-zinc-200
                  hover:file:bg-court-600"
              />
            </div>

            <div>
              <label htmlFor="json" className="field-label">
                Or paste JSON data
              </label>
              <textarea
                id="json"
                value={jsonData}
                onChange={(e) => setJsonData(e.target.value)}
                rows={15}
                className="field-textarea font-mono text-xs"
                placeholder='{"runs": [...]}'
              />
            </div>

            <button
              type="submit"
              disabled={submitting || !jsonData}
              className="btn btn-primary btn-block btn-lg"
            >
              {submitting ? 'Importing...' : 'Import Data'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
