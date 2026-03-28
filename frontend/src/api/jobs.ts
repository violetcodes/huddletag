import type { Job, Spec } from '../types';

export async function fetchJobs(): Promise<Job[]> {
  const res = await fetch('/api/jobs');
  if (!res.ok) throw new Error(`Failed to fetch jobs: ${res.statusText}`);
  return res.json();
}

export async function fetchJobSpec(jobId: string): Promise<Spec> {
  const res = await fetch(`/api/jobs/${jobId}/spec`);
  if (!res.ok) throw new Error(`Failed to fetch spec for "${jobId}": ${res.statusText}`);
  return res.json();
}
