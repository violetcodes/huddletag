import type { Annotation, AnnotationValues } from '../types';

export async function fetchAnnotation(
  jobId: string,
  itemId: string,
): Promise<Annotation | null> {
  const res = await fetch(`/api/jobs/${jobId}/annotations/${itemId}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to fetch annotation: ${res.statusText}`);
  return res.json();
}

export async function saveAnnotation(
  jobId: string,
  itemId: string,
  values: AnnotationValues,
): Promise<Annotation> {
  const res = await fetch(`/api/jobs/${jobId}/annotations/${itemId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ values }),
  });
  if (!res.ok) throw new Error(`Failed to save annotation: ${res.statusText}`);
  return res.json();
}
