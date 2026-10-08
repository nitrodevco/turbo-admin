import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put, remove } from './client';

/** A trax song: what jukeboxes play off a song disc. `length` is in seconds. */
export interface SongItem {
    id: number;
    name: string;
    author: string;
    length: number;
    official: boolean;
    /** How many song discs carry it. */
    discs: number;
    /** The code the catalog can name an official song by, instead of its id. */
    code: string | null;
}

export interface SongDetail extends SongItem {
    /** The song in the client's trax format, as it is played. */
    track: string;
}

export interface SongInput {
    name: string;
    author: string;
    track: string;
    length: number;
    official: boolean;
    code: string | null;
}

export const useSongs = () => useQuery({
    queryKey: [ 'songs' ],
    queryFn: () => api<{ songs: SongItem[] }>('/songs'),
});

export const useSong = (id: number | null) => useQuery({
    queryKey: [ 'songs', id ],
    queryFn: () => api<SongDetail>(`/songs/${id}`),
    enabled: id !== null,
});

/** A change to the songs; the list is read again, and the catalog with it (its builders list songs). */
export const useSongEdit = <A extends unknown[], R>(call: (...args: A) => Promise<R>) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (args: A) => call(...args),
        onSettled: () => {
            void queryClient.invalidateQueries({ queryKey: [ 'songs' ] });
            void queryClient.invalidateQueries({ queryKey: [ 'catalog' ] });
        },
    });
};

export const songCalls = {
    create: (input: SongInput) => post<SongDetail>('/songs', input),
    update: (id: number, input: SongInput) => put<SongDetail>(`/songs/${id}`, input),
    delete: (id: number) => remove<void>(`/songs/${id}`),
};
