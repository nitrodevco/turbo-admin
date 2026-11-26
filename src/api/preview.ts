import { useMutation, useQueryClient } from '@tanstack/react-query';

import { put, remove } from './client';
import type { PermissionPreview } from './types';

/**
 * Viewing the panel and the hotel as a group does: for up to an hour the signed-in staff member
 * sees, and may do, only what a plain member of the group may. Everything the panel has loaded was
 * loaded as someone else, so starting or stopping asks for all of it again.
 */
export const useStartPreview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (group: string) => put<PermissionPreview>('/me/preview', { group }),
        onSuccess: () => queryClient.invalidateQueries(),
    });
};

/** Back to their own permissions. Allowed whatever the group may do, so the banner always works. */
export const useEndPreview = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: () => remove<void>('/me/preview'),
        onSuccess: () => queryClient.invalidateQueries(),
    });
};
