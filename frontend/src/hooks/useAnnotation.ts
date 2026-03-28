import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchAnnotation, saveAnnotation } from '../api/annotations';
import type { AnnotationValues } from '../types';

export function useAnnotation(jobId: string, itemId: string) {
  return useQuery({
    queryKey: ['annotation', jobId, itemId],
    queryFn: () => fetchAnnotation(jobId, itemId),
    enabled: !!jobId && !!itemId,
  });
}

export function useSaveAnnotation(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, values }: { itemId: string; values: AnnotationValues }) =>
      saveAnnotation(jobId, itemId, values),
    onSuccess: (_data, { itemId }) => {
      queryClient.invalidateQueries({ queryKey: ['annotation', jobId, itemId] });
      queryClient.invalidateQueries({ queryKey: ['items', jobId] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });
}
