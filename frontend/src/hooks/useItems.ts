import { useQuery } from '@tanstack/react-query';
import { fetchItems } from '../api/items';

export function useItems(jobId: string) {
  return useQuery({
    queryKey: ['items', jobId],
    queryFn: () => fetchItems(jobId),
    enabled: !!jobId,
  });
}
