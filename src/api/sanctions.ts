import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { type ListOrder, listQuery } from '#/lib/sort';

import { api } from './client';

/** A ban or a caution, as the sanctions log lists it. A name is null for a player who is gone. */
export interface SanctionLogEntry {
    id: number;
    issuedUtc: string;
    playerId: number;
    playerName: string | null;
    /** `Ban` or `Caution`. */
    kind: string;
    reason: string;
    /** Null when the console gave it. */
    issuerId: number | null;
    issuerName: string | null;
    /** Null when it has no end. */
    expiresUtc: string | null;
    revokedUtc: string | null;
    revokedById: number | null;
    revokedByName: string | null;
    /** It holds now: not lifted, and not run out. */
    isActive: boolean;
}

/** A page of the log in `order`, counted only so far, as the other logs are. */
export interface SanctionLogResponse {
    total: number;
    /** The server stopped counting at `total` (10,000): there are more. */
    totalCapped: boolean;
    page: number;
    pageSize: number;
    order: ListOrder;
    entries: SanctionLogEntry[];
}

export interface SanctionLogFilter {
    /** A name or an id. */
    player: string;
    /** `ban`, `caution`, or empty for both. */
    kind: string;
    /** `true` for those that hold now, `false` for those that no longer do, empty for all. */
    active: string;
}

/** How often the first page is asked again while open. */
const REFRESH_MS = 30_000;

export const useSanctionLog = (filter: SanctionLogFilter, page: number, order: ListOrder | null) => useQuery({
    queryKey: [ 'sanctions', filter, page, order ],
    queryFn: () => api<SanctionLogResponse>(`/sanctions?${listQuery(filter, page, order)}`),
    placeholderData: keepPreviousData,
    refetchInterval: page === 1 ? REFRESH_MS : false,
});
