import type { Item } from '../types';

export async function fetchItems(jobId: string): Promise<Item[]> {
  const res = await fetch(`/api/jobs/${jobId}/items`);
  if (!res.ok) throw new Error(`Failed to fetch items for "${jobId}": ${res.statusText}`);
  return res.json();
}
