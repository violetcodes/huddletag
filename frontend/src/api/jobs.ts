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

export interface UploadResult {
  job_id: string;
  item_count: number;
  size_bytes: number;
}

const MAX_ZIP_BYTES = 10 * 1024 * 1024 * 1024; // 10 GiB

/**
 * Upload a job .zip file to the backend.
 * Uses XMLHttpRequest so upload progress events are available.
 * @param onProgress - called with 0–100 as bytes are sent
 */
export function uploadJobZip(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_ZIP_BYTES) {
      reject(new Error('File exceeds the 10 GiB size limit'));
      return;
    }

    const form = new FormData();
    form.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/jobs/upload');

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status === 201) {
        try {
          resolve(JSON.parse(xhr.responseText) as UploadResult);
        } catch {
          reject(new Error('Invalid response from server'));
        }
      } else {
        let detail = `Upload failed (HTTP ${xhr.status})`;
        try {
          detail = (JSON.parse(xhr.responseText) as { detail: string }).detail ?? detail;
        } catch { /* ignore */ }
        reject(new Error(detail));
      }
    });

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

    xhr.send(form);
  });
}
