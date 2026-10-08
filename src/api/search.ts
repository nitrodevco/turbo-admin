import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { api } from './client';

/** The kinds of hit the server's search finds, in the order it lists them. */
export type SearchKind = 'player' | 'room' | 'catalogPage' | 'furniture' | 'text' | 'product';

/** One hit: its kind's own id (a player's id, a text's key, a product's code), its name and a line on it. */
export interface SearchHit {
    id: string;
    title: string;
    subtitle: string | null;
}

/** The first few hits of one kind, and how many there are in all. */
export interface SearchGroup {
    kind: SearchKind;
    total: number;
    hits: SearchHit[];
}

/** Shorter terms are not searched: they find too much to be any use. */
export const MIN_SEARCH_LENGTH = 2;

/**
 * One term across players, rooms, catalog pages, furniture, texts and product data, each kind only
 * when the signed-in staff member may open its page. Keeps the last answer while the next loads.
 */
export const useSearch = (q: string) => useQuery({
    queryKey: [ 'search', q ],
    queryFn: () => api<{ groups: SearchGroup[] }>(`/search?${new URLSearchParams({ q })}`),
    enabled: q.length >= MIN_SEARCH_LENGTH,
    placeholderData: keepPreviousData,
});
