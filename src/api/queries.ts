import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { api, post } from './client';
import type { AccountResponse, CommandInfo, DashboardResponse, MeResponse, RoomDetailResponse, RoomListResponse, RoomSearchMode, RunCommandResponse } from './types';

/** How often the dashboard refreshes while it is open. */
const DASHBOARD_REFRESH_MS = 10_000;

export const useMe = () => useQuery({
    queryKey: [ 'me' ],
    queryFn: () => api<MeResponse>('/me'),
});

export const useDashboard = () => useQuery({
    queryKey: [ 'dashboard' ],
    queryFn: () => api<DashboardResponse>('/dashboard'),
    refetchInterval: DASHBOARD_REFRESH_MS,
});

export const useCommands = () => useQuery({
    queryKey: [ 'commands' ],
    queryFn: () => api<CommandInfo[]>('/commands'),
    staleTime: 60_000,
});

export const useRunCommand = () => useMutation({
    mutationFn: (line: string) => post<RunCommandResponse>('/commands/run', { line }),
});

export const useAccount = () => useQuery({
    queryKey: [ 'account' ],
    queryFn: () => api<AccountResponse>('/account'),
});

export const useRoomSearch = (text: string, by: RoomSearchMode, page: number) => useQuery({
    queryKey: [ 'rooms', by, text, page ],
    queryFn: () => api<RoomListResponse>(`/rooms?${new URLSearchParams({ q: text, by, page: String(page) })}`),
    // The table keeps showing the last page while the next one loads.
    placeholderData: keepPreviousData,
});

/** One room; refreshed while it is open, since who is inside changes. */
export const useRoom = (id: number) => useQuery({
    queryKey: [ 'room', id ],
    queryFn: () => api<RoomDetailResponse>(`/rooms/${id}`),
    refetchInterval: DASHBOARD_REFRESH_MS,
});
