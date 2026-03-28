import { useQuery } from '@tanstack/react-query';
import { fetchJobs, fetchJobSpec } from '../api/jobs';

export function useJobs() {
  return useQuery({
    queryKey: ['jobs'],
    queryFn: fetchJobs,
    refetchInterval: 15_000,
  });
}

export function useJobSpec(jobId: string) {
  return useQuery({
    queryKey: ['job-spec', jobId],
    queryFn: () => fetchJobSpec(jobId),
    enabled: !!jobId,
  });
}
