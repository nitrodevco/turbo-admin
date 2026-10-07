import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from './client';

/** The server over one stretch of time, ending at `atUtc`. A timing is null when nothing was measured. */
export interface PerformancePoint {
    atUtc: string;
    cpuPercent: number;
    workingSetMb: number;
    heapMb: number;
    gen2Collections: number;
    gcPausePercent: number;
    threadPoolQueue: number;
    threadPoolThreads: number;
    playersOnline: number;
    roomsLoaded: number;
    roomEntries: number;
    roomEntryP50Ms: number | null;
    roomEntryP95Ms: number | null;
    streamDelayP95Ms: number | null;
}

/** One measured operation over the range; its percentiles come from a sample when there were many. */
export interface PerformanceStage {
    stage: string;
    count: number;
    p50Ms: number;
    p95Ms: number;
    maxMs: number;
}

export interface PerformanceResponse {
    hours: number;
    sampleSeconds: number;
    /** How much time each point covers: the samples merged into it. */
    pointSeconds: number;
    /** When this server started keeping figures; null before its first sample. */
    recordingSinceUtc: string | null;
    points: PerformancePoint[];
    stages: PerformanceStage[];
}

/** The figures over the last `hours`, asked again as often as the server takes them. */
export const usePerformance = (hours: number) => useQuery({
    queryKey: [ 'performance', hours ],
    queryFn: () => api<PerformanceResponse>(`/performance?hours=${hours}`),
    placeholderData: keepPreviousData,
    refetchInterval: 10_000,
});
