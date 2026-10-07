import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put, remove } from './client';
import type { RoomVisitItem } from './players';
import type { RoomCategoryItem, RoomSettingsRequest } from './types';

export interface RoomActionResponse {
    message: string;
}

export const useRoomCategories = () => useQuery({
    queryKey: [ 'room-categories' ],
    queryFn: () => api<RoomCategoryItem[]>('/rooms/categories'),
    staleTime: 5 * 60_000,
});

/** The players who went into a room, newest first. */
export const useRoomVisitors = (id: number) => useQuery({
    queryKey: [ 'room', id, 'visitors' ],
    queryFn: () => api<RoomVisitItem[]>(`/rooms/${id}/visitors`),
});

const room = (id: number) => `/rooms/${id}`;

/** Everything the panel can do to one room. Each answers with a sentence to show. */
export const roomCalls = (id: number) => ({
    saveSettings: (settings: RoomSettingsRequest) => put<RoomActionResponse>(`${room(id)}/settings`, settings),
    setStaffPick: (staffPick: boolean) => put<RoomActionResponse>(`${room(id)}/staff-pick`, { staffPick }),
    kick: (playerId: number) => post<RoomActionResponse>(`${room(id)}/kick`, { playerId }),
    mute: (playerId: number, minutes: number) => post<RoomActionResponse>(`${room(id)}/mute`, { playerId, minutes }),
    ban: (target: { playerId?: number; name?: string }, duration: string) =>
        post<RoomActionResponse>(`${room(id)}/ban`, { ...target, duration }),
    unban: (playerId: number) => remove<RoomActionResponse>(`${room(id)}/bans/${playerId}`),
    removeRights: (playerId: number) => remove<RoomActionResponse>(`${room(id)}/rights/${playerId}`),
    removeAllRights: () => remove<RoomActionResponse>(`${room(id)}/rights`),
    kickAll: () => post<RoomActionResponse>(`${room(id)}/kick-all`),
    setMuted: (muted: boolean) => put<RoomActionResponse>(`${room(id)}/muted`, { muted }),
    unload: () => post<RoomActionResponse>(`${room(id)}/unload`),
    alert: (message: string) => post<RoomActionResponse>(`${room(id)}/alert`, { message }),
});

/**
 * Runs a room action and refreshes the room after it, keeping the last answer to show: the
 * server's sentence, or why it refused.
 */
export const useRoomAction = (id: number) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (action: () => Promise<RoomActionResponse>) => action(),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ 'room', id ] });
            void queryClient.invalidateQueries({ queryKey: [ 'rooms' ] });
        },
    });
};
