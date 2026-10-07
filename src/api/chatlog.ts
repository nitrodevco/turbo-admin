import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from './client';

export interface ChatlogEntry {
    id: number;
    atUtc: string;
    playerId: number;
    /** Null for a player who is gone. */
    playerName: string | null;
    roomId: number;
    roomName: string | null;
    /** Who a whisper was to; null for a line said to the room. */
    targetPlayerId: number | null;
    targetPlayerName: string | null;
    message: string;
}

/** A run of the log, newest first. Paged by line, not counted: there is no total. */
export interface ChatlogResponse {
    pageSize: number;
    hasOlder: boolean;
    hasNewer: boolean;
    entries: ChatlogEntry[];
}

export interface ChatlogFilter {
    /** A name or an id: what they said, and what was whispered to them. */
    player: string;
    /** A room id. */
    room: string;
    /** Words in the line. */
    text: string;
}

/** Where a run starts: lines older than `before`, newer than `after`, or the newest. */
export interface ChatlogCursor {
    before?: number;
    after?: number;
}

/** How often the newest lines are asked again while open: rooms write chat in batches. */
const REFRESH_MS = 30_000;

export const useChatlog = (filter: ChatlogFilter, cursor: ChatlogCursor) => {
    const query = new URLSearchParams();

    for (const [ key, value ] of Object.entries(filter))
        if (value)
            query.set(key, value);

    if (cursor.before)
        query.set('before', String(cursor.before));

    if (cursor.after)
        query.set('after', String(cursor.after));

    return useQuery({
        queryKey: [ 'chatlog', filter, cursor ],
        queryFn: () => api<ChatlogResponse>(`/chatlog?${query}`),
        placeholderData: keepPreviousData,
        // Only the newest lines change.
        refetchInterval: cursor.before || cursor.after ? false : REFRESH_MS,
    });
};

/** The lines around one line in its room. */
export const useChatlogContext = (id: number) => useQuery({
    queryKey: [ 'chatlog', 'context', id ],
    queryFn: () => api<ChatlogResponse>(`/chatlog/${id}/context`),
});
