import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, post, put } from './client';
import type { ChangeSet, VariableEntry } from './gamedata';

export interface HotelViewResponse {
    /** Every `landing.view.*` variable, by key, each value as JSON. */
    variables: VariableEntry[];
    canManage: boolean;
}

export interface HotelViewText {
    key: string;
    value: string;
}

/** Changes saved as one: variables to a JSON value or null to remove; texts to a value or null to remove. */
export interface HotelViewSave {
    variables: Record<string, string | null>;
    texts: Record<string, string | null>;
}

export const useHotelView = () => useQuery({
    queryKey: [ 'gamedata', 'hotel-view' ],
    queryFn: () => api<HotelViewResponse>('/gamedata/hotel-view'),
});

/** The hotel's texts of these keys; a key it has no text for is left out. */
export const useHotelViewTexts = (keys: string[]) => useQuery({
    queryKey: [ 'gamedata', 'hotel-view', 'texts', keys ],
    queryFn: () => post<{ texts: HotelViewText[] }>('/gamedata/hotel-view/texts', { keys }),
    placeholderData: keepPreviousData,
});

/** Saves the hotel view's variables and texts as one change set, which rolls back as one. */
export const useSaveHotelView = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (save: HotelViewSave) => put<{ changeSet: ChangeSet | null }>('/gamedata/hotel-view', save),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: [ 'gamedata' ] });
            // The panel's pictures are read from the variables too.
            void queryClient.invalidateQueries({ queryKey: [ 'client-assets' ] });
        },
    });
};
