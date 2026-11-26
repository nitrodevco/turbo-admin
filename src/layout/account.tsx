import { useQueryClient } from '@tanstack/react-query';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';

import { post } from '#/api/client';
import { useSession } from '#/auth/session';
import type { ThemeChoice } from '#/lib/theme';

/** The theme choices, in the order they are offered: the sidebar's foot and the phone's More sheet alike. */
export const THEMES: { value: ThemeChoice; label: string; icon: ReactNode }[] = [
    { value: 'dark', label: 'Dark', icon: <Moon /> },
    { value: 'light', label: 'Light', icon: <Sun /> },
    { value: 'system', label: 'System', icon: <Monitor /> },
];

/** Signing out: ends the session on the server, forgets what was loaded, and returns to sign-in. */
export const useSignOut = () => {
    const signOut = useSession(state => state.signOut);
    const queryClient = useQueryClient();

    return async () => {
        // Ending the session on the server matters more than its answer: sign out here either way.
        await post('/auth/logout').catch(() => undefined);
        queryClient.clear();
        signOut();
    };
};
