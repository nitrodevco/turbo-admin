import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api, post, remove } from './client';
import { liveInterval } from './live';
import type { RunCommandResponse } from './types';

export type PlayerSearchMode = 'name' | 'id' | 'discord';

export interface PlayerListItem {
    id: number;
    name: string;
    motto: string | null;
    isOnline: boolean;
    /** Null for a player who has never logged in. */
    lastLoginUtc: string | null;
    joinedUtc: string;
    roomsOwned: number;
    /** Their Discord username, when they sign in to the public site with Discord. */
    discordUsername: string | null;
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

export interface PlayerDiscordInfo {
    id: string;
    username: string;
    linkedAtUtc: string;
    /** Their sign-ins to the public site that have not ended. */
    activeSignIns: number;
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
    /** The Discord account they sign in to the public site with; null when none. */
    discord: PlayerDiscordInfo | null;
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
    /** Holds `admin.players.create`. */
    createPlayers: boolean;
    /** Holds `admin.tickets.issue`; a ticket still needs the player to be one they can do everything of. */
    issueTickets: boolean;
    /** Holds `admin.accounts.manage`: unlink Discord and end public site sign-ins, for players they outrank. */
    manageAccounts: boolean;
}

export interface NewPlayerRequest {
    name: string;
    motto: string;
    gender: 'male' | 'female';
    /** Empty for the gender's default. */
    figure: string;
}

export const createPlayer = (request: NewPlayerRequest) => post<{ id: number; name: string }>('/players', request);

export interface TicketStatus {
    hasTicket: boolean;
    expiresAtUtc: string | null;
    reusable: boolean;
    expired: boolean;
}

export interface IssuedTicket {
    ticket: string;
    expiresAtUtc: string | null;
    reusable: boolean;
    /** The client's login address with the ticket, when the hotel's is set. */
    loginUrl: string | null;
}

export const useTicketStatus = (id: number, enabled: boolean) => useQuery({
    queryKey: [ 'player', id, 'ticket' ],
    queryFn: () => api<TicketStatus>(`/players/${id}/ticket`),
    enabled,
});

export const issueTicket = (id: number, lifetimeMinutes: number | null, reusable: boolean) =>
    post<IssuedTicket>(`/players/${id}/ticket`, { lifetimeMinutes, reusable });

export const revokeTicket = (id: number) => remove<void>(`/players/${id}/ticket`);

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

export const unlinkDiscord = (id: number) => remove<void>(`/players/${id}/discord`);

export const endSiteSessions = (id: number) => remove<void>(`/players/${id}/site-sessions`);
