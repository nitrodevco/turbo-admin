import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, post } from './client';
import { liveInterval } from './live';
import type { RunCommandResponse } from './types';

export type PlayerSearchMode = 'name' | 'id';

export interface PlayerListItem {
    id: number;
    name: string;
    motto: string | null;
    isOnline: boolean;
    /** Null for a player who has never logged in. */
    lastLoginUtc: string | null;
    joinedUtc: string;
    roomsOwned: number;
}

export interface PlayerListResponse {
    total: number;
    page: number;
    pageSize: number;
    onlineNow: number;
    players: PlayerListItem[];
}

export interface PlayerRoomRef {
    id: number;
    name: string;
}

export interface PlayerSanctionItem {
    kind: string;
    reason: string;
    issuerName: string | null;
    issuedUtc: string;
    expiresUtc: string | null;
    revokedUtc: string | null;
    revokedByName: string | null;
    isActive: boolean;
}

export interface PlayerDetailResponse {
    id: number;
    name: string;
    motto: string | null;
    figure: string;
    gender: string;
    isOnline: boolean;
    /** The room an online player is in; null when offline or in none. */
    currentRoom: PlayerRoomRef | null;
    lastLoginUtc: string | null;
    joinedUtc: string;
    respectPoints: number;
    currencies: { typeId: number; name: string; amount: number }[];
    roomsOwned: number;
    recentRooms: PlayerRoomRef[];
    sanctions: PlayerSanctionItem[];
}

export const usePlayerSearch = (text: string, by: PlayerSearchMode, online: boolean, page: number) => useQuery({
    queryKey: [ 'players', by, text, online, page ],
    queryFn: () => api<PlayerListResponse>(`/players?${new URLSearchParams({ q: text, by, online: String(online), page: String(page) })}`),
    // The list keeps showing the last page while the next one loads.
    placeholderData: keepPreviousData,
});

/** One player; the live stream says when they come, go or move, and it is asked again besides. */
export const usePlayer = (id: number) => useQuery({
    queryKey: [ 'player', id ],
    queryFn: () => api<PlayerDetailResponse>(`/players/${id}`),
    refetchInterval: liveInterval(15_000),
});

/** What the signed-in staff member may do to players: one flag per command. */
export interface PlayerAbilities {
    ban: boolean;
    unban: boolean;
    silence: boolean;
    tradelock: boolean;
    disconnect: boolean;
    warn: boolean;
    alert: boolean;
    give: boolean;
}

export const usePlayerAbilities = () => useQuery({
    queryKey: [ 'player-abilities' ],
    queryFn: () => api<PlayerAbilities>('/players/abilities'),
    staleTime: 60_000,
});

export interface PlayerActionRequest {
    action: 'ban' | 'unban' | 'silence' | 'unsilence' | 'tradelock' | 'untradelock' | 'disconnect' | 'warn' | 'alert' | 'give';
    duration?: string;
    reason?: string;
    currency?: string;
    amount?: number;
}

/** Runs an action on a player: the hotel's own command, as you. Answers as the console does. */
export const actOnPlayer = (id: number, request: PlayerActionRequest) =>
    post<RunCommandResponse>(`/players/${id}/actions`, request);
