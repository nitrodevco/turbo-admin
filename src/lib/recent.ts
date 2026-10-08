import { useEffect } from 'react';
import { create } from 'zustand';

export interface RecentItem {
    kind: 'player' | 'room';
    id: number;
    name: string;
}

/** How many the search keeps. */
const KEEP = 6;

const STORAGE_KEY = 'turbo-admin-recent';

const load = (): RecentItem[] => {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');

        return Array.isArray(parsed) ? (parsed as RecentItem[]).slice(0, KEEP) : [];
    } catch {
        return [];
    }
};

/**
 * The players and rooms opened lately, newest first: what the search offers before anything is
 * typed. Kept in this browser alone; a private window or cleared storage starts it empty.
 */
export const useRecent = create<{ items: RecentItem[]; remember: (item: RecentItem) => void }>(set => ({
    items: load(),
    remember: item => set((state) => {
        const items = [ item, ...state.items.filter(x => x.kind !== item.kind || x.id !== item.id) ].slice(0, KEEP);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Storage blocked: kept for this visit only.
        }

        return { items };
    }),
}));

/** Remembers a player or room once its page has its name. */
export const useRememberRecent = (kind: RecentItem['kind'], id: number, name: string | undefined) => {
    const remember = useRecent(state => state.remember);

    useEffect(() => {
        if (name !== undefined)
            remember({ kind, id, name });
    }, [ kind, id, name, remember ]);
};
